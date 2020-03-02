import SWAgent from "./services/SWAgent.js";
function RestoreController() {

    let EDFS;
    let seed;
    let pin;
    let wizard;

    function displayContainer(containerId) {
        document.getElementById(containerId).style.display = "block";
    }

    this.initView = function () {
        document.getElementsByTagName("title")[0].text = APP_CONFIG.appName;

        EDFS = require("edfs");
        EDFS.checkForSeedCage((err) => {
            if (err) {
                //inform user that he is possible to delete his old pskwallet instance
            }

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
            EDFS = EDFS.attachWithSeed(seed);
            wizard.next();
        }
        catch (e) {
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
        EDFS.loadWallet(seed, pin, true, function (err, wallet) {
            if (err) {
                return document.getElementById("pinError").innerText = "Operation failed. Try again"
            }

            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/swHostBoot.js', {scope: "/"}).then(function(reg) {
                    console.log('Yay, service worker is live!', reg);
                    window.wizard.next();

                }).catch(function(err) {
                    return document.getElementById("pinError").innerText = "Operation failed. Try again";
                });
            }
        });
    };

    this.openWallet = function (event) {
        event.preventDefault();
        SWAgent.restoreCSB(seed, window.location.origin, function () {
            window.location="/";
        });
    }
}

let controller = new RestoreController();
document.addEventListener("DOMContentLoaded", function () {
    controller.initView();
});
window.controller = controller;


