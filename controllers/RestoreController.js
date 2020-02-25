function RestoreController() {

    let EDFS;
    let seed;
    let pin;

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
        let pinConfirm = document.getElementById("pinConfirm").value;
        let btn = document.getElementById("setPINBtn");

        if (pin === pinConfirm && pin.length >= 4) {
            btn.removeAttribute("disabled");
        } else {
            btn.setAttribute("disabled", "disabled");
        }
    };


    this.restore = function (event) {
        event.stopImmediatePropagation();
        seed = document.getElementById("seed").value;
        try {
            EDFS.attachWithSeed(seed);
            wizard.next();
        }
        catch (e) {
           document.getElementById("seedError").innerText="Seed is not valid."
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

let controller = new RestoreController();
document.addEventListener("DOMContentLoaded", function () {
    controller.initView();
});



