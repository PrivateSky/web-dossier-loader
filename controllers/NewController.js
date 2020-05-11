import {Spinner, prepareView} from "./services/UIService.js";
import WalletService from "./services/WalletService.js";

function NewController() {

	let pin;
	let wizard;
	let spinner;
	const walletService = new WalletService({
		edfsEndpoint: APP_CONFIG.EDFS_ENDPOINT
	});

	function displayContainer(containerId) {
		document.getElementById(containerId).style.display = "block";
	}

	this.init = function () {
		spinner = new Spinner(document.getElementsByTagName("body")[0]);

		walletService.hasSeedCage((err, result) => {
			wizard = new Stepper(document.getElementById("psk-wizard"));
		});
	};

	this.validateSeed = function (event) {
		let seed = event.target.value;
		let btn = document.getElementById("restoreSeedBtn");
		if (seed.length > 0) {
			document.getElementById("seedError").innerText = "";
			btn.removeAttribute("disabled");
		}
		else {
			btn.setAttribute("disabled", "disabled");
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

	this.createWallet = function (event) {
		event.preventDefault();
		spinner.attachToView();
		try {
			console.log('Creating wallet...');
			walletService.create(pin, (err, wallet) => {
				if (err) {
					document.getElementById("pinError").innerText = "An error occurred. Please try again."
					return console.error(err);
				}
				const seed = wallet.getSeed();
				console.log(`Wallet created. Seed: ${seed}`);
				document.getElementById("seed").value = seed;
				spinner.removeFromView();
				wizard.next();
			});
		}
		catch (e) {
			document.getElementById("pinError").innerText = "Seed is not valid."
		}
	};

	this.previous = function (event) {
		event.preventDefault();
		document.getElementById("seed").value = "";
		document.getElementById("restoreSeedBtn").setAttribute("disabled", "disabled");
		wizard.previous();
	};

	this.openWallet = function (event) {
		event.preventDefault();
		event.stopImmediatePropagation();
		window.location.replace("./");
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
			"#confirmPin": LABELS.CONFIRM_PIN,
			"attribute": "placeholder"
		},
		{"#pinHelp": LABELS.EASY_TO_REMEMBER_PIN},
		{"#pinConfirmHelp": LABELS.CONFIRM_PIN_IDENTICAL},
		{"#setPINBtn": LABELS.SET_PIN},

		{"#seed_keep_secret": LABELS.SEED_KEEP_SECRET},
		{"#seed_print": LABELS.SEED_PRINT},
		{"#open-wallet-btn": LABELS.OPEN_WALLET}
	];
	prepareView(page_labels);
	controller.init();

});
window.controller = controller;




