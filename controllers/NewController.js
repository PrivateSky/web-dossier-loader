import "./../loader-config.js";
import {Spinner, prepareView} from "./services/UIService.js";
import WalletService from "./services/WalletService.js";
import SWAgent from "./services/SWAgent.js";

function NewController() {

	let pin;
	let wizard;
	let spinner;
	const walletService = new WalletService({
		edfsEndpoint: APP_CONFIG.EDFS_ENDPOINT
	});

	 this.hasInstallationUrl = function (){
		let windowUrl = new URL(window.location.href);
		return windowUrl.searchParams.get("appName") !== null;
	};

	this.init = function () {

		SWAgent.hasServiceWorkers((hasServiceWorker) => {
			if (hasServiceWorker) {
				SWAgent.unregisterSW(() => {
					window.location.reload();
				});
			}else{
				spinner = new Spinner(document.getElementsByTagName("body")[0]);
				walletService.hasSeedCage((err, result) => {
					wizard = new Stepper(document.getElementById("psk-wizard"));
				});
			}
		});

	};

	this.pinsAreValid = function(){
		pin = document.getElementById("pin").value;
		let pinConfirm = document.getElementById("confirm-pin").value;
		return (pin === pinConfirm && pin.length >= APP_CONFIG.PIN_MIN_LENGTH);
	}

	this.validatePIN = function () {
		let btn = document.getElementById("set-pin-btn");
		if (this.pinsAreValid()) {
			btn.removeAttribute("disabled");
			return true;
		} else {
			btn.setAttribute("disabled", "disabled");
		}
		return false;
	};

	function createWallet() {
		spinner.attachToView();
		try {
			console.log('Creating wallet...');
			walletService.create(pin, (err, wallet) => {
				if (err) {
					document.getElementById("pin-error").innerText = "An error occurred. Please try again."
					return console.error(err);
				}

				wallet.getKeySSI((err, keySSI) => {
					console.log(`Wallet created. Seed: ${keySSI}`);
					document.getElementById("seed").value = keySSI;
					spinner.removeFromView();
					wizard.next();
				});
			});
		}
		catch (e) {
			document.getElementById("pin-error").innerText = "Seed is not valid."
		}
	}

	this.previous = function (event) {
		event.preventDefault();
		document.getElementById("seed").value = "";
		document.getElementById("restore-seed-btn").setAttribute("disabled", "disabled");
		wizard.previous();
	};

	this.submitPin = function (event) {
		event.preventDefault();
		event.stopImmediatePropagation();
		if(this.pinsAreValid()){
			createWallet();
		}
	}
	this.goToLandingPage = function(){
		window.location.replace('./');
	}
}

let controller = new NewController();

document.addEventListener("DOMContentLoaded", function () {
	let LABELS = APP_CONFIG.LABELS_DICTIONARY;
	const page_labels = [
		{"title": LABELS.APP_NAME,},
		{"#step-pin": LABELS.PIN},
		{"#step-complete": LABELS.COMPLETE},
		{"#set-up-pin": LABELS.SET_UP_PIN},
		{
			"#pin": LABELS.ENTER_PIN,
			"attribute": "placeholder"
		},
		{
			"#confirm-pin": LABELS.CONFIRM_PIN,
			"attribute": "placeholder"
		},
		{"#pin-help": LABELS.EASY_TO_REMEMBER_PIN},
		{"#pin-confirm-help": LABELS.CONFIRM_PIN_IDENTICAL},
		{"#set-pin-btn": LABELS.SET_PIN},

		{"#seed_keep_secret": LABELS.SEED_KEEP_SECRET},
		{"#seed_print": LABELS.SEED_PRINT},
		{"#open-wallet-btn": LABELS.OPEN_WALLET}
	];
	if (controller.hasInstallationUrl()) {
		page_labels.push({"#more-information": APP_CONFIG.NEW_DOSSIER_MORE_INFORMATION})
	}
	else{
		document.querySelector("#more-information").remove();
	}
	prepareView(page_labels);
	controller.init();

});
window.controller = controller;




