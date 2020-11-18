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
function WalletBuilderService(options) {
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
    const SSI_FILE_NAME = options.ssiFileName;
    const DEFAULT_DOMAIN = options.domain || "default";

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
     * Write the files into the DSU under /prefix
     *
     * @param {DSU} dsu
     * @param {Array.Object} files
     * @param {string} prefix
     * @param {callback} callback
     */
    const customizeDSU = (dsu, files, prefix, callback) => {
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
        dsu.writeFile(targetPath, fileContent, (err) => {
            if (err) {
                console.error(targetPath);
                return callback(err);
            }
            customizeDSU(dsu, files, prefix, callback);
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
     * @param {Boolean} hasTemplate
     * @param {callback} callback
     */
    const buildApp = (appName, seed, hasTemplate, callback) => {
		if (typeof hasTemplate === "function") {
			callback = hasTemplate;
			hasTemplate = true;
		}

        const instantiateNewDossier = (files) =>{
			 let resolver = require("opendsu").loadApi("resolver");
			 let keyssi = require("opendsu").loadApi("keyssi");
			 resolver.createDSU(keyssi.buildSeedSSI("vault"), (err, appDSU) => {
				if (err) {
					return callback(err);
				}

				appDSU.mount('/' + CODE_FOLDER, seed, (err) => {

					if (err) {
						return callback(err);
					}
					customizeDSU(appDSU, files, `/${APP_FOLDER}`, (err) => {
                        if (err) {
                            return callback(err);
                        }

                        appDSU.getKeySSI(callback);
					})
				})
			});
		};

		if(hasTemplate){
			return fileService.getFolderContentAsJSON(`apps/${appName}`, (err, data) => {
				let files;

				try {
					files = JSON.parse(data);
				} catch (e) {
					return callback(e);
				}

				files = dirSummaryAsArray(files);
				instantiateNewDossier(files);
			})
        }
		instantiateNewDossier([]);


    };

    /**
     * @param {object} apps
     * @param {Array.String} appsList
     * @param {callback} callback
     */
    const performInstallation = (walletDSU, apps, appsList, callback) => {
        if (!appsList.length) {
            return callback();
        }
        let appName = appsList.pop();
        const appInfo = apps[appName];

        if (appName[0] === '/') {
            appName = appName.replace('/', '');
        }

		const mountApp = (newAppSeed) => {
			walletDSU.mount('/apps/' + appName, newAppSeed, (err) => {
				if (err) {
					return callback(err);
				}

				performInstallation(walletDSU, apps, appsList, callback);
			})
		};

	    //by default ssapps have a template
		let hasTemplate = appInfo.hasTemplate !== false;
		let newInstanceIsDemanded = appInfo.newInstance !== false;
		if (newInstanceIsDemanded) {
			return buildApp(appName, appInfo.seed, hasTemplate, (err, newAppSeed) => {
				if (err) {
					return callback(err);
				}
				mountApp(newAppSeed);
			});
		}
		mountApp(appInfo.seed);

    };

    /**
     * @param {string} appName
     * @param {string} seed
     * @param {callback} callback
     */
    const rebuildApp = (appName, seed, callback) => {
        fileService.getFolderContentAsJSON(`apps/${appName}`, (err, data) => {
            let files;

            try {
                files = JSON.parse(data);
            } catch (e) {
                return callback(e);
            }

            files = dirSummaryAsArray(files);

            const appDossier = this.dossierLoader(seed);
            customizeDSU(appDossier, files, `/${APP_FOLDER}`, (err) => {
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

	const getSSAppsFromInstallationURL = (callback)=>{
		let url = new URL(window.location.href);
		let searchParams = url.searchParams;
		let apps = {};

		searchParams.forEach((paramValue, paramKey) => {
			if (paramKey === "appName") {
				let seedKey = paramValue + "Seed";
				let appSeed = searchParams.get(seedKey);
				if (appSeed) {
					apps[paramValue] = appSeed;
				}
			}
		});

		if(Object.keys(apps)){
			return callback(apps);
		}

		callback();

	};


    /**
     * Install applications found in the /apps folder
     * into the wallet
     *
	 * @param {DSU} walletDSU
     * @param {callback} callback
     */
    const installApplications = (walletDSU, callback) => {

        getListOfAppsForInstallation((err, apps) => {

            let appsToBeInstalled = apps || {};

            getSSAppsFromInstallationURL((apps)=>{
               let externalAppsList = Object.keys(apps);
               if(externalAppsList.length>0){
                   externalAppsList.forEach(appName=>{
					   appsToBeInstalled[appName] = {
						   hasTemplate:false,
						   newInstance:false,
                           seed: apps[appName]
					   };
                   });
				   let landingApp = {name: externalAppsList[0]};
				   walletDSU.writeFile("apps/.landingApp",JSON.stringify(landingApp), ()=>{
				   	console.log(`Written landingApp [${landingApp.name}]. `)
				   });
               }
            });

            const appsList = Object.keys(appsToBeInstalled);

			if (appsList.length === 0) {
                return callback();
			}
            console.log('Installing the following applications: ', appsToBeInstalled, appsList);

            performInstallation(walletDSU, appsToBeInstalled, appsList, callback);
        })
    }

    /**
     * Mount the wallet template code
     * and install necessary applications
     *
     * @param {object} files
     * @param {callback} callback
     */
    const install = (wallet, files, callback) => {
		// Copy any files found in the WALLET_TEMPLATE_FOLDER on the local file system
		// into the wallet's app folder
		files = dirSummaryAsArray(files);
		customizeDSU(wallet, files, `/${APP_FOLDER}`, (err) => {
			if (err) {
				return callback(err);
			}

			installApplications(wallet, callback);
		});
    }

    /**
     * @param {callback} callback
     */
    this.build = function (callback) {
    	let resolver = require("opendsu").loadApi("resolver");
		let keySSISpace = require("opendsu").loadApi("keyssi");

    	fileService.getFile(WALLET_TEMPLATE_FOLDER+"/"+SSI_FILE_NAME, (err, dsuType)=>{
    		if(err){
    			return callback(err);
			}
			resolver.createWallet(keySSISpace.buildWalletSSI("vault", "template").getIdentifier(), dsuType, (err, walletDSU) => {
				if(err){
					return callback(err);
				}

				getWalletTemplateContent((err, files) => {
					if (err) {
						return callback(err);
					}

					// we need to remove dsu type identifier from the file list
					files['/'][SSI_FILE_NAME] = undefined;
					delete files['/'][SSI_FILE_NAME];

					install(walletDSU, files, (err)=>{
						if(err){
							return callback(err);
						}
						callback(undefined, walletDSU);
					});
				});
			});
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
            customizeDSU(wallet, files, `/${APP_FOLDER}`, (err) => {
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
