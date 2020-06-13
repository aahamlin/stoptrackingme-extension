
export function Stream() {
    return Object.create({
        events: [],
        listeners: [],
        listen: function(listener) {
            var wrappedListener, self = this;
            if (typeof listener !== 'function') throw new Error('Function required');
            if (listener.length === 0) throw new Error('Listener fails specification');

            // TODO: remove - this is unnecessary with the exposure of listeners property
            wrappedListener = Object.create({
                listenFn: listener,
                stop: function () {
                    const isSelf = (element) => Object.is(this, element);
                    self.listeners.splice(self.listeners.findIndex(isSelf), 1);
                }
            });

            self.listeners.push(wrappedListener);
            return wrappedListener;
        },
    });
}

export function Sink(stream) {
    const _stream = stream;
    return Object.create({
        add: function (obj) {
            _stream.events.push(obj);
            setTimeout(function() {
                var nextEvent,
                    listeners = _stream.listeners;
                if (listeners.length < 1) return; // no one listening
                while((nextEvent = _stream.events.shift()) !== undefined) {
                    //console.log(`sending events to ${listeners.length} listeners`);
                    for(let i = 0; i < listeners.length; i++) {
                        listeners[i].listenFn(nextEvent);
                    }
                }
            }, 0);
        }
    });
}
