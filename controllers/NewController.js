import SpinnerService from "./services/SpinnerService.js";
import FileService from "./services/FileService.js";

function NewController() {

    let EDFS;
    let edfs;
    let seed;
    let pin;
    let walletType;
    let wizard;
    let spinner;
    let fileService = new FileService();

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
            edfs = EDFS.attachToEndpoint(APP_CONFIG.EDFS_ENDPOINT);
            fileService.getFolderContentAsJSON("wallet-template", function (err, walletTemplateAsJSON) {
                if (err) {
                    return console.log(err);
                }
                const walletTemplate = JSON.parse(walletTemplateAsJSON);
                const walletTypeSeed = walletTemplate["/"].seed;
                //we delete the seed file in order to prevent to be copied into the new dossier
                delete walletTemplate["/"].seed;
                console.log("Got Wallet type seed", walletTypeSeed);
                let wallet = edfs.createRawDossier();
                wallet.mount("/", "code", walletTypeSeed, true, function (err) {
                    if (err) {
                        return console.log(err);
                    }

                    function dirSummaryAsArray(walletTemplate) {
                        let filesToBeWritten = [];
                        for (let directory in walletTemplate) {
                            let directoryFiles = walletTemplate[directory];
                            for (let fileName in directoryFiles) {
                                filesToBeWritten.push({
                                    path: directory + "/" + fileName,
                                    content: directoryFiles[fileName]
                                });
                            }
                        }
                        return filesToBeWritten;
                    }

                    let files = dirSummaryAsArray(walletTemplate);
                    customizeDossier(wallet, files, "/"+EDFS.constants.CSB.APP_FOLDER, function (err) {
                        if (err) {
                            return console.log(err);
                        }
                        wallet.listFiles("/", function (err, files) {
                            if (err) {
                                return console.log(err);
                            }
                            console.log("Wallet list files until this point", files);
                            tryToInstallApps(function (err) {
                                console.log("finished apps installation", err);
                                if (err) {
                                    document.getElementById("pinError").innerText = "An error occurred. Please try again."
                                    return console.log(err);
                                }
                                seed = wallet.getSeed();
                                document.getElementById("seed").value = seed;
                                edfs.loadWallet(seed, pin, true, function (err) {
                                    if (err) {
                                        return console.log(err);
                                    }
                                    console.log("New Wallet instance ready to be used!!!");
                                    spinner.removeFromView();

                                    wizard.next();
                                });
                            });
                        })
                    });

                    function customizeDossier(dossier, files, prefix, callback) {
                        if (typeof prefix === "function") {
                            callback = prefix;
                            prefix = undefined;
                        }
                        if (files.length === 0) {
                            return callback();
                        }
                        let file = files.pop();
                        let targetPath = file.path;

                        if (typeof prefix !== 'undefined') {
                            targetPath = `${prefix}/${targetPath}`;
                        }

                        dossier.writeFile(targetPath, file.content, function (err) {
                            if (err) {
                                return callback(err);
                            }
                            customizeDossier(dossier, files, callback);
                        });
                    }

                    function tryToInstallApps(callback) {
                        fileService.getFolderContentAsJSON("apps", function (err, appsJSON) {
                            if (err) {
                                return console.log(err);
                            }
                            const apps = JSON.parse(appsJSON);
                            const appList = Object.keys(apps);
                            console.log("Application list to be installed", appList);
                            installApps(wallet, apps, appList, function (err) {
                                if (err) {
                                    return callback(err);
                                }
                                callback();
                            })
                        });
                    }

                    function installApps(dossier, appSeedRepo, appList, callback) {
                        if (appList.length === 0) {
                            return callback();
                        }
                        let appName = appList.pop();
                        let appTypeSeed = appSeedRepo[appList];
                        buildApp(appName, appTypeSeed, function (err, newAppSeed) {
                            if (err) {
                                return callback(err);
                            }
                            if (appName[0] === "/") {
                                appName = appName.replace("/", "");
                            }
                            dossier.mount("/apps", appName, newAppSeed, function (err) {
                                if (err) {
                                    return callback(err);
                                }
                                installApps(dossier, appSeedRepo, appList, callback);
                            })
                        });
                    }

                    function buildApp(appName, appTypeSeed, callback) {
                        fileService.getFolderContentAsJSON(appName + "-template", function (error, templateAsJSON) {
                            let appDossier = edfs.createRawDossier();
                            appDossier.mount("/", "code", appTypeSeed, function (err) {
                                if (err || error) {
                                    return callback(err);
                                }
                                let appTemplateFiles = dirSummaryAsArray(walletTemplate);
                                customizeDossier(appDossier, files, function (err) {
                                    return callback(err, appDossier.getSeed());
                                })
                            });
                        });
                    }

                });
            });
            /*EDFS.createWallet(walletType.templateSeed, pin, true, function (err, _seed) {
                spinner.removeFromView();
                if(!err){
                    seed = _seed;
                    document.getElementById("seed").value = seed;
                    wizard.next();
                }
                else{
                    document.getElementById("pinError").innerText="An error occurred. Please try again."
                }
            });*/
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




