import {Spinner, prepareView} from "./services/UIService.js";
import WalletService from "./services/WalletService.js";

function RestoreController() {

    let seed;
    let pin;
    let wizard;
    let spinner;
    const walletService = new WalletService();

    function displayContainer(containerId) {
        document.getElementById(containerId).style.display = "block";
    }

    this.init = function () {
        spinner = new Spinner(document.getElementsByTagName("body")[0]);
        walletService.hasSeedCage((err, result) => {
            wizard = new Stepper(document.getElementById("psk-wizard"));
        });
    };

    this.validateSeed =function(event) {
        let seed = event.target.value;
        let btn = document.getElementById("restoreSeedBtn");
        if(seed.length>0){
            document.getElementById("seedError").innerText = "";
            btn.removeAttribute("disabled");
        }
        else{
            btn.setAttribute("disabled","disabled");
        }
    };

    this.validatePIN = function (event) {
        pin = document.getElementById("pin").value;
        let pinConfirm = document.getElementById("confirmPin").value;
        let btn = document.getElementById("setPINBtn");

        if (pin === pinConfirm && pin.length >= APP_CONFIG.PIN_MIN_LENGTH) {
            btn.removeAttribute("disabled");
        } else {
            btn.setAttribute("disabled", "disabled");
        }
    };


    this.restore = function (event) {
        event.preventDefault();
        seed = document.getElementById("seed").value;
        try {
            walletService.restoreFromSeed(seed, (err) => {
                if (err) {
                    throw err;
                }

                wizard.next();

            });
        }
        catch (e) {
           console.log(e);
           document.getElementById("seedError").innerText="Seed is not valid."
        }
    };

    this.previous = function (event) {
        event.preventDefault();
        document.getElementById("seed").value = "";
        document.getElementById("restoreSeedBtn").setAttribute("disabled","disabled");
        wizard.previous();
    };

    this.setPin = function (event) {
        event.preventDefault();
        walletService.changePin(seed, pin, (err, wallet) => {
            if (err) {
                return document.getElementById("pinError").innerText = "Operation failed. Try again"
            }
            wizard.next();
        })
    };

    this.openWallet = function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.location.replace("./");
    }
}

let controller = new RestoreController();
document.addEventListener("DOMContentLoaded", function () {
	let LABELS = APP_CONFIG.LABELS_DICTIONARY;
	const page_labels = [
		{"title": LABELS.APP_NAME,},
		{"#step-seed": LABELS.SEED},
		{"#step-pin": LABELS.PIN},
		{"#step-complete": LABELS.COMPLETE},
		{"#seed-label": LABELS.SEED},
		{
			"#seed": LABELS.ENTER_WALLET_SEED,
			"attribute": "placeholder"
		},

		{
			"#pin": LABELS.ENTER_PIN,
			"attribute": "placeholder"
		},
		{
			"#confirmPin": LABELS.CONFIRM_PIN,
			"attribute": "placeholder"
		},
		{"#pinHelp": LABELS.EASY_TO_REMEMBER_PIN},
		{"#pinConfirmHelp": LABELS.CONFIRM_PIN_IDENTICAL},
		{"#setPINBtn": LABELS.SET_PIN},
		{"#restoreSeedBtn":LABELS.RESTORE},

		{"#open-wallet-btn": LABELS.OPEN_WALLET}
	];
	prepareView(page_labels);
	controller.init();

});
window.controller = controller;

