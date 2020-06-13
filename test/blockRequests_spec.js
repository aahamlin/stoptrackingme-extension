import testData from './testData.js';
import { configure, clear_all } from '../src/tracker.js';
import state, { reset as resetState } from '../src/state_provider.js';
import { addListener, reset as resetEvents } from '../src/events.js';
import { beginRequest,
         handleSendHeaders,
         handleHeadersReceived,
         endRequest,
         handleError
       } from '../src/blockRequests.js';

describe('blockRequests', function () {

    const detailsOfTracker = {
        tabId: 1,
        requestId: 132,
        url: "https://1234.g.63squares.com/trackme?foo=bar",
        requestHeaders: [
            { name: 'User-Agent', value: 'My user agent' },
            { name: 'Cookie', value: 'ABC=123;XYZ=789;' }
        ],
        responseHeaders: [
            { name: 'User-Agent', value: 'My user agent' },
            { name: 'Set-Cookie', value: 'name=ABC;value=123;domain=.63squares.com;' },
            { name: 'X-Browser', value: 'name=AnotherCookieValue;value=Foo' },
            { name: 'Set-Cookie', value: 'name=XYZ;value=789;domain=.63squares.com;' }
        ]
    };

    const detailsOfNonTracker = {
        tabId: 1,
        requestId: 127,
        url: "https://www.safeurl.com?foo=bar",
        requestHeaders: [
            { name: 'User-Agent', value: 'My user agent' },
            { name: 'Cookie', value: 'ABC=123;XYZ=789;' }
        ],
        responseHeaders: [
            { name: 'User-Agent', value: 'My user agent' },
            { name: 'Set-Cookie', value: 'name=ABC;value=123;domain=.safeurl.com;' },
            { name: 'X-Browser', value: 'name=AnotherCookieValue;value=Foo' },
            { name: 'Set-Cookie', value: 'name=XYZ;value=789;domain=.safeurl.com;' }
        ]
    };


    beforeEach(function () {
        configure(testData.config);
    });

    afterEach(function () {
        clear_all();
        resetState();
        resetEvents();
    });

    it('#beginRequest() stores requestId in state', function() {
        expect(state.requests).to.not.have.property(detailsOfTracker.requestId);
        beginRequest(detailsOfTracker);
        expect(state.requests).to.have.property(detailsOfTracker.requestId);
    });

    it('#endRequest() removes requestId from state', function () {
        beginRequest(detailsOfTracker);
        beginRequest(detailsOfNonTracker);
        expect(state.requests).to.have.property(detailsOfTracker.requestId);
        expect(state.requests).to.have.property(detailsOfNonTracker.requestId);
        endRequest(detailsOfTracker);
        expect(state.requests).to.not.have.property(detailsOfTracker.requestId);
        expect(state.requests).to.have.property(detailsOfNonTracker.requestId);
    });

    it('#endRequest emits blockedCookie event', function (done) {
        addListener(function (eventObj) {
            expect(eventObj.type).to.be.equal('blockedCookie');
            done();
        });

        beginRequest(detailsOfTracker);
        handleHeadersReceived(detailsOfTracker);
        endRequest(detailsOfTracker);
    });

    it('#handleError() removes requestId from state', function () {
        beginRequest(detailsOfTracker);
        beginRequest(detailsOfNonTracker);
        expect(state.requests).to.have.property(detailsOfTracker.requestId);
        expect(state.requests).to.have.property(detailsOfNonTracker.requestId);
        handleError(detailsOfTracker);
        expect(state.requests).to.not.have.property(detailsOfTracker.requestId);
        expect(state.requests).to.have.property(detailsOfNonTracker.requestId);
    });

    it('#handleSendHeaders() remove cookies', function() {

        beginRequest(detailsOfTracker);

        var res = handleSendHeaders(detailsOfTracker);
        expect(res).to.be.an('object');
        expect(res).to.have.property('requestHeaders');
        expect(res.requestHeaders).to.include.deep.members([detailsOfTracker.requestHeaders[0]])
            .but.not.include.deep.members([detailsOfTracker.requestHeaders[1]]);

    });

    it('#handleSendHeaders() does not remove cookies', function() {

        beginRequest(detailsOfNonTracker);

        var res = handleSendHeaders(detailsOfNonTracker);
        expect(res).to.be.undefined;

    });


    it('#handleHeadersReceived() remove set-cookies', function() {
        beginRequest(detailsOfTracker);

        var res = handleHeadersReceived(detailsOfTracker);
        expect(res).to.be.an('object');
        expect(res).to.have.property('responseHeaders');
        expect(res.responseHeaders).to.include.deep.members([
            detailsOfTracker.responseHeaders[0],
            detailsOfTracker.responseHeaders[2]])
            .but.not.include.deep.members([
                detailsOfTracker.responseHeaders[1],
                detailsOfTracker.responseHeaders[3]
            ]);

    });

    it('#handleHeadersReceived() does not remove set-cookies', function() {
        beginRequest(detailsOfNonTracker);

        var res = handleHeadersReceived(detailsOfNonTracker);
        expect(res).to.be.undefined;

    });



});
