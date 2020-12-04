import configConstants from './config-constants.js';
window.LOADER_GLOBALS = configConstants;

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


import env from "./environment.js";

LOADER_GLOBALS.environment = env;

LOADER_GLOBALS.LOCALSTORAGE_CREDENTIALS_KEY = "LOCALSTORAGE_CREDENTIALS";

let knownCredentials = localStorage.getItem(LOADER_GLOBALS.LOCALSTORAGE_CREDENTIALS_KEY);
if (!knownCredentials) {
	knownCredentials = "{}";
}

LOADER_GLOBALS.credentials =  JSON.parse(knownCredentials);
let config = require("opendsu").loadApi("config");
config.autoconfigFromEnvironment(LOADER_GLOBALS.environment);
