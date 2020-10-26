module.exports = {
  globDirectory: "./",
  globPatterns: ["**/*.{html,js,css,ttf,eot,svg,woff,woff2,jpg,png}"],
  globIgnores: ["node_modules/**/*.*", "*.json-template"],
  swDest: "./swPwa.js",
  cleanupOutdatedCaches: true,
  skipWaiting: true,
};
