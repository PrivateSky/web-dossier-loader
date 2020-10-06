'use strict';

import SWAgent from "./SWAgent.js";
import EventMiddleware from "./EventMiddleware.js";
const PskCrypto = require("pskcrypto");

function SSAppRunner(options) {
    options = options || {};

    if (!options.seed) {
        throw new Error('Missing seed');
    }
    this.seed = options.seed;
    this.hash = PskCrypto.pskHash(this.seed, "hex");

    /**
     * Builds the iframe container
     * for the SSApp
     * @return {HTMLIFrameElement}
     */
    const buildContainerIframe = () => {
        const iframe = document.createElement('iframe');

        //iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms");
        iframe.setAttribute("frameborder", "0");

        iframe.style.overflow = 'hidden';
        iframe.style.height = '100%';
        iframe.style.width = '100%';
        iframe.style.display = 'block';
        iframe.style.zIndex = '100';

        iframe.setAttribute('identity', this.hash);

        // This request will be intercepted by swLoader.js
        // and will make the iframe load the app-loader.js script
        iframe.src = window.location.origin+window.location.pathname + 'iframe/' + this.hash;
        return iframe;
    };

    const setupLoadEventsListener = (iframe) => {

		let eventMiddleware = new EventMiddleware(iframe, this.hash);

		eventMiddleware.registerQuery("seed", ()=>{
            return {seed:this.seed};
        });

		eventMiddleware.onStatus("completed", ()=>{
			if(iframe.hasAttribute("app-placeholder")){
				iframe.removeAttribute("app-placeholder");
				return document.body.innerHTML = iframe.outerHTML;
			}
			else{
				/**
				 * remove all body elements that are related to loader UI except the iframe
				 */
				document.querySelectorAll("body > *:not(iframe)").forEach(node => node.remove())
			}
		});

		eventMiddleware.onStatus("sign-out", (data)=>{

			SWAgent.unregisterSW(() => {
				if (data.deleteSeed === true) {
					localStorage.removeItem("seedCage");
				}
				window.location.reload();
			});

		});

		eventMiddleware.onStatus("error", ()=>{
			throw new Error("Unable to load application");
		});

    };

    /**
     * Post back the seed if the service worker
     * requests it
     */
    const setupSeedRequestListener = () => {
        navigator.serviceWorker.addEventListener('message', (e) => {
            if (!e.data || e.data.query !== 'seed') {
                return;
            }

            const swWorkerIdentity = e.data.identity;
            if (swWorkerIdentity === this.hash) {
                e.source.postMessage({
                    seed: this.seed
                });
            }
        })
    };

    this.run = function () {
        const iframe = buildContainerIframe();
        setupLoadEventsListener(iframe);
        setupSeedRequestListener();

        SWAgent.registerSW({
            name: 'swLoader.js',
            path: 'swLoader.js'
        }, (err) => {
            if (err) {
                throw err;
            }

            document.body.appendChild(iframe);
        });
    };
}

export default SSAppRunner;
