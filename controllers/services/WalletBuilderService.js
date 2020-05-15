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

    const CODE_FOLDER = options.codeFolderName;
    const WALLET_TEMPLATE_FOLDER = options.walletTemplateFolderName;
    const APP_FOLDER = options.appFolderName;
    const APPS_FOLDER = options.appsFolderName;

    const fileService = new FileService();

    this.walletTypeSeed = null;
    this.dossierFactory = options.dossierFactory;
    this.dossierLoader = options.dossierLoader;


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

        let fileContent;
        if(Array.isArray(file.content)){
            let Buffer = require("buffer").Buffer;

            let arrayBuffer  = new Uint8Array(file.content).buffer;
            let buffer = new Buffer(arrayBuffer.byteLength);
			let view = new Uint8Array(arrayBuffer);
			for (let i = 0; i < buffer.length; ++i) {
				buffer[i] = view[i];
			}
			fileContent = buffer;
        }
        else{
            fileContent = file.content;
        }
        dossier.writeFile(targetPath, fileContent, (err) => {
            if (err) {
                console.error(targetPath);
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

            if (typeof this.dossierFactory !== 'function') {
                return callback(new Error('A RawDossier factory function is required'));
            }

            this.dossierFactory((err, appDossier) => {
                if (err) {
                    return callback(err);
                }

                appDossier.mount('/' + CODE_FOLDER, seed, (err) => {

                    if (err) {
                        return callback(err);
                    }

                    customizeDossier(appDossier, files, `/${APP_FOLDER}`, (err) => {
                        return callback(err, appDossier.getSeed());
                    })
                })
            });
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

            wallet.mount('/apps/' + appName, newAppSeed, (err) => {
                if (err) {
                    return callback(err);
                }

                performInstallation(apps, appsList, callback);
            })
        });
    };

    /**
     * @param {string} appName
     * @param {string} seed
     * @param {callback} callback
     */
    const rebuildApp = (appName, seed, callback) => {
        fileService.getFolderContentAsJSON(`${appName}-template`, (err, data) => {
            let files;

            try {
                files = JSON.parse(data);
            } catch (e) {
                return callback(e);
            }

            files = dirSummaryAsArray(files);

            const appDossier = this.dossierLoader(seed);
            customizeDossier(appDossier, files, `/${APP_FOLDER}`, (err) => {
                return callback(err);
            })
        })

    };

    /**
     * @param {object} apps
     * @param {Array.String} appsList
     * @param {callback} callback
     */
    const performApplicationsRebuild = (apps, appsList, callback) => {
        if (!appsList.length) {
            return callback();
        }

        let appName = appsList.pop();
        const appInfo = apps[appName];

        if (appName[0] === '/') {
            appName = appName.replace('/', '');
        }

        rebuildApp(appName, appInfo.seed, (err) => {
            if (err) {
                return callback(err);
            }

            performApplicationsRebuild(apps, appsList, callback);
        })
    };

    /**
     * Get list of installed applications
     * and rebuild them
     *
     * @param {callback} callback
     */
    const rebuildApplications = (callback) => {
        getListOfAppsForInstallation((err, apps) => {
            if (err) {
                return callback();
            }

            const appsList = [];

            wallet.listMountedDossiers('/', (err, data) => {
                const mountedApps = [];
                for (const mountPoint of data) {
                    const appName = '/' + mountPoint.path.split('/').pop();
                    const appSeed = mountPoint.dossierReference;

                    if (!apps[appName]) {
                        continue;
                    }

                    appsList.push(appName);
                    apps[appName].seed = appSeed;
                }

                if (!appsList) {
                    return;
                }

                performApplicationsRebuild(apps, appsList, callback);
            });

        })

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
                return callback();
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
        wallet.mount('/' + CODE_FOLDER, this.walletTypeSeed, (err) => {
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

    /**
     * @param {callback}
     */
    this.rebuild = function (callback) {
        getWalletTemplateContent((err, files) => {
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

                console.log('Rebuilding');
                rebuildApplications(callback);
            })
        })

    }
}

export default WalletBuilderService;
