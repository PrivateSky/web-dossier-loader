let controllersChangeHandlers = [];

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

const SWAgent = {
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
    if ("serviceWorker" in navigator) {
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
    SWAgent.sendMessage({ seed: seed })
      .then((data) => callback(null, data))
      .catch(callback);
  },

  registerSW: (options, callback) => {
    options = options || {};

    const { scope } = options;
    const registerOptions = scope ? { scope } : undefined;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(options.path, registerOptions)
        .then((registration) => {
          if (registration.active) {
            return callback(null, registration);
          }
          SWAgent.whenSwIsReady(options.name, registration, callback);
        })
        .catch((err) => {
          // SWAgent.unregisterSW();
          return callback("Operation failed. Try again");
        });
    }
  },

  unregisterServiceWorker: (sw, callback) => {
    sw.unregister({ immediate: true })
      .then((success) => {
        if (!success) {
          console.log("Could not unregister sw ", sw);
        }
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
            .then(callback)
            .catch((error) => {
              // if there are any issues with the cache clearing then we will consider the unregister still successful
              console.log("cache clear error", error);
              callback();
            });
        }

        callback();
      })
      .catch(callback);
  },

  unregisterAllServiceWorkers: (callback) => {
    callback = typeof callback === "function" ? callback : () => {};
    SWAgent.getRegistrations((err, sws) => {
      if (err) {
        return callback(err);
      }
      if (sws.length > 0) {
        const allUnregistrations = sws.map((sw) => {
          return new Promise((resolve) => {
            return SWAgent.unregisterServiceWorker(sw, resolve);
          });
        });

        return Promise.all(allUnregistrations)
          .then((result) => callback(null, result))
          .catch(callback);
      }

      callback();
    });
  },

  hasServiceWorkers: (callback) => {
    SWAgent.getRegistrations((err, sws) => {
      if (err) {
        return callback(err);
      }

      callback(null, sws.length > 0);
    });
  },

  loadWallet: (seed, swConfig, callback) => {
    SWAgent.registerSW(swConfig, (err) => {
      if (err) return callback(err);

      SWAgent.restoreDossier(seed, (err) => {
        if (err) {
          SWAgent.unregisterAllServiceWorkers();
          return callback("Operation failed. Try again");
        }
        callback();
      });
    });
  },
};

export default SWAgent;
