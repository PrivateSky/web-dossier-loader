"use strict";
import ScopedLocalStorage from "./ScopedLocalStorage.js";
import WalletBuilderService from "./WalletBuilderService.js";
import SWAgent from "./SWAgent.js";

/**
 * @param {object} options
 * @param {string} options.seed
 */
function WalletService(options) {
    ScopedLocalStorage.setLocalStorageScope();
    options = options || {};

    this.keySSI = options.keySSI;

    const openDSU = require("opendsu");
    const bdns = openDSU.loadApi("bdns");
    const keyssi = openDSU.loadApi("keyssi");
    const resolver = openDSU.loadApi("resolver");
    const CONSTANTS = openDSU.constants;

    /**
     * @param {string} seedSSI
     * @param {Function} callback
     */
    this.restoreFromSeedSSI = function (seedSSI, callback) {
        let resolver = require("opendsu").loadApi("resolver");
        resolver.loadDSU(seedSSI, (err) => {
            callback(err);
        });
    };

    /**
     * @param {keySSI} keySSI
     * @param {string} secret
     * @param {Function} callback
     */
    this.storeSSI = function (keySSI, secret, callback) {
        let keySSISpace = require("opendsu").loadApi("keyssi");
        keySSI = keySSISpace.parse(keySSI, {dsuFactoryType: "wallet"});

        keySSI.store(secret, (err) => {
            callback(err);
        });
    };

    /**
     * @param {string} secret
     * @param {Function} callback
     */
    this.load = function (secret, callback) {
        let resolver = require("opendsu").loadApi("resolver");
        resolver.loadWallet(secret, {domain: "vault"}, callback);
    };

    /**
     * Create a new wallet
     * @param {string|undefined} pin
     * @param {Function} callback
     */
    this.create = function (secret, callback) {
        SWAgent.unregisterAllServiceWorkers(() => {
            const walletBuilder = new WalletBuilderService({
                codeFolderName: "code",
                walletTemplateFolderName: "wallet-template",
                appFolderName: CONSTANTS.APP_FOLDER,
                appsFolderName: "apps",
                ssiFileName: "seed",
            });

            walletBuilder.build((err, wallet) => {
                if (err) {
                    return callback(err);
                }

                wallet.getKeySSI((err, keySSI) => {
                    if (err) {
                        return callback(err);
                    }

                    this.storeSSI(keySSI, secret, (err) => {
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
    };

    /**
     * Rebuild an existing wallet
     * @param {array|undefined} key
     * @param {callback} callback
     */
    this.rebuild = function (key, callback) {
        this.load(key, (err, wallet) => {
            if (err) {
                return callback(err);
            }

            const walletBuilder = new WalletBuilderService(wallet, {
                codeFolderName: "code",
                walletTemplateFolderName: "wallet-template",
                appFolderName: CONSTANTS.APP_FOLDER,
                appsFolderName: "apps",
                dossierLoader: function (keySSI, callback) {
                    resolver.loadDSU(keySSI, callback);
                },
            });

            walletBuilder.rebuild((err) => {
                if (err) {
                    console.error(err);
                    return callback(err);
                }
                callback(undefined, wallet);
            });
        });
    };
}

export default WalletService;
