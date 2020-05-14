'use strict';

import WalletBuilderService from "./WalletBuilderService.js";

/**
 * @param {object} options
 * @param {string} options.edfsEndpoint
 * @param {string} options.seed
 */
function WalletService(options) {
    options = options || {};

    this.edfsEndpoint = options.edfsEndpoint;
    this.seed = options.seed;

    let EDFS = require('edfs');
    let edfsInstance;
    const EDFS_CONSTANTS = EDFS.constants;

    /**
     * @param {string} endpoint
     */
    this.setEDFSEndpoint = function (endpoint) {
        this.edfsEndpoint = endpoint;
    };

    /**
     * @param {callback} callback
     */
    this.hasSeedCage = function (callback) {
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
    this.restoreFromPin = function (pin, callback) {
        EDFS.attachWithPassword(pin, (err, edfs) => {
            if (err) {
                return callback(err);
            }

			edfsInstance = edfs;
            callback();
        })
    };

    /**
     * @param {string} seed
     * @param {callback} callback
     */
    this.restoreFromSeed = function (seed, callback) {
        EDFS.attachWithSeed(seed, (err, edfs) => {
            if (err) {
                return callback(err);
            }

			edfsInstance = edfs;
            callback();
        })
    };

    /**
     * @param {string} seed
     * @param {string} pin
     * @param {callback} callback
     */
    this.changePin = function (seed, pin, callback) {
		edfsInstance.loadWallet(seed, pin, true, (err, wallet) => {
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
    this.load = function (pin, callback) {
		edfsInstance.loadWallet(pin, true, (err, wallet) => {
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
    this.create = function (pin, callback) {
        if (!this.edfsEndpoint) {
            throw new Error('An EDFS endpoint is required for creating a wallet');
        }

        let edfs;
        try {
            edfs = EDFS.attachToEndpoint(this.edfsEndpoint);
        } catch (e) {
            return callback(e);
        }

        edfs.createRawDossier((err, wallet) => {
            if (err) {
                return callback(err);
            }

            const walletBuilder = new WalletBuilderService(wallet, {
                codeFolderName: 'code',
                walletTemplateFolderName: 'wallet-template',
                appFolderName: EDFS_CONSTANTS.CSB.APP_FOLDER,
                appsFolderName: 'apps',
                dossierFactory: (callback) => {
                    edfs.createRawDossier(callback);
                }
            });

            walletBuilder.build((err) => {
                if (err) {
                    return callback(err);
                }

                edfs.loadWallet(wallet.getSeed(), pin, true, (err, wallet) => {
                    if (err) {
                        return callback(err);
                    }

                    callback(undefined, wallet);
                });
            })
        });
    }

    /**
     * Rebuild an existing wallet
     * @param {string|undefined} pin
     * @param {callback} callback
     */
    this.rebuild = function (pin, callback) {
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
                    appFolderName: EDFS_CONSTANTS.CSB.APP_FOLDER,
                    appsFolderName: 'apps',
                    dossierLoader: function (seed, callback) {
                        EDFS.loadRawDossier(seed, callback);
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
