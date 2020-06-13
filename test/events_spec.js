import { createEvent, send, addListener, removeListener } from '../src/events.js';


describe('events', function () {
    const evtObj = {
        tabId: 1,
        requestId: 2,
        tracker: {
            category: 'Analytics',
            url: 'http://www.63squares.com',
            name: '63 Squares'
        }
    };

    it('#createEvent() creates event', function () {
        var evt = createEvent('blockedCookie', evtObj);

        expect(evt).to.have.property('type', 'blockedCookie');
        expect(evt).to.have.deep.nested.property('data', evtObj);
    });

    it('#addListener() requires listener', function () {
        expect(() => addListener()).to.throw(/Function required/);
    });

    it('#addListener() requires valid listener', function () {
        var invalidFn = function () {};
        expect(() => addListener(invalidFn)).to.throw(/Listener/);
    });

    it('#send() notifies listeners asynchronously', function (done) {
        var listenerFn = function (eventObj) {
            if(typeof eventObj === 'object') {
                done(); // success
            }
        };

        var evt = createEvent('blockedCookie', evtObj);

        addListener(listenerFn);
        send(evt);
    });

    it('#send() stores events until listeners are added', function (done) {
        var count = 0,
            listenerFn = function (eventObj) {
                if (++count == 2) {
                    done();
                }
            };

        var evt = createEvent('blockedCookie', evtObj);
        send(evt);
        addListener(listenerFn);
        send(evt);
    });

});
