import "./../loader-config.js";
import { Spinner, prepareView } from "./services/UIService.js";
import WalletService from "./services/WalletService.js";
import FileService from "./services/FileService.js";
import SSAppRunner from "./services/SSAppRunner.js";
import SWAgent from "./services/SWAgent.js";

function MainController() {

    const WALLET_LAST_UPDATE_TIMESTAMP_KEY = '__waletLastUpdated';
    const DEFAULT_PIN = '12345';

    const walletService = new WalletService({
        edfsEndpoint: APP_CONFIG.EDFS_ENDPOINT
    });
    const fileService = new FileService();

    let pin;
    let spinner;

    const self = this;

    /**
     * Return path to file relative to the `loader` folder
     *
     * @param {string} file
     * @return {string}
     */
    function getUrl(file) {
        let pathSegments = window.location.pathname.split('/');
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
        const localConfigurationPath = getUrl('loader-config.local.json');

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
        })
    }

    /**
     * Fetch the 'last-update.txt' file and compare the timestamp
     * with the one stored in local storage.
     *
     * @param {callback} callback
     */
    function checkForWalletUpdates(callback) {
        const lastUpdateFilename = getUrl('../last-update.txt');

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
        })
    }

    /**
     * Run the loader in development mode
     *
     * Create a default wallet with a default pin if none exists
     * and load it
     */
    function runInDevelopment() {
        walletService.hasSeedCage((result) => {
            pin = APP_CONFIG.DEVELOPMENT_PIN || DEFAULT_PIN;

            if (!result) {
                // Create a new wallet
                spinner.attachToView();
                walletService.setEDFSEndpoint(APP_CONFIG.EDFS_ENDPOINT);
                walletService.create(pin, (err, wallet) => {
                    if (err) {
                        return console.error(err);
                    }
                    localStorage.setItem(WALLET_LAST_UPDATE_TIMESTAMP_KEY, Date.now());
                    window.location.reload();
                });
                return;
            }

            // Load an existing wallet
            checkForWalletUpdates((hasUpdates) => {
                if (hasUpdates) {
                    // Unregister the service workers to allow wallet rebuilding
                    // and clear the cache
                    navigator.serviceWorker.getRegistrations().then((registrations) => {
                        if (!registrations || !registrations.length) {
                            return;
                        }

                        const unregisterPromises = registrations.map(reg => reg.unregister());
                        return Promise.all(unregisterPromises);
                    }).then((result) => {
                        if (result) {
                            // Reload the page after unregistering the service workers
                            return window.location.reload();
                        }

                        spinner.attachToView();

                        // After all the service works have been unregistered and stopped
                        // rebuild the wallet
                        walletService.rebuild(pin, (err, wallet) => {
                            if (err) {
                                return console.error(err);
                            }

                            localStorage.setItem(WALLET_LAST_UPDATE_TIMESTAMP_KEY, Date.now());
                            console.log('Wallet was rebuilt.');
                            window.location.reload();
                        })
                    })
                    return;
                }

                // restore existing wallet
                self.openWallet();
            });
        })
    }

    this.init = function() {

        spinner = new Spinner(document.getElementsByTagName("body")[0]);

        loadLocalConfiguration(() => {
            if (APP_CONFIG.MODE === 'development') {
                return runInDevelopment();
            }

            this.initView();
        });
    }

    this.initView = function() {
        walletService.hasSeedCage((result) => {
            if (!result) {
                return this.displayContainer(APP_CONFIG.NEW_OR_RESTORE_CONTAINER_ID);
            }
            this.displayContainer(APP_CONFIG.PIN_CONTAINER_ID);
        });
    };

    this.displayContainer = function(containerId) {
        document.getElementById(containerId).style.display = "block";
    };

    this.validatePIN = function() {
        pin = document.getElementById("pin").value;
        let btn = document.getElementById("open-wallet-btn");

        if (pin.length >= APP_CONFIG.PIN_MIN_LENGTH) {
            btn.removeAttribute("disabled");
        } else {
            btn.setAttribute("disabled", "disabled");
        }
    };

    this.restore = function(event) {
        event.preventDefault();
        SWAgent.unregisterSW(() => {
            window.location = "./restore"
        });

    };

    this.openWallet = function(event) {
        if (event) {
            event.preventDefault();
        }
        spinner.attachToView();

        walletService.load(pin, (err, wallet) => {
            if (err) {
                spinner.removeFromView();
                return document.getElementById("pin-error").innerText = "Invalid PIN";
            }

            wallet.getKeySSI((err, keySSI) => {
                if (err) {
                    console.error(err);
                    return console.error("Operation failed. Try again");
                }

                console.log(`Loading wallet ${keySSI}`);

                new SSAppRunner({
                    seed: keySSI
                }).run();
            });
        })
    };
}

const controller = new MainController();


document.addEventListener("DOMContentLoaded", function() {
    let LABELS = APP_CONFIG.LABELS_DICTIONARY;
    const page_labels = [
        { "title": LABELS.APP_NAME, },
        { "#loader-title": LABELS.APP_NAME },
        { "#loader-caption": LABELS.APP_DESCRIPTION },
        { "#new-dossier": LABELS.NEW_DOSSIER },
        { "#restore-dossier": LABELS.RESTORE_DOSSIER },
        { "#wallet-authorization": LABELS.WALLET_AUTHORIZATION },
        { "#enter-pin": LABELS.ENTER_PIN },
        { "#pin": LABELS.ENTER_PIN, attribute: "placeholder" },
        { "#open-wallet-btn": LABELS.OPEN_WALLET },
        { "#lost-pin": LABELS.LOST_PIN },
    ];
    prepareView(page_labels);
    controller.init();

});
window.controller = controller;