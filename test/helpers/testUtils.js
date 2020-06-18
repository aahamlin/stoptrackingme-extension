
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



export function updateState(state, newState) {
    for(let tabId in newState) {
        if (!state.hasOwnProperty(tabId)) {
            state[tabId] = {};
        }
        // TODO implement a deep_copy
        state[tabId] = copy(state[tabId],
                            newState[tabId]);
    }
}
