
import { Sink, Stream } from '../src/streams.js';

describe('events', function () {
    var sink, stream;

    const evtObj = {
        tabId: 1,
        requestId: 2,
        tracker: {
            category: 'Analytics',
            url: 'http://www.63squares.com',
            name: '63 Squares'
        }
    };

    beforeEach(function() {
        stream = Stream();
        sink = Sink(stream);
    });

    afterEach(function() {
        if (stream.listeners && stream.listeners.length) {
            stream.listeners = [];
        }
        expect(stream.listeners.length).to.be.equal(0);
    });

    it('#listen() requires listener', function () {
        expect(() => stream.listen()).to.throw(/Function required/);
    });

    it('#listen() requires valid listener', function () {
        var invalidFn = function () {};
        expect(() => stream.listen(invalidFn)).to.throw(/Listener/);
    });

    it('#listen() returns listener#stop()', function (done) {
        var listener = stream.listen(function (_) {
            throw new Error('Listener was not removed');
        });
        expect(stream.listeners.length).to.be.equal(1);
        // secondary stream that will not be removed
        stream.listen(function(eventObj) {
            expect(eventObj).to.deep.equal({ type: 'test', data: { id: 1 } });
            done();
        });
        expect(stream.listeners.length).to.be.equal(2);
        listener.stop();
        expect(stream.listeners.length).to.be.equal(1);
        sink.add({ type:'test', data: { id: 1 }});

    });

    it('#add() notifies listeners asynchronously', function (done) {
        var listenerFn = function (eventObj) {
            if(typeof eventObj === 'object') {
                expect(eventObj).to.have.property('type', 'blockedCookie');
                expect(eventObj).to.have.deep.property('data', evtObj);
                done(); // success
            }
            else {
                done('listener did not recieve expected object');
            }
        };

        stream.listen(listenerFn);
        sink.add({type: 'blockedCookie', data: evtObj});
    });

    it('#send() stores events until listeners are added', function (done) {
        var count = 0,
            listenerFn = function (_) {
                if (++count == 2) {
                    done();
                }
            };

        sink.add({type:'blockedCookie', data: evtObj});
        stream.listen(listenerFn);
        sink.add({ type: 'blockedCookie', data: evtObj});
    });

});
