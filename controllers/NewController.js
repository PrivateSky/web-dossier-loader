import SpinnerService from "./services/SpinnerService.js";
function NewController() {

    let EDFS;
    let seed;
    let pin;
    let walletType;
    let wizard;
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
                //inform user that he is possible to delete his old pskwallet instance
            }
            //display stepper


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

    this.selectWalletType = function(event){
        walletType = {
            endpoint:APP_CONFIG.EDFS_ENDPOINT,
            templateSeed:APP_CONFIG.TEMPLATE_SEED
        };
        wizard.next();
    };

    this.createWallet = function (event) {
        spinner.attachToView();
        event.stopImmediatePropagation();
        try {
            EDFS = EDFS.attachToEndpoint(walletType.endpoint);
            EDFS.createWallet(walletType.templateSeed, pin, true, function (err, _seed) {
                spinner.removeFromView();
                if(!err){
                    seed = _seed;
                    console.log(_seed);
                    wizard.next();
                }
                else{
                    document.getElementById("pinError").innerText="An error occurred. Please try again."
                }
            });
        }
        catch (e) {
            document.getElementById("pinError").innerText="Seed is not valid."
        }
    };

    this.previous = function (event) {
        event.stopImmediatePropagation();
        document.getElementById("seed").value = "";
        document.getElementById("restoreSeedBtn").setAttribute("disabled","disabled");
        wizard.previous();
    };

    this.setPin = function (event) {
        event.stopImmediatePropagation();
        EDFS.storeWalletSeed(seed, pin, function (err) {
            if(err){
                return document.getElementById("pinError").innerText="Operation failed. Try again"
            }
            wizard.next();
        });
    };

    this.openWallet = function (event) {
        event.stopImmediatePropagation();

        //TODO:load sw and send seed -> boot wallet app
        //redirect page to /

        return false;
    }
}


let controller = new NewController();
document.addEventListener("DOMContentLoaded", function () {
    controller.initView();
});
window.controller = controller;




