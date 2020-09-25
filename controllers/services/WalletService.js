'use strict';
import ScopedLocalStorage from "./ScopedLocalStorage.js"
import WalletBuilderService from "./WalletBuilderService.js";
import SWAgent from "./SWAgent.js";

/**
 * @param {object} options
 * @param {string} options.edfsEndpoint
 * @param {string} options.seed
 */
function WalletService(options) {

    ScopedLocalStorage.setLocalStorageScope();
    options = options || {};

    this.edfsEndpoint = options.edfsEndpoint;
    this.keySSI = options.keySSI;

    const openDSU = require("opendsu");
    const bdns = openDSU.loadApi("bdns");
    const keyssi = openDSU.loadApi("keyssi");
    const resolver = openDSU.loadApi("resolver");
    const CONSTANTS = openDSU.constants;
    const DEFAULT_DOMAIN = "default";

    bdns.addRawInfo(DEFAULT_DOMAIN, {
        brickStorages: [this.edfsEndpoint],
        anchoringServices: [this.edfsEndpoint]
    });

    /**
     * @param {string} endpoint
     */
    this.setEDFSEndpoint = function(endpoint) {
        this.edfsEndpoint = endpoint;
    };

    /**
     * @param {callback} callback
     */
    this.hasSeedCage = function(callback) {
        const keySSI = require("opendsu").loadApi("keyssi");
        const walletSSI = keySSI.buildWalletSSI();
        walletSSI.checkForSSICage((err) => {
            if (err) {
                return callback(false);
            }

            callback(true);
        });
    };

    /**
     * @param {string} pin
     * @param {callback} callback
     */
    this.restoreFromPin = function(pin, callback) {
        const keySSI = require("opendsu").loadApi("keyssi");
        const walletSSI = keySSI.buildWalletSSI();
        walletSSI.getSeedSSI = (pin, (err, seedSSI) => {
             if (err) {
                 return callback(err);
             }
             callback(undefined, seedSSI);
        });
    };

    /**
     * @param {keySSI} keySSI
     * @param {string} pin
     * @param {callback} callback
     */
    this.changePin = function(keySSI, pin, callback) {
        keySSI.store(pin, callback);
    };

    /**
     * @param {string} secret
     * @param {callback}
     */
    this.load = function(secret, callback) {
        let resolver = require("opendsu").loadApi("resolver");
        resolver.loadWallet(secret, callback);
    };


    /**
     * Create a new wallet
     * @param {string|undefined} pin
     * @param {callback} callback
     */
    this.create = function(secret, callback) {
        SWAgent.unregisterSW(() => {
            if (!this.edfsEndpoint) {
                throw new Error('An EDFS endpoint is required for creating a wallet');
            }

            const walletBuilder = new WalletBuilderService({
                codeFolderName: 'code',
                walletTemplateFolderName: 'wallet-template',
                appFolderName: CONSTANTS.APP_FOLDER,
                appsFolderName: 'apps',
                ssiFileName: "seed"
            });

            walletBuilder.build((err, wallet) => {
                if (err) {
                    return callback(err);
                }

                wallet.getKeySSI((err, keySSI)=>{
                    if(err){
                        return callback(err);
                    }
                    let keySSISpace = require("opendsu").loadApi("keyssi");
                    keySSI = keySSISpace.parse(keySSI,{dsuFactoryType:"wallet"});

                    keySSI.store({password: secret}, (err)=>{
                        callback(err, wallet);
                    });
                });

                /*wallet.getKeySSI((err, keySSI) => {
                    if (err) {
                        return callback(err);
                    }

                    resolver.loadDSU(keySSI, { password: pin, overwrite: true }, (err, wallet) => {
                        if (err) {
                            return callback(err);
                        }

                        callback(undefined, wallet);
                    });
                });*/
            });
        });
    }

    /**
     * Rebuild an existing wallet
     * @param {string|undefined} pin
     * @param {callback} callback
     */
    this.rebuild = function(pin, callback) {
        this.restoreFromPin(pin, (err) => {
            if (err) {
                return callback(err);
            }

            this.load(pin, (err, wallet) => {
                if (err) {
                    return callback(err);
                }

                const walletBuilder = new WalletBuilderService(wallet, {
                    codeFolderName: 'code',
                    walletTemplateFolderName: 'wallet-template',
                    appFolderName: CONSTANTS.APP_FOLDER,
                    appsFolderName: 'apps',
                    dossierLoader: function(keySSI, callback) {
                        resolver.loadDSU(keySSI, callback);
                    }
                });


                walletBuilder.rebuild((err) => {
                    if (err) {
                        console.error(err);
                        return callback(err);
                    }
                    callback(undefined, wallet);
                })
            })
        })

    }

}

export default WalletService;
