function SWAgent() {
}

let controllersChangeHandlers = [];

navigator.serviceWorker.oncontrollerchange = function (event) {
    let serviceWorker = event.target.controller;
    let serviceWorkerUrl = serviceWorker.scriptURL;

    if (controllersChangeHandlers.length) {
        let index = controllersChangeHandlers.length;
        while (index--) {
            if (serviceWorkerUrl.endsWith(controllersChangeHandlers[index].swName)) {
                controllersChangeHandlers[index].callback(undefined);
                controllersChangeHandlers.splice(index, 1);
            }
        }
    }
};

SWAgent.whenSwIsReady = function (swName, callback) {
    controllersChangeHandlers.push({swName: swName, callback: callback});
};


SWAgent.sendMessage = function (message) {
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
};

SWAgent.restoreDossier = function (seed, callback) {
    SWAgent.sendMessage({action: "activate"}).then((data) => {
        if (data.status === "empty") {
            SWAgent.sendMessage({seed: seed, url: window.location.origin}).then(data => {
                callback(undefined);
            }).catch(err => {
                callback(err);
            })
        }
    }).catch(err => {
        callback(err);
    });
};

SWAgent.registerSW = function (options, callback) {
    options = options || {};
    const scope = (options.scope) ? {
        scope: options.scope
    } : undefined;

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register(options.path, scope).then(function (reg) {
            if (reg.active) {
                return callback();
            }
            SWAgent.whenSwIsReady(options.name, callback);
        }).catch(function (err) {
            SWAgent.unregisterSW();
            return callback('Operation failed. Try again');
        })
    }
}

SWAgent.unregisterSW = function (callback) {

	function unregisterServiceWorkers(sws, callback) {
		let sequence = Promise.resolve();
		for (let sw of sws) {
			sequence = sequence.then(() => {
				return new Promise(resolve => {
					sw.unregister().then(function (success) {
						if (!success) {
							console.log("Could not unregister sw ", sw);
						}
						if ('caches' in window) {
							caches.keys()
								.then(function (keyList) {
									return Promise.all(keyList.map(function (key) {
										return caches.delete(key);
									}));
								}).then(resolve);
						}
						else {
							resolve();
						}
					})
				})
			});
			sequence.then(callback);
		}
	}

	function unregisterAllServiceWorkers() {
		return new Promise(resolve => {
			navigator.serviceWorker.getRegistrations().then(function (sws) {
				if (sws.length > 0) {
					return unregisterServiceWorkers(sws, resolve);
				}
				resolve();
			});
		})
	};

	let promise = unregisterAllServiceWorkers();

	if (typeof callback === "function") {
		promise.then(callback);
	}
};


SWAgent.loadWallet = function (seed, swConfig, callback) {
    SWAgent.registerSW(swConfig, function (err)  {
        if (err) {
            throw err;
        }

        SWAgent.restoreDossier(seed, function (err) {
            if (err) {
                SWAgent.unregisterSW();
                return callback("Operation failed. Try again");
            }
            callback();
        });
    });
};

export default SWAgent;
