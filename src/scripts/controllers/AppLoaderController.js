export default class AppLoaderController {
    constructor(element) {
        console.log("AppLoaderController created!");
    }

    checkApp() {
        return new Promise((resolve, reject) => {
            //TODO check app previous load:
            //existence of some data in root-sw
            //let app = {appName: "", secret: ""}
            let app = null;
            resolve(app)
        })
    }
}