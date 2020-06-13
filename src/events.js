
const events = [];

const listeners = [];

export function createEvent(typeStr, obj) {
    return {
        type: typeStr,
        data: obj
    };
}

export function send(evt) {
    events.push(evt);
    // notify listeners at first availability
    setTimeout(function () {
        var nextEvent;
        if (listeners.length < 1) return;
        while((nextEvent= events.shift()) !== undefined) {
            for(let i = 0; i < listeners.length; i++) {
                listeners[i](nextEvent);
            }
        }
    }, 0);
}

export function addListener(listener) {
    if (typeof listener !== 'function') throw new Error('Function required');
    // must take an object as an argument
    if (listener.length === 0) throw new Error('Listener does not match specification');

    listeners.push(listener);
}

export function removeListener(listener) {

}
