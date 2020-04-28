import SWAgent from "../../controllers/services/SWAgent.js";

const paths = window.location.pathname.split("/iframe/");
const myIdentity = paths[1];
const swName = "swBoot.js";

window.addEventListener("message", (event) => {

    if (event.data.seed) {

        const seed = event.data.seed;
        const swConfig = {
            name: swName,
            path: `../${swName}`,
            scope: myIdentity
        };

        SWAgent.loadWallet(seed, swConfig, (err) => {
            if (err) {
                return console.error(err);
            }
            window.parent.postMessage({status:"completed"},"*");
        })
    }
});

window.parent.postMessage({appIdentity: myIdentity}, "*");
