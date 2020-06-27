
export function clearAllProps(data) {
    for(let prop in data) {
        delete data[prop];
    }
}

function deep_copy(source) {
    var outResult, item;

    console.log('deep_copy', source);
    if(typeof source !== 'object' || source === null) {
        return source;
    }

    outResult = Array.isArray(source) ? [] : {};

    for (item in source) {
        outResult[item] = deep_copy(source[item]);
    }

    return outResult;
}

// return new merged result
export function merge(target, source) {
    var outTarget, item;

    if (!target) {
        return deep_copy(source);
    }

    //otherwise create deep copy of target and proceed to update it
    outTarget = deep_copy(target);

    // plain values and arrays simple overwrite target
    if (typeof source !== 'object' || source === null) {
        outTarget = source;
    }
    else if (Array.isArray(source)) {
        outTarget = deep_copy(source);
    }
    else {
        // objects overwrite individual key-value pairs
        for(item in source) {
            outTarget[item] = merge(target[item], source[item]);
        }
    }

    console.log('merged target:source', target, source);
    return outTarget;
}



export function updateState(state, newState) {
    for(let tabId in newState) {
        if (!state.hasOwnProperty(tabId)) {
            state[tabId] = {};
        }
        // TODO implement a deep_copy
        state[tabId] = merge(state[tabId],
                            newState[tabId]);
    }
}
