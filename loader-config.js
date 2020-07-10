import APP_CONFIG from './config-constants.js';

let linkElement = document.createElement("link");
let theme = APP_CONFIG.THEME;
linkElement.href = "assets/css/" + theme + ".css";
linkElement.type = "text/css";
linkElement.rel = "stylesheet";
document.querySelector('head').appendChild(linkElement);

window.APP_CONFIG = APP_CONFIG;