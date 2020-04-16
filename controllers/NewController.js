import SpinnerService from "./services/SpinnerService.js";
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

    this.initView = function () {
        document.getElementsByTagName("title")[0].text = APP_CONFIG.appName;
        spinner = new SpinnerService(document.getElementsByTagName("body")[0]);

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

    this.setPin = function (event) {
        event.preventDefault();
    };

    this.openWallet = function (event) {
        event.stopImmediatePropagation();
        window.location.replace("./");
    }
}


let controller = new NewController();
document.addEventListener("DOMContentLoaded", function () {
    controller.initView();
});
window.controller = controller;




