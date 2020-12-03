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
     * @param {string} secret
     * @param {Function} callback
     */
    this.load = function (domain, secret, callback) {
        console.log("Loading the wallet");
        let resolver = require("opendsu").loadApi("resolver");
        let keyssi = require("opendsu").loadApi("keyssi");

        let walletSSI =  keyssi.buildWalletSSI(domain, secret);

        resolver.loadDSU(walletSSI, (err, constDSU) =>{
            if(err){
                return callback(createOpenDSUErrorWrapper("Failed to load wallet", err));
            }
            callback(undefined, constDSU.getWritableDSU());
        });
    };

    /**
     * Create a new wallet
     * @param {string|undefined} pin
     * @param {Function} callback
     */
    this.create = function (domain, arrayWithSecrets, callback) {
        console.log("Creating the wallet");
        SWAgent.unregisterAllServiceWorkers(() => {
            const walletBuilder = new WalletBuilderService({
                codeFolderName: "code",
                walletTemplateFolderName: "wallet-template",
                appFolderName: CONSTANTS.APP_FOLDER,
                appsFolderName: "apps",
                ssiFileName: "seed",
            });

            walletBuilder.build(arrayWithSecrets,(err, wallet) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper("Failed to create Wallet", err));
                }
                callback(undefined, wallet);
                /*TODO: delete this
                wallet.getKeySSI((err, keySSI) => {
                    if (err) {
                        return callback(err);
                    }

                    this.bindWithSeedSSI(domain, keySSI, secret, (err) => {
                        callback(err, wallet);
                    });
                });
                 */
            });
        });
    };

    /**
     * Rebuild an existing wallet
     * @param {array|undefined} key
     * @param {callback} callback
     */
    this.rebuild = function (domain, key, callback) {
        this.load(domain, key, (err, wallet) => {
            if (err) {
                return callback(createOpenDSUErrorWrapper("Failed to load wallet in rebuild", err));
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

            walletBuilder.rebuild(domain,(err) => {
                if (err) {
                    return callback(createOpenDSUErrorWrapper("Failed to rebuild wallet", err));
                }
                callback(undefined, wallet);
            });
        });
    };
}

export default WalletService;
