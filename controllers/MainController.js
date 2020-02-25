function MainController(){

    function displayContainer(containerId) {
        document.getElementById(containerId).style.display="block";
    }

    this.initView = function(){
        document.getElementsByTagName("title")[0].text = APP_CONFIG.appName;

        let EDFS = require("edfs");
        EDFS.checkForSeedCage((err)=>{
            if(err){
                return displayContainer(APP_CONFIG.NEW_OR_RESTORE_CONTAINER_ID);
            }
            displayContainer(APP_CONFIG.PIN_CONTAINER_ID);

        });
    };
}

let  mainController = new MainController();
document.addEventListener("DOMContentLoaded",function(){
    mainController.initView();
});



