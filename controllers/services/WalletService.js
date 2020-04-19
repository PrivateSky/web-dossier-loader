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
                return callback(undefined, false);
            }

            callback(undefined, true);
        });
    };

    /**
     * @param {string} pin
     * @param {callback} callback
     */
    this.restoreFromPin = function (pin, callback) {
        EDFS.attachWithPin(pin, (err, edfs) => {
            if (err) {
                return callback(err);
            }

            EDFS = edfs;
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

            EDFS = edfs;
            callback();
        })
    };

    /**
     * @param {string} seed
     * @param {string} pin
     * @param {callback} callback
     */
    this.changePin = function (seed, pin, callback) {
        EDFS.loadWallet(seed, pin, true, (err, wallet) => {
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
        EDFS.loadWallet(pin, true, (err, wallet) => {
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
        const wallet = edfs.createRawDossier();

        const walletBuilder = new WalletBuilderService(wallet, {
            codeFolderName: 'code',
            walletTemplateFolderName: 'wallet-template',
            appFolderName: EDFS_CONSTANTS.CSB.APP_FOLDER,
            appsFolderName: 'apps',
            dossierFactory: () => {
                return edfs.createRawDossier();
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
                        return EDFS.loadRawDossier(seed);
                    }
                });

                walletBuilder.rebuild((err) => {
                    if (err) {
                        return console.error(err);
                    }
                    callback(undefined, wallet);
                })
            })
        })

    }

}

export default WalletService;
