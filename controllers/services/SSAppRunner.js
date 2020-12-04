"use strict";

import { Workbox } from "../../assets/pwa/workbox-window.prod.mjs";
import SWAgent from "./SWAgent.js";
import EventMiddleware from "./EventMiddleware.js";
const crypto = require("opendsu").loadApi("crypto");

function getIFrameBase(){
  let iPath  = window.location.pathname;
  return iPath.replace("index.html", "") +  "iframe/";
}


function SSAppRunner(options) {
  options = options || {};

  if (!options.seed) {
    throw new Error("Missing seed");
  }
  this.seed = options.seed;
  this.hash = crypto.sha256(this.seed);
  this.spinner = options.spinner;

  /**
   * Builds the iframe container
   * for the SSApp
   * @return {HTMLIFrameElement}
   */
  const buildContainerIframe = () => {
    const iframe = document.createElement("iframe");

    //iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms");
    iframe.setAttribute("frameborder", "0");

    iframe.style.overflow = "hidden";
    iframe.style.height = "100%";
    iframe.style.width = "100%";
    iframe.style.display = "block";
    iframe.style.zIndex = "100";

    iframe.setAttribute("identity", this.hash);

    // This request will be intercepted by swLoader.js
    // and will make the iframe load the app-loader.js script
    iframe.src = window.location.origin + getIFrameBase()  + this.hash;
    return iframe;
  };

  const setupLoadEventsListener = (iframe) => {
    let eventMiddleware = new EventMiddleware(iframe, this.hash);

    eventMiddleware.registerQuery("seed", () => {
      return { seed: this.seed };
    });

    eventMiddleware.onStatus("completed", () => {
      if (iframe.hasAttribute("app-placeholder")) {
        iframe.removeAttribute("app-placeholder");
        document.body.innerHTML = iframe.outerHTML;
        this.spinner.removeFromView();
        document.dispatchEvent(new CustomEvent('ssapp:loading:progress', {
            detail: {
                progress: 0,
                status: 'Wallet Loaded<br />Loading SSApp...'
            }
        }));
      } else {
        /**
         * remove all body elements that are related to loader UI except the iframe
         */
        try {
          document.querySelectorAll("body > *:not(iframe):not(.loader-parent-container)").forEach((node) => node.remove());
        }catch (e) {
          this.spinner.removeFromView();
        }
      }
    });

    eventMiddleware.onStatus("sign-out", (data) => {
      SWAgent.unregisterAllServiceWorkers(() => {
        // TODO: clear vault instead of seedCage
        if (data.deleteSeed === true) {
          localStorage.removeItem("seedCage");
        }
        window.location.reload();
      });
    });

    eventMiddleware.onStatus("error", () => {
      throw new Error("Unable to load application");
    });
  };

  /**
   * Post back the seed if the service worker
   * requests it
   */
  const setupSeedRequestListener = () => {
    navigator.serviceWorker.addEventListener("message", (e) => {
      if (!e.data || e.data.query !== "seed") {
        return;
      }

      const swWorkerIdentity = e.data.identity;
      if (swWorkerIdentity === this.hash) {
        e.source.postMessage({
          seed: this.seed,
        });
      }
    });
  };


    /**
     * Toggle the loading spinner based on the loading
     * progress of ssapps
     */
    const setupLoadingProgressEventListener = () => {
        document.addEventListener('ssapp:loading:progress', (e) => {
            const data = e.detail;
            const progress = data.progress;
            const statusText = data.status;

            if (progress < 100) {
                this.spinner.attachToView();
            }
            this.spinner.setStatusText(statusText);

            if (progress === 100) {
                this.spinner.removeFromView();
            }
        });
    }

  this.run = function () {
    const iframe = buildContainerIframe();
    setupLoadEventsListener(iframe);
    setupSeedRequestListener();
    setupLoadingProgressEventListener();

    SWAgent.unregisterAllServiceWorkers(() => {

      SWAgent.registerSW(
        {
          name: "swLoader.js",
          path: "swLoader.js",
          scope:  getIFrameBase()
        },
        (err) => {
          if (err) {
            throw err;
          }

          iframe.onload = () => {
            const showNewContentAvailable = () => {
              if (confirm(`New content is available!. Click OK to refresh!`)) {
                window.location.reload();
              }
            };

            if ("serviceWorker" in navigator) {
              fetch("./manifest.webmanifest")
                .then((response) => response.json())
                .then((manifest) => {
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
                })
                .catch((err) => {
                  console.log("Cannot load manifest.webmanifest", err);
                });
            }
          };

          document.body.appendChild(iframe);
        }
      );
    });
  };
}

export default SSAppRunner;
