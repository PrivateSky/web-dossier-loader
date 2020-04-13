self.addEventListener('activate',  (event) => {
    try{
        clients.claim();
    } catch(err){
        console.log(err);
    }

});

function createResponse(event) {
        let url = event.request.url;
        let newUrl = url;

        if (url.indexOf("/iframe/") != -1) {
            let urlParts = url.split("/iframe/");
            if(urlParts.length === 2){
                let basePath = urlParts[0];
                newUrl = basePath + "/assets/app-loader/app-loader.html";
            }
        }

        return fetch(newUrl);

}

self.addEventListener('fetch', (event) => {
    event.respondWith(createResponse(event));
});
