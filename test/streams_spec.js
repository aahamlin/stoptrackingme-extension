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

    describe('#stream', function () {

        it('should throw error when not given function', function () {
            expect(() => streamController.stream.listen()).to.throw(/Function required/);
        });

        it('should throw error when given invalid function', function () {
            var invalidFn = function () {};
            expect(() => streamController.stream.listen(invalidFn)).to.throw(/Listener/);
        });

        it('should throw error when listening on closed stream', function () {
            streamController.close();
            expect(() => streamController.stream.listen(function (_) {}))
                .to.throw(/closed/);
        });

        it('should throw error when adding event to closed sink', function () {
            streamController.close();
            expect(() => streamController.sink.add({}))
                .to.throw(/closed/);
        });
    });

    it('should notify listeners asynchronously', function (done) {
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

    it('should buffer events until listeners are added', function (done) {
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
