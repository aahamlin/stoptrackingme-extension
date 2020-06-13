
export function clearAllProps(data) {
    for(let prop in data) {
        delete data[prop];
    }
}

export function copy(target, ...sources) {
    for(let i = 0; i < sources.length; i++) {
        for(let prop in sources[i]) {
            target[prop] = sources[i][prop];
        }
    }
    return target;
}
