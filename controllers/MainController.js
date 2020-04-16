import SpinnerService from "./services/SpinnerService.js";
import WalletService from "./services/WalletService.js";

function MainController() {

    let pin;
    let spinner;
    const walletService = new WalletService();


    function displayContainer(containerId) {
        document.getElementById(containerId).style.display = "block";
    }

    this.initView = function () {
        document.getElementsByTagName("title")[0].text = APP_CONFIG.appName;
        spinner = new SpinnerService(document.getElementsByTagName("body")[0]);

        walletService.hasSeedCage((err, result) => {
            if (!result) {
                return displayContainer(APP_CONFIG.NEW_OR_RESTORE_CONTAINER_ID);
            }
            displayContainer(APP_CONFIG.PIN_CONTAINER_ID);
        })

        if(APP_CONFIG.DEVELOPMENT_PIN){
            controller.openWallet(new CustomEvent("test"));
        }
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
        window.location = "./restore"
    };

    this.openWallet = function (event) {

        if(APP_CONFIG.DEVELOPMENT_PIN){
           pin = APP_CONFIG.DEVELOPMENT_PIN;
        }

        event.preventDefault();
        spinner.attachToView();
        walletService.restoreFromPin(pin, (err) => {
            if (err) {
                spinner.removeFromView();
                return document.getElementById("pin-error").innerText = "Invalid PIN";
            }

            loadRootSW((err) => {
                if (err) {
                    throw err;
                }

                walletService.load(pin, (err, wallet) => {
                    if (err) {
                        console.error(err);
                        return console.error("Operation failed. Try again");
                    }

                    const PskCrypto = require("pskcrypto");
                    const hexDigest = PskCrypto.pskHash(wallet.getSeed(), "hex");

                    loadIframeInDOM(hexDigest, wallet.getSeed());
                })
            })

        })
    };

    function loadIframeInDOM(hexDigest, seed){
        let iframe = document.createElement("iframe");
        iframe.setAttribute("sandbox","allow-scripts allow-same-origin allow-forms");
        iframe.setAttribute("frameborder","0");
        iframe.style.overflow = "hidden";
        iframe.style.height = "100%";
        iframe.style.width = "100%";
        iframe.style.display = "block";
        iframe.style.zIndex="100";
        let currentLocation = window.location;
        iframe.src=currentLocation+"iframe/"+hexDigest;

        window.addEventListener("message",(event)=>{
            if(event.data.appIdentity){
                if(event.data.appIdentity === hexDigest){
                    iframe.contentWindow.postMessage({seed:seed},iframe.src);
                }
            }

            if (event.data.status === "completed") {
                document.write(`<html>
                <body>
                <style>
                html, body {margin:0; padding: 0;}
                </style>
                ${iframe.outerHTML}
                </body>
                </html>`);
            }

            if (event.data.status === "error") {
                //handle error;
            }
        });

        document.body.appendChild(iframe);

    }


    function loadRootSW(callback){
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('swLoader.js').then(function(reg) {
                callback(undefined);
            }).catch(function(err) {
                callback(err);
            });
        }
    }
}

let controller = new MainController();
document.addEventListener("DOMContentLoaded", function () {
    controller.initView();
});
window.controller = controller;



