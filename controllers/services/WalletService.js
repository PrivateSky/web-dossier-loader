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

    let EDFS = require('edfs');
    const openDSU = require("opendsu");
    const bdns = openDSU.loadApi("bdns");
    const keyssi = openDSU.loadApi("keyssi");
    const resolver = openDSU.loadApi("resolver");
    const CONSTANTS = openDSU.constants;
    const DEFAULT_DOMAIN = "default";

    bdns.addRawInfo(DEFAULT_DOMAIN, {
    brickStorages: [this.edfsEndpoint],
    anchoringServices: [this.edfsEndpoint]
})
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
        EDFS.checkForSeedCage((err) => {
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
        // EDFS.attachWithPassword(pin, (err, edfs) => {
        //     if (err) {
        //         return callback(err);
        //     }
        //
        //     edfsInstance = edfs;
        //     callback();
        // })
        callback();
    };

    /**
     * @param {string} keySSI
     * @param {callback} callback
     */
    this.restoreFromSeed = function(keySSI, callback) {
        callback();
        // EDFS.attachWithSeed(keySSI, (err, edfs) => {
        //     if (err) {
        //         return callback(err);
        //     }

        //     edfsInstance = edfs;
        //     callback();
        // })
    };

    /**
     * @param {string} keySSI
     * @param {string} pin
     * @param {callback} callback
     */
    this.changePin = function(keySSI, pin, callback) {
        resolver.loadDSU(keySSI, { password: pin, overwrite: true }, (err, wallet) => {
            if (err) {
                return callback(err);
            }
            return callback(null, wallet);
        });
    };

    /**
     * @param {string} pin
     * @param {callback}
     */
    this.load = function(pin, callback) {
        resolver.loadDSU(keyssi.buildWalletSSI(DEFAULT_DOMAIN), { password: pin, overwrite: true }, (err, wallet) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, wallet);
        });
    };


    /**
     * Create a new wallet
     * @param {string|undefined} pin
     * @param {callback} callback
     */
    this.create = function(pin, callback) {
        SWAgent.unregisterSW(() => {
            if (!this.edfsEndpoint) {
                throw new Error('An EDFS endpoint is required for creating a wallet');
            }

            resolver.createDSU(keyssi.buildSeedSSI(DEFAULT_DOMAIN), (err, wallet) => {
                if (err) {
                    return callback(err);
                }

                const walletBuilder = new WalletBuilderService(wallet, {
                    codeFolderName: 'code',
                    walletTemplateFolderName: 'wallet-template',
                    appFolderName: CONSTANTS.APP_FOLDER,
                    appsFolderName: 'apps',
                    dossierFactory: (callback) => {
                        resolver.createDSU(keyssi.buildSeedSSI(DEFAULT_DOMAIN), callback);
                    }
                });


                walletBuilder.build((err) => {
                    if (err) {
                        return callback(err);
                    }

                    wallet.getKeySSI((err, keySSI) => {
                        if (err) {
                            return callback(err);
                        }

                        resolver.loadDSU(keySSI, { password: pin, overwrite: true }, (err, wallet) => {
                            if (err) {
                                return callback(err);
                            }

                            callback(undefined, wallet);
                        });
                    });
                })
            });
        })
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