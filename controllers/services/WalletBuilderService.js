'use strict';

import FileService from "./FileService.js";

/**
 * @param {RawDossier} wallet
 * @param {object} options
 * @param {string} options.codeFolderName
 * @param {string} options.walletTemplateFolderName
 * @param {string} options.appFolderName
 * @param {string} options.appsFolderName
 */
function WalletBuilderService(wallet, options) {
    options = options || {};


    if (!options.codeFolderName) {
        throw new Error('Code folder name is required');
    }

    if (!options.walletTemplateFolderName) {
        throw new Error('The wallet template folder name is required');
    }

    if (!options.appFolderName) {
        throw new Error('The app folder name is required');
    }

    if (!options.appsFolderName) {
        throw new Error('The apps folder name is required');
    }

    if (typeof options.dossierFactory !== 'function') {
        throw new Error('A RawDossier factory function is required');
    }

    const CODE_FOLDER = options.codeFolderName;
    const WALLET_TEMPLATE_FOLDER = options.walletTemplateFolderName;
    const APP_FOLDER = options.appFolderName;
    const APPS_FOLDER = options.appsFolderName;

    const fileService = new FileService();

    this.walletTypeSeed = null;
    this.dossierFactory = options.dossierFactory;


    /**
     * Get the list of file and their contents
     * from the wallet template folder
     *
     * @param {callback} callback
     */
    const getWalletTemplateContent = (callback) => {
        fileService.getFolderContentAsJSON(WALLET_TEMPLATE_FOLDER, (err, data) => {
            if (err) {
                return callback(err);
            }

            let content;
            try {
                content = JSON.parse(data);
            } catch (e) {
                return callback(e);
            }

            callback(undefined, content);
        });
    };

    /**
     * @param {object} walletTemplateFolderName
     * @return {Array.Object}
     */
    const dirSummaryAsArray = (walletTemplateContent) => {
        let files = [];
        for (let directory in walletTemplateContent) {
            let directoryFiles = walletTemplateContent[directory];
            for (let fileName in directoryFiles) {
                files.push({
                    path: directory + "/" + fileName,
                    content: directoryFiles[fileName]
                });
            }
        }
        return files;
    };

    /**
     * Write the files into the dossier under /prefix
     *
     * @param {RawDossier} dossier
     * @param {Array.Object} files
     * @param {string} prefix
     * @param {callback} callback
     */
    const customizeDossier = (dossier, files, prefix, callback) => {
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

        dossier.writeFile(targetPath, file.content, (err) => {
            if (err) {
                return callback(err);
            }
            customizeDossier(dossier, files, prefix, callback);
        });
    };

    /**
     * @param {callback} callback
     */
    const getListOfAppsForInstallation = (callback) => {
        fileService.getFolderContentAsJSON(APPS_FOLDER, function (err, data) {
            if (err) {
                return callback(err);
            }

            let apps;

            try {
                apps = JSON.parse(data);
            } catch (e) {
                return callback(e);
            }

            callback(undefined, apps);
        });
    };

    /**
     * @param {string} appName
     * @param {string} seed
     * @param {callback} callback
     */
    const buildApp = (appName, seed, callback) => {
        fileService.getFolderContentAsJSON(`${appName}-template`, (err, data) => {
            let files;

            try {
                files = JSON.parse(data);
            } catch (e) {
                return callback(e);
            }

            files = dirSummaryAsArray(files);

            const appDossier = this.dossierFactory();
            appDossier.mount('/', CODE_FOLDER, seed, (err) => {
                if (err) {
                    return callback(err);
                }

                customizeDossier(appDossier, files, (err) => {
                    return callback(err, appDossier.getSeed());
                })
            })

        })

    };

    /**
     * @param {object} apps
     * @param {Array.String} appsList
     * @param {callback} callback
     */
    const performInstallation = (apps, appsList, callback) => {
        if (!appsList.length) {
            return callback();
        }
        let appName = appsList.pop();
        const appInfo = apps[appName];

        if (appName[0] === '/') {
            appName = appName.replace('/', '');
        }

        buildApp(appName, appInfo.seed, (err, newAppSeed) => {
            if (err) {
                return callback(err);
            }

            wallet.mount('/apps', appName, newAppSeed, (err) => {
                if (err) {
                    return callback(err);
                }

                performInstallation(apps, appsList, callback);
            })
        });
    };

    /**
     * Install applications found in the /apps folder
     * into the wallet
     *
     * @param {callback} callback
     */
    const installApplications = (callback) => {
        getListOfAppsForInstallation((err, apps) => {
            if (err) {
                return callback(err);
            }

            const appsList = Object.keys(apps);
            console.log('Installing the following applications: ', apps, appsList);

            performInstallation(apps, appsList, callback);
        })
    }

    /**
     * Mount the wallet template code
     * and install necessary applications
     *
     * @param {object} files
     * @param {callback} callback
     */
    const install = (files, callback) => {
        // Mount the "wallet template" into wallet/code
        wallet.mount('/', CODE_FOLDER, this.walletTypeSeed, (err) => {
            if (err) {
                return callback(err);
            }

            // Remove the seed file in order to prevent copying it into the new dossier
            delete files['/'].seed;

            // Copy any files found in the WALLET_TEMPLATE_FOLDER on the local file system
            // into the wallet's app folder
            files = dirSummaryAsArray(files);
            customizeDossier(wallet, files, `/${APP_FOLDER}`, (err) => {
                if (err) {
                    return callback(err);
                }

                installApplications(callback);
            })
        })
    }

    /**
     * @param {callback} callback
     */
    this.build = function (callback) {
        getWalletTemplateContent((err, files) => {
            if (err) {
                return callback(err);
            }

            this.walletTypeSeed = files['/'].seed;
            console.log(`Got wallet type seed: ${this.walletTypeSeed}`);

            install(files, callback);
        });
    };
}

export default WalletBuilderService;