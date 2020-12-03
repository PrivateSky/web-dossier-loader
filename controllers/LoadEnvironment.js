/**
 * Try and fetch 'loader-config.local.json' and overwrite
 * the standard configuration
 *
 * @param {callback} callback
 */
function loadLocalConfiguration(callback) {
    const localConfigurationPath = getUrl("environment.json");

    fileService.getFile(localConfigurationPath, (err, data) => {
        if (err) {
            return callback(createOpenDSUErrorWrapper("Failed to load: environment.json", err));
        }

        let configuration;

        try {
            configuration = JSON.parse(data);
        } catch (e) {
            return callback(createOpenDSUErrorWrapper("Failed to parse: environment.json", e));
        }

        APP_CONFIG.environment = configuration;
        console.log("Setting environment ", configuration.mode, "in blockchain domain ", blockchainDomain);
        callback(undefined, configuration);
    });
}

export default loadLocalConfiguration;
