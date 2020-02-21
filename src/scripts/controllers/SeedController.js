export default class SeedController {

    seedChanged(e) {
        this.seed = e.target.value;
    }

    sendMessageToSW(message){
        // This wraps the message posting/response in a promise, which will
        // resolve if the response doesn't contain an error, and reject with
        // the error if it does. If you'd prefer, it's possible to call
        // controller.postMessage() and set up the onmessage handler
        // independently of a promise, but this is a convenient wrapper.
        return new Promise(function(resolve, reject) {
            var messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = function(event) {
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
            navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
        });
    }

    restoreCSB(seed, callback){
        this.sendMessageToSW({action: "activate"}).then((data) => {
            if (data.status === "empty") {
                this.sendMessageToSW({seed: seed, url:window.location.origin}).then(data => {
                    console.log(data.status);

                    //document.write(data.content);
                    window.location = "/";
                    //callback();
                })
            }
        });
    }

    restoreCSBHandler(event) {

        if (event.data && typeof event.data.callback === "function") {
            let callback = event.data;
            this.restoreCSB(this.seed, callback);
        }
        else {
            console.log("No callback provided for restoreCSB event")
        }



    }

    constructor(element) {
        console.log("SeedController initialized");
        this.element = element;
        let seedInputElement = this.element.querySelector("#seed-text");
        seedInputElement.addEventListener("input", this.seedChanged.bind(this));
        document.addEventListener("restoreCSB", this.restoreCSBHandler.bind(this))
    }

}


