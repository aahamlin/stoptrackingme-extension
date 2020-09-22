export function SimpleCache() {

    var _cache = arguments.length === 1 ? arguments[0] : {};

    return {
        get: (k) => {
            return _cache[k];
        },
        set: (k, v) => {
            _cache[k] = v;
        },
        delete: (k) => {
            delete _cache[k];
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
        }
    };
}

const CACHE = SimpleCache();

export { CACHE as default };
