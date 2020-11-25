import SWAgent from "../../controllers/services/SWAgent.js";


sendLoadingProgress(0, 'Getting SeedSSI...');

const paths = window.location.pathname.split("/iframe/");
const myIdentity = paths[1];
const swName = "swBoot.js";

window.frameElement.setAttribute("app-placeholder","true");

window.document.addEventListener(myIdentity, (e) => {
    const data = e.detail || {};

    if (data.seed) {
        const seed = data.seed;
        const swConfig = {
            name: swName,
            path: `../${swName}`,
            scope: myIdentity
        };

        sendLoadingProgress(30, 'Initializing application: ' + myIdentity);
        SWAgent.loadWallet(seed, swConfig, (err) => {
            if (err) {
                sendLoadingProgress(100, 'Error loading: ' + myIdentity);
                console.error(err);
                return sendMessage({
                    status: 'error'
                });
            }
            sendLoadingProgress(50, 'Loading: ' + myIdentity);
            sendMessage({
                status: 'completed'
            });
        })

    }
});

sendMessage({
    query: 'seed'
});

function sendMessage(message) {
    const event = new CustomEvent(myIdentity, {
        detail: message
    });
    window.parent.document.dispatchEvent(event);
}

function sendLoadingProgress(progress, status) {
    let currentWindow = window;
    let parentWindow = currentWindow.parent;

    while (currentWindow !== parentWindow) {
        currentWindow = parentWindow;
        parentWindow = currentWindow.parent;
    }

    parentWindow.document.dispatchEvent(new CustomEvent('ssapp:loading:progress', {
        detail: {
            progress,
            status
        }
    }));
}
