function MainController(){

    let pin;
    let EDFS;

    function displayContainer(containerId) {
        document.getElementById(containerId).style.display="block";
    }

    this.initView = function(){
        document.getElementsByTagName("title")[0].text = APP_CONFIG.appName;


        EDFS = require("edfs");
        EDFS.checkForSeedCage((err)=>{
            if(err){
                return displayContainer(APP_CONFIG.NEW_OR_RESTORE_CONTAINER_ID);
            }
            displayContainer(APP_CONFIG.PIN_CONTAINER_ID);

        });
    };

    this.validatePIN = function(){
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
         EDFS.attachWithPin(pin, function (err, edfs) {
             if(err){
                 console.log(err);
                 return;
             }

             EDFS = edfs;
             EDFS.loadWallet(pin, true, function(err, wallet){
                 console.log(err,wallet);
             })
        });


    }
}

let  controller = new MainController();
document.addEventListener("DOMContentLoaded",function(){
    controller.initView();
});



