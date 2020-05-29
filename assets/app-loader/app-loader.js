import SWAgent from "../../controllers/services/SWAgent.js";

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

        SWAgent.loadWallet(seed, swConfig, (err) => {
            if (err) {
                console.error(err);
                return sendMessage({
                    status: 'error'
                });
            }
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
