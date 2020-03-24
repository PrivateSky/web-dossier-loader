import SpinnerService from "./services/SpinnerService.js";
import SWAgent from "./services/SWAgent.js";

function MainController() {

    let pin;
    let EDFS;
    let edfs;
    let spinner;


    function displayContainer(containerId) {
        document.getElementById(containerId).style.display = "block";
    }

    this.initView = function () {
        document.getElementsByTagName("title")[0].text = APP_CONFIG.appName;
        spinner = new SpinnerService(document.getElementsByTagName("body")[0]);

        EDFS = require("edfs");
        EDFS.checkForSeedCage((err) => {
            if (err) {
                return displayContainer(APP_CONFIG.NEW_OR_RESTORE_CONTAINER_ID);
            }
            displayContainer(APP_CONFIG.PIN_CONTAINER_ID);

        });
    };

    this.validatePIN = function () {
        pin = document.getElementById("pin").value;
        let btn = document.getElementById("open-wallet-btn");

        if (pin.length >= APP_CONFIG.PIN_MIN_LENGTH) {
            btn.removeAttribute("disabled");
        } else {
            btn.setAttribute("disabled", "disabled");
        }
    };

    this.restore = function (event) {
        event.preventDefault();
        window.location = "/restore"
    };

    this.openWallet = function () {
        event.preventDefault();
        spinner.attachToView();

        function loadWalletHandler(err) {
            spinner.removeFromView();
            if (err) {
                return document.getElementById("pin-error").innerText = err;
            }
            window.location = "/";
        }

        if (edfs) {
            return SWAgent.loadWallet(edfs, pin, loadWalletHandler);
        }

        EDFS.attachWithPin(pin, function (err, _edfs) {
            if (err) {
                spinner.removeFromView();
                return document.getElementById("pin-error").innerText = "Invalid PIN";
            }
            edfs = _edfs;
            SWAgent.loadWallet(edfs, pin, loadWalletHandler);
        });
    }
}

let controller = new MainController();
document.addEventListener("DOMContentLoaded", function () {
    controller.initView();
});
window.controller = controller;



