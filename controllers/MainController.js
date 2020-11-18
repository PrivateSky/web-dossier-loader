import "./../loader-config.js";
import { Spinner, prepareView } from "./services/UIService.js";
import WalletService from "./services/WalletService.js";
import FileService from "./services/FileService.js";
import SSAppRunner from "./services/SSAppRunner.js";
import SWAgent from "./services/SWAgent.js";

function MainController() {
  const WALLET_LAST_UPDATE_TIMESTAMP_KEY = "__waletLastUpdated";
  const DEVELOPMENT_EMAIL = "test@test.com";
  const DEVELOPMENT_USERNAME = "test.username";
  const DEFAULT_PASSWORD = "testPassword123";

  const walletService = new WalletService();
  const fileService = new FileService();

  let password;
  let username;
  let email;
  let spinner;

  const self = this;

  /**
   * Return path to file relative to the `loader` folder
   *
   * @param {string} file
   * @return {string}
   */
  function getUrl(file) {
    let pathSegments = window.location.pathname.split("/");
    let loaderPath = pathSegments.pop();
    if (!loaderPath) {
      loaderPath = pathSegments.pop();
    }

    return `${loaderPath}/${file}`;
  }

  /**
   * Try and fetch 'loader-config.local.json' and overwrite
   * the standard configuration
   *
   * @param {callback} callback
   */
  function loadLocalConfiguration(callback) {
    const localConfigurationPath = getUrl("loader-config.local.json");

    fileService.getFile(localConfigurationPath, (err, data) => {
      if (err) {
        return callback();
      }

      let configuration;

      try {
        configuration = JSON.parse(data);
      } catch (e) {
        return callback();
      }

      APP_CONFIG = Object.assign(APP_CONFIG, configuration);
      callback();
    });
  }

  /**
   * Fetch the 'last-update.txt' file and compare the timestamp
   * with the one stored in local storage.
   *
   * @param {callback} callback
   */
  function checkForWalletUpdates(callback) {
    const lastUpdateFilename = getUrl("../last-update.txt");

    fileService.getFile(lastUpdateFilename, (err, data) => {
      if (err) {
        return callback(false);
      }

      const lastUpdateTimestamp = parseInt(data, 10);
      if (isNaN(lastUpdateTimestamp)) {
        return callback(false);
      }

      const walletLastUpdateTimestamp = parseInt(localStorage.getItem(WALLET_LAST_UPDATE_TIMESTAMP_KEY), 10);
      if (isNaN(walletLastUpdateTimestamp)) {
        return callback(true);
      }

      if (lastUpdateTimestamp > walletLastUpdateTimestamp) {
        return callback(true);
      }

      return callback(false);
    });
  }

  let DEVELOPMENT_CREDENTIALS_KEY = "developmentCredentials";

  function hash(key) {
    return btoa(encodeURI(key.join("/")));
  }

  function getKnownCredentials() {
    let knownCredentials = localStorage.getItem(DEVELOPMENT_CREDENTIALS_KEY);
    if (!knownCredentials) {
      knownCredentials = "{}";
    }
    return JSON.parse(knownCredentials);
  }

  function checkWalletExistence(key) {
    let knownCredentials = getKnownCredentials();
    return !!knownCredentials[hash(key)];
  }

  function markWalletExistence(key) {
    let knownCredentials = getKnownCredentials();
    knownCredentials[hash(key)] = true;
    return localStorage.setItem(DEVELOPMENT_CREDENTIALS_KEY, JSON.stringify(knownCredentials));
  }

  /**
   * Run the loader in development mode
   *
   * Create a default wallet with a default password if none exists
   * and load it
   */
  function runInDevelopment() {
    email = APP_CONFIG.DEVELOPMENT_EMAIL || DEVELOPMENT_EMAIL;
    username = APP_CONFIG.DEVELOPMENT_USERNAME || DEVELOPMENT_USERNAME;
    password = APP_CONFIG.DEVELOPMENT_PASSWORD || DEFAULT_PASSWORD;
    let key = [username, email, password]
    if (!checkWalletExistence(key)) {
      spinner.attachToView();
      walletService.create(key, (err, wallet) => {
        if (err) {
          return console.error(err);
        }
        localStorage.setItem(WALLET_LAST_UPDATE_TIMESTAMP_KEY, Date.now());
        markWalletExistence(key);
        window.location.reload();
      });
      return;
    }

    checkForWalletUpdates((hasUpdates) => {
      if (hasUpdates) {
        // Unregister the service workers to allow wallet rebuilding
        // and clear the cache
        navigator.serviceWorker
            .getRegistrations()
            .then((registrations) => {
              if (!registrations || !registrations.length) {
                return;
              }

              const unregisterPromises = registrations.map((reg) => reg.unregister());
              return Promise.all(unregisterPromises);
            })
            .then((result) => {
              if (result) {
                // Reload the page after unregistering the service workers
                return window.location.reload();
              }

              spinner.attachToView();

              // After all the service works have been unregistered and stopped
              // rebuild the wallet
              walletService.rebuild(key, (err, wallet) => {
                if (err) {
                  return console.error(err);
                }

                localStorage.setItem(WALLET_LAST_UPDATE_TIMESTAMP_KEY, Date.now());
                console.log("Wallet was rebuilt.");
                window.location.reload();
              });
            });
        return;
      }

      // restore existing wallet
      self.openWallet();
    });

  }

  this.init = function () {
    spinner = new Spinner(document.getElementsByTagName("body")[0]);

    loadLocalConfiguration(() => {
      if (APP_CONFIG.MODE === "development") {
        return runInDevelopment();
      }

      let windowUrl = new URL(window.location.href);
      if(windowUrl.searchParams.get("login") !== null) {
          return this.displayContainer(APP_CONFIG.PASSWORD_CONTAINER_ID);
      }
      this.displayContainer(APP_CONFIG.NEW_OR_RESTORE_CONTAINER_ID)
    });
  };

  this.displayContainer = function (containerId) {
    document.getElementById(containerId).style.display = "block";
  };

  this.credentialsAreValid = function () {
    username = document.getElementById("username").value;
    email = document.getElementById("email").value;
    return email.length > 4
        && APP_CONFIG.EMAIL_REGEX.test(email)
        && username.length >= APP_CONFIG.USERNAME_MIN_LENGTH
        && APP_CONFIG.USERNAME_REGEX.test(username);
  };

  this.validateCredentials = function () {
    password = document.getElementById("password").value;
    let btn = document.getElementById("open-wallet-btn");

    if (password.length >= APP_CONFIG.PASSWORD_MIN_LENGTH && this.credentialsAreValid()) {
      btn.removeAttribute("disabled");
    } else {
      btn.setAttribute("disabled", "disabled");
    }
  };

  this.openWallet = function (event) {
    if (event) {
      event.preventDefault();
    }
    spinner.attachToView();

    walletService.load([username, email, password], (err, wallet) => {
      if (err) {
        spinner.removeFromView();
        return (document.getElementById("register-details-error").innerText = "Invalid password");
      }

      wallet.getKeySSI((err, keySSI) => {
        if (err) {
          console.error(err);
          return console.error("Operation failed. Try again");
        }

        console.log(`Loading wallet ${keySSI}`);

        new SSAppRunner({
          seed: keySSI,
        }).run();
      });
    });
  };
}

const controller = new MainController();

document.addEventListener("DOMContentLoaded", function () {
  let LABELS = APP_CONFIG.LABELS_DICTIONARY;
  const page_labels = [
    { title: LABELS.APP_NAME },
    { "#loader-title": LABELS.APP_NAME },
    { "#loader-caption": LABELS.APP_DESCRIPTION },
    { "#new-wallet": LABELS.NEW_WALLET },
    { "#access-wallet": LABELS.ACCESS_WALLET },
    { "#wallet-authorization": LABELS.WALLET_AUTHORIZATION },
    { "#enter-credentials": LABELS.ENTER_CREDENTIALS },
    { "#username": LABELS.ENTER_USERNAME, attribute: "placeholder" },
    { "#email": LABELS.ENTER_EMAIL, attribute: "placeholder" },
    { "#password": LABELS.ENTER_PASSWORD, attribute: "placeholder" },
    { "#open-wallet-btn": LABELS.OPEN_WALLET },
  ];
  prepareView(page_labels);
  controller.init();
});
window.controller = controller;
