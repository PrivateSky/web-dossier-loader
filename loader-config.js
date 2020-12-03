import LOADER_GLOBALS from './config-constants.js';

let linkElement = document.createElement("link");
let theme = LOADER_GLOBALS.THEME;
linkElement.href = "assets/css/" + theme + ".css";
linkElement.type = "text/css";
linkElement.rel = "stylesheet";
document.head.appendChild(linkElement);


if (LOADER_GLOBALS.PLUGIN_SCRIPT) {
	let scriptElement = document.createElement("script");
	scriptElement.src = LOADER_GLOBALS.PLUGIN_SCRIPT;
	scriptElement.type = "module";
	document.body.appendChild(scriptElement);
}

window.LOADER_GLOBALS = LOADER_GLOBALS;
import env from "./environment.js";

LOADER_GLOBALS.environment = env;

let LOCALSTORAGE_CREDENTIALS_KEY = "LOCALSTORAGE_CREDENTIALS";

let knownCredentials = localStorage.getItem(LOCALSTORAGE_CREDENTIALS_KEY);
if (!knownCredentials) {
	knownCredentials = "{}";
}

LOADER_GLOBALS.credentials =  JSON.parse(knownCredentials);
