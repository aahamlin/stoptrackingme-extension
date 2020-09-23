export function SimpleCache() {

    var _cache = arguments.length === 1 ? arguments[0] : {};

    var lastUpdate = 0;

    function recordUpdate() {
        lastUpdate = Date.now();
    }

    return {
        get: (k) => {
            return _cache[k];
        },
        set: (k, v) => {
            _cache[k] = v;
            recordUpdate();
        },
        delete: (k) => {
            delete _cache[k];
            recordUpdate();
        },
        items: () => {
            return Object.entries(_cache);
        },
        keys: () => {
            return Object.keys(_cache);
        },
        values: () => {
            return Object.values(_cache);
        },
        toObject: () => {
            return Object.fromEntries(Object.entries(_cache));
        },
        lastUpdate: () => {
            return lastUpdate;
        }
    };
}

const CACHE = SimpleCache();

export { CACHE as default };
