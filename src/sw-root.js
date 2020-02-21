const cachePrefix = "http://127.0.0.1:8000";

self.addEventListener('activate',  (event) => {
    try{
        clients.claim();
    } catch(err){
        console.log(err);
    }

});

function createResponse(event) {
    return new Promise((resolve) => {
        let str = event.request.url;
        let newUrl = str;
        if (str.indexOf("SSApps/app/") != -1) {
            let url = new URL(str);
            newUrl = cachePrefix + "/pages/SSApps/iframe.html";
        }
        //event.request.url =  newUrl;

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

       // console.log("Loading resource from:",newUrl, mimeType);

        return fetch(newUrl).then((remoteResponse) => {
            var init = {"status": 200, "statusText": "File was successfully extracted"};
            remoteResponse.text().then(text => {
                var blob = new Blob([text], {type: mimeType});
                let response = new Response(blob, init);
                //cache.put(event.request, response);
                resolve(response);
            });
        });
    });
}

self.addEventListener('fetch', (event) => {
    //console.log(version, ": got request for ", event.request.url);
    event.respondWith(createResponse(event));
});
