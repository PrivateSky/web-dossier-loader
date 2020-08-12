import "./../loader-config.js";
import { Spinner, prepareView } from "./services/UIService.js";
import WalletService from "./services/WalletService.js";
import SWAgent from "./services/SWAgent.js";

function RestoreController() {

    let seed;
    let pin;
    let wizard;
    let spinner;
    const walletService = new WalletService({
        edfsEndpoint: APP_CONFIG.EDFS_ENDPOINT
    });

    function displayContainer(containerId) {
        document.getElementById(containerId).style.display = "block";
    }

    this.init = function() {

        SWAgent.hasServiceWorkers((hasServiceWorker) => {
            if (hasServiceWorker) {
                SWAgent.unregisterSW(() => {
                    window.location.reload();
                });
            } else {
                spinner = new Spinner(document.getElementsByTagName("body")[0]);
                walletService.hasSeedCage((err, result) => {
                    wizard = new Stepper(document.getElementById("psk-wizard"));
                });
            }
        });
    };

    this.validateSeed = function(event) {
        let seed = event.target.value;
        let btn = document.getElementById("restore-seed-btn");
        if (seed.length > 0) {
            document.getElementById("seed-error").innerText = "";
            btn.removeAttribute("disabled");
        } else {
            btn.setAttribute("disabled", "disabled");
        }
    };

    this.validatePIN = function(event) {
        pin = document.getElementById("pin").value;
        let pinConfirm = document.getElementById("confirm-pin").value;
        let btn = document.getElementById("set-pin-btn");

        if (pin === pinConfirm && pin.length >= APP_CONFIG.PIN_MIN_LENGTH) {
            btn.removeAttribute("disabled");
        } else {
            btn.setAttribute("disabled", "disabled");
        }
    };


    this.restore = function(event) {
        event.preventDefault();
        seed = document.getElementById("seed").value;
        try {
            walletService.restoreFromSeed(seed, (err) => {
                if (err) {
                    throw err;
                }

                wizard.next();

            });
        } catch (e) {
            console.log(e);
            document.getElementById("seed-error").innerText = "Seed is not valid."
        }
    };

    this.previous = function(event) {
        event.preventDefault();
        document.getElementById("seed").value = "";
        document.getElementById("restore-seed-btn").setAttribute("disabled", "disabled");
        wizard.previous();
    };

    this.setPin = function(event) {
        event.preventDefault();
        spinner.attachToView();
        walletService.changePin(seed, pin, (err, wallet) => {
            spinner.removeFromView();
            if (err) {
                return document.getElementById("pin-error").innerText = "Operation failed. Try again"
            }
            wizard.next();
        })
    };

    this.openWallet = function(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.location.replace("./");
    }
}

let controller = new RestoreController();
document.addEventListener("DOMContentLoaded", function() {
    let LABELS = APP_CONFIG.LABELS_DICTIONARY;
    const page_labels = [
        { "title": LABELS.APP_NAME, },
        { "#step-seed": LABELS.SEED },
        { "#step-pin": LABELS.PIN },
        { "#step-complete": LABELS.COMPLETE },
        { "#seed-label": LABELS.SEED },
        {
            "#seed": LABELS.ENTER_WALLET_SEED,
            "attribute": "placeholder"
        },

        {
            "#pin": LABELS.ENTER_PIN,
            "attribute": "placeholder"
        },
        {
            "#confirm-pin": LABELS.CONFIRM_PIN,
            "attribute": "placeholder"
        },
        { "#pin-help": LABELS.EASY_TO_REMEMBER_PIN },
        { "#pin-confirm-help": LABELS.CONFIRM_PIN_IDENTICAL },
        { "#set-pin-btn": LABELS.SET_PIN },
        { "#restore-seed-btn": LABELS.RESTORE },
        { "#wallet-restored-success": LABELS.WALLET_RESTORED_SUCCESSFULLY },
        { "#change-wallet": LABELS.CHANGE_WALLET },

        { "#open-wallet-btn": LABELS.OPEN_WALLET }
    ];
    prepareView(page_labels);
    controller.init();

});
window.controller = controller;