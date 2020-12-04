import { Workbox } from "../../assets/pwa/workbox-window.prod.mjs";

let controllersChangeHandlers = [];

let webmanifest = null;

navigator.serviceWorker.oncontrollerchange = function (event) {
    let serviceWorker = event.target.controller;
    let serviceWorkerUrl = serviceWorker.scriptURL;

    if (controllersChangeHandlers.length) {
        let index = controllersChangeHandlers.length;
        while (index--) {
            const { swName, registration, callback } = controllersChangeHandlers[index];
            if (serviceWorkerUrl.endsWith(swName)) {
                callback(undefined, registration);
                controllersChangeHandlers.splice(index, 1);
            }
        }
    }
};

const NavigatorUtils = {
    whenSwIsReady: function (swName, registration, callback) {
        const { installing } = registration;
        if (installing) {
            installing.addEventListener("statechange", (res) => {
                if (installing.state === "activated") {
                    callback(null, registration);
                }
            });
        } else {
            controllersChangeHandlers.push({ swName, registration, callback });
        }
    },

    getRegistrations: (callback) => {
        if (NavigatorUtils.areServiceWorkersSupported()) {
            return navigator.serviceWorker
                .getRegistrations()
                .then((registrations) => callback(null, registrations))
                .catch(callback);
        }
        return callback(null, []);
    },

    sendMessage: function (message) {
        // This wraps the message posting/response in a promise, which will
        // resolve if the response doesn't contain an error, and reject with
        // the error if it does. If you'd prefer, it's possible to call
        // controller.postMessage() and set up the onmessage handler
        // independently of a promise, but this is a convenient wrapper.
        return new Promise(function (resolve, reject) {
            var messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = function (event) {
                if (event.data.error) {
                    reject(event.data.error);
                } else {
                    resolve(event.data);
                }
            };

            // This sends the message data as well as transferring
            // messageChannel.port2 to the service worker.
            // The service worker can then use the transferred port to reply
            // via postMessage(), which will in turn trigger the onmessage
            // handler on messageChannel.port1.
            // See
            // https://html.spec.whatwg.org/multipage/workers.html#dom-worker-postmessage

            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
            } else {
                navigator.serviceWorker.oncontrollerchange = function () {
                    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
                };
            }
        });
    },

    restoreDossier: (seed, callback) => {
        NavigatorUtils.sendMessage({ seed: seed })
            .then((data) => callback(null, data))
            .catch(callback);
    },

    registerSW: (options, callback) => {
        options = options || {};

        const { scope } = options;
        const registerOptions = scope ? { scope } : undefined;

        if (NavigatorUtils.areServiceWorkersSupported()) {
            navigator.serviceWorker
                .register(options.path, registerOptions)
                .then((registration) => {
                    if (registration.active) {
                        return callback(null, registration);
                    }
                    NavigatorUtils.whenSwIsReady(options.name, registration, callback);
                })
                .catch((err) => {
                    console.log(err);
                    return callback("Operation failed. Try again");
                });
        }
    },

    unregisterServiceWorker: (sw, callback) => {
        sw.unregister({ immediate: true })
            .then((success) => {
                if (!success) {
                    console.log("Could not unregister sw ", sw);
                    return callback("Could not unregister sw");
                }

                callback();
            })
            .catch(callback);
    },

    unregisterAllServiceWorkers: (callback) => {
        callback = typeof callback === "function" ? callback : () => {};
        NavigatorUtils.getRegistrations((err, sws) => {
            if (err) {
                return callback(err);
            }
            if (sws.length > 0) {
                const allUnregistrations = sws.map((sw) => {
                    return new Promise((resolve) => {
                        return NavigatorUtils.unregisterServiceWorker(sw, resolve);
                    });
                });

                return Promise.all(allUnregistrations)
                    .then((result) => callback(null, result))
                    .catch(callback);
            }

            callback();
        });
    },

    hasRegisteredServiceWorkers: (callback) => {
        NavigatorUtils.getRegistrations((err, sws) => {
            if (err) {
                return callback(err);
            }

            callback(null, sws.length > 0);
        });
    },

    clearCaches: (callback) => {
        if ("caches" in window) {
            return caches
                .keys()
                .then((keyList) => {
                    return Promise.all(
                        keyList.map((key) => {
                            return caches.delete(key);
                        })
                    );
                })
                .then(() => callback())
                .catch((error) => {
                    callback(error);
                    console.log("cache clear error", error);
                });
        }
    },

    getWebmanifest: (callback) => {
        if (webmanifest) {
            return callback(webmanifest);
        }

        fetch("./manifest.webmanifest")
            .then((response) => response.json())
            .then((manifest) => {
                webmanifest = manifest;
                callback(null, manifest);
            })
            .catch((err) => {
                console.log("Cannot load manifest.webmanifest", err);
                callback();
            });
    },

    areServiceWorkersSupported: () => {
        return "serviceWorker" in navigator;
    },

    canUseServiceWorkers: () => {
        return (
            typeof LOADER_GLOBALS === "undefined" ||
            (!!LOADER_GLOBALS.environment.sw && NavigatorUtils.areServiceWorkersSupported())
        );
    },

    loadWallet: (seed, swConfig, callback) => {
        NavigatorUtils.registerSW(swConfig, (err) => {
            if (err) return callback(err);

            NavigatorUtils.restoreDossier(seed, (err) => {
                if (err) {
                    NavigatorUtils.unregisterAllServiceWorkers();
                    return callback("Operation failed. Try again");
                }
                callback();
            });
        });
    },

    addServiceWorkerEventListener: (eventType, callback) => {
        if (NavigatorUtils.canUseServiceWorkers()) {
            navigator.serviceWorker.addEventListener(eventType, callback);
        }
    },

    registerPwaServiceWorker: () => {
        const showNewContentAvailable = () => {
            if (confirm(`New content is available!. Click OK to refresh!`)) {
                window.location.reload();
            }
        };

        NavigatorUtils.getWebmanifest((err, manifest) => {
            if (!manifest) {
                // no manifest is available to the SW won't be registered
                return;
            }

            const scope = manifest.scope;
            const wb = new Workbox("./swPwa.js", { scope: scope });

            wb.register()
                .then((registration) => {
                    registration.addEventListener("updatefound", () => {
                        console.log("updatefound", {
                            installing: registration.installing,
                            active: registration.active,
                        });

                        const activeWorker = registration.active;
                        if (activeWorker) {
                            activeWorker.addEventListener("statechange", () => {
                                console.log("active statechange", activeWorker.state);
                                if (activeWorker.state === "installed" && navigator.serviceWorker.controller) {
                                    showNewContentAvailable();
                                }
                            });
                        }
                    });
                })
                .catch((err) => {
                    console.log("swPwa registration issue", err);
                });

            setInterval(() => {
                wb.update();
            }, 60 * 1000);
        });
    },
};

export default NavigatorUtils;
