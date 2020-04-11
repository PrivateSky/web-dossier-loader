import SWAgent from "../../controllers/services/SWAgent.js";

let paths = window.location.pathname.split("/apps/");

let myIdentity = paths[1];


window.addEventListener("message",(event)=>{
    let seed = event.data.seed;
    if(event.data.seed){
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('../swBoot.js',{scope: myIdentity}).then(function (reg) {

                setTimeout(()=>{
                    SWAgent.restoreDossier(seed, window.location.origin, function (err) {
                        if (err) {
                            SWAgent.unregisterSW();
                            return callback("Operation failed. Try again");
                        }
                        window.parent.postMessage({status:"completed"},"*");
                    });
                },100)




            }).catch(function (err) {
                console.log(err);
                SWAgent.unregisterSW();
            });
        }
    }

});

window.parent.postMessage({appIdentity:myIdentity},"*");


