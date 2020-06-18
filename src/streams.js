// simplistic sink + stream loosely based on Dart streamcontroller

export function StreamController() {

    const events = [];
    const listeners = [];

    var _isClosed = false;

    function addEvent(event) {
        if (_isClosed) throw new Error('stream is already closed');
        if (!event) throw new Error('No event provided');
        events.push(event);
        setTimeout(function() {
            var nextEvent;
            if (listeners.length < 1) return;
            while((nextEvent = events.shift()) !== undefined) {
                for(var i = 0; i < listeners.length; i++) {
                    listeners[i](nextEvent);
                }
            }
        }, 0);
    };

    function addListener(listener) {
        if (_isClosed) throw new Error('stream is already closed');
        if (typeof listener !== 'function') throw new Error('Function required');
        if (listener.length === 0) throw new Error('Listener fails specification');
        listeners.push(listener);
    };

    return Object.create({
        stream: Stream(addListener),
        sink: Sink(addEvent),
        isClosed: () => _isClosed,
        close: function () {
            _isClosed = true;
            events.splice(0);
            listeners.splice(0);
        }
    });

}

function Stream(addListener) {

    return Object.create({
        listen: function(listener) {
            addListener(listener);
        },
    });
}

function Sink(addEvent) {
    return Object.create({
        add: function (obj) {
            addEvent(obj);
        }
    });
}


export { StreamController as default };
