const cachePrefix = "http://127.0.0.1:8080";

self.addEventListener('activate',  (event) => {
    try{
        clients.claim();
    } catch(err){
        console.log(err);
    }

});

function createResponse(event) {
    return new Promise((resolve) => {
        let url = event.request.url;
        let newUrl = url;

        if (url.indexOf("/iframe/") != -1) {
            let urlParts = url.split("/iframe/");
            if(urlParts.length === 2){
                let basePath = urlParts[0];
                newUrl = basePath + "/assets/app-loader/app-loader.html";
            }
        }

        let mimeType = "text/html";
        switch (true) {
            case newUrl.indexOf(".js")!==-1:
                mimeType = 'text/javascript';
                break;
            case newUrl.indexOf(".css") !==-1:
                mimeType = 'text/css';
                break;
            case newUrl.indexOf(".html")!==-1:
                mimeType = 'text/html';
                break;
        }


        return fetch(newUrl).then((remoteResponse) => {
            var init = {"status": 200, "statusText": "File was successfully extracted"};
            remoteResponse.text().then(text => {
                var blob = new Blob([text], {type: mimeType});
                let response = new Response(blob, init);
                resolve(response);
            });
        });
    });
}

self.addEventListener('fetch', (event) => {
    event.respondWith(createResponse(event));
});
