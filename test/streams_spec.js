import StreamController from '../src/streams.js';

describe('StreamController', function () {
    var streamController;

    const evtObj = {
        tabId: 1,
        requestDomain: '63squares.com',
        blockedTime: Date.now(),
        category: 'Analytics',
        totalCount: 2
    };

    beforeEach(function() {
        streamController = StreamController();
    });

    afterEach(function() {
        streamController.close();
        expect(streamController.isClosed()).to.be.true;
    });

    it('#stream#listen() requires listener', function () {
        expect(() => streamController.stream.listen()).to.throw(/Function required/);
    });

    it('#stream#listen() requires valid listener', function () {
        var invalidFn = function () {};
        expect(() => streamController.stream.listen(invalidFn)).to.throw(/Listener/);
    });

    it('#close() stops stream#listen()', function () {
        streamController.close();
        expect(() => streamController.stream.listen(function (_) {}))
            .to.throw(/closed/);
    });

    it('#close() stops sink#add()', function () {
        streamController.close();
        expect(() => streamController.sink.add({}))
            .to.throw(/closed/);
    });

    it('#add() notifies listeners asynchronously', function (done) {
        var sink = streamController.sink,
            stream = streamController.stream;

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
        var sink = streamController.sink,
            stream = streamController.stream;

        var count = 0,
            listenerFn = function (_) {
                if (++count == 2) {
                    done();
                }
            };

        sink.add({type:'blockedCookie', data: evtObj});
        sink.add({ type: 'blockedCookie', data: evtObj});
        stream.listen(listenerFn);
    });

});
