const config = {};

export function configure(obj) {
    for (let prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            config[prop] = obj[prop];
        }
    }
}

export function clear_all() {
    for (let key in config) {
        delete config[key];
    }
}

export function get_config_value(name) {
    if(config.hasOwnProperty(name)) {
        return config[name];
    }
}

export function tracker(url) {
    var serverName = new URL(url).hostname;
    while(serverName.indexOf('.') > -1) {
        if(config.trackers.hasOwnProperty(serverName)) {
            return config.trackers[serverName];// returns { category, name, url }
        }
        serverName = serverName.substring(serverName.indexOf('.')+1);
    }
    return;
}

export { tracker as default };
