import APP_CONFIG from './config-constants.js';

let linkElement = document.createElement("link");
let theme = APP_CONFIG.THEME;
linkElement.href = "assets/css/" + theme + ".css";
linkElement.type = "text/css";
linkElement.rel = "stylesheet";
document.head.appendChild(linkElement);


if (APP_CONFIG.PLUGIN_SCRIPT) {
	let scriptElement = document.createElement("script");
	scriptElement.src = APP_CONFIG.PLUGIN_SCRIPT;
	scriptElement.type = "module";
	document.body.appendChild(scriptElement);
}

window.APP_CONFIG = APP_CONFIG;
