import SWAgent from "../../controllers/services/SWAgent.js";

let paths = window.location.pathname.split("/iframe/");
let myIdentity = paths[1];
const swName = "swBoot.js";

window.addEventListener("message", (event) => {

    if (event.data.seed) {

        let seed = event.data.seed;
        let swConfig = {
            swName:swName,
            swPath:"../"+swName,
            scope:myIdentity
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


