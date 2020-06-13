import testData from './helpers/testData.js';
import * as testUtils from './helpers/testUtils.js';
import { configureServices } from '../src/services.js';
import state, { eventStream as stream, errorStream } from '../src/state_provider.js';
import {
    registerTrackingServices,
    addTab,
    removeTab,
    replaceTab,
    beginRequest,
    handleSendHeaders,
    handleHeadersReceived,
    endRequest,
    handleError
} from '../src/requestHandler.js';

describe('requestHandler', function () {

    const detailsOfTracker = {
        tabId: 1,
        requestId: 132,
        initiator: 'https://www.initiator.com/',
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
        initiator: 'https://www.initiator.com/',
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


    function updateState(newState) {
        for(let tabId in newState) {
            if (!state.hasOwnProperty(tabId)) {
                state[tabId] = {};
            }
            state[tabId] = testUtils.copy(state[tabId],
                                          newState[tabId]);
        }
    }

    beforeEach(function () {
        registerTrackingServices(
            configureServices(testData));

        updateState({
            '1': {
                requests: {},
                totalCount: 0
            }
        });

        expect(detailsOfNonTracker.initiator).to.be.equal('https://www.initiator.com/');
        expect(detailsOfTracker.initiator).to.be.equal('https://www.initiator.com/');


    });

    afterEach(function () {
        testUtils.clearAllProps(state);

        if (stream.listeners && stream.listeners.length) {
            stream.listeners = [];
        }

        if (errorStream.listeners && errorStream.listeners.length) {
            errorStream.listeners = [];
        }

        expect(detailsOfNonTracker.initiator).to.be.equal('https://www.initiator.com/');
        expect(detailsOfTracker.initiator).to.be.equal('https://www.initiator.com/');

    });

    it('#addTab creates state[tabId]', function () {
        addTab({tabId: 2});
        expect(state).to.have.property('2');
    });

    it('#removeTab removes state[tabId]', function() {
        removeTab(1);
        expect(state.hasOwnProperty(1)).to.be.false;
    });

    it('#replaceTab() stores state under new id', function () {
        updateState({
            1: {
                requests: {
                    132: {
                        requestId: detailsOfTracker.requestId
                    },
                }
            }
        });
        replaceTab(2, 1);
        expect(state[2]).to.have.property('requests');
        expect(state[2].requests).to.include.property(
            detailsOfTracker.requestId);
        expect(state).to.not.have.property('1');
    });

    it('#beginRequest() stores requestId in state', function() {
        beginRequest(detailsOfTracker);
        expect(state[detailsOfTracker.tabId].requests).to.have.property(detailsOfTracker.requestId);
    });

    it('#beginRequest() cancels tracking service request', function () {
        var ret = beginRequest(detailsOfTracker);
        expect(ret).to.have.property('cancel', true);
        // state
        expect(state[1].requests[132]).to.have.property('serviceId');
    });

    it('#beginRequest() does not cancel first-party tracking service request', function () {
        var details = testUtils.copy({}, detailsOfTracker);
        details.initiator = 'http://63squares.com';
        var ret = beginRequest(details);
        expect(ret).to.be.undefined;
    });

    it('#beginRequest() does not cancel non-tracking service request', function () {
        var ret = beginRequest(detailsOfNonTracker);
        expect(ret).to.be.undefined;
    });

    it('#beginRequest() marks third-party request', function () {
        var ret = beginRequest(detailsOfNonTracker);
        expect(state[1].requests[detailsOfNonTracker.requestId])
            .to.have.property('blockCookies', true);
        expect(ret).to.be.undefined;
    });

    it('#beginRequest() recognizes a first-party request', function () {
        var details = testUtils.copy({}, detailsOfNonTracker);
        details.initiator = 'https://www.safeurl.com';
        var ret = beginRequest(details);
        expect(state[1].requests[detailsOfNonTracker.requestId])
            .to.have.property('blockCookies', false);
        expect(ret).to.be.undefined;
    });

    it('#handleSendHeaders() removes third-party cookies', function() {
        updateState({
            1: {
                requests: {
                    127: {
                        blockCookies: true
                    }
                }
            }
        });


        var res = handleSendHeaders(detailsOfNonTracker);
        expect(res).to.be.an('object');
        expect(res).to.have.property('requestHeaders');
        expect(res.requestHeaders).to.include.deep.members([detailsOfTracker.requestHeaders[0]])
            .but.not.include.deep.members([detailsOfTracker.requestHeaders[1]]);

    });

    it('#handleSendHeaders() does not remove first-party cookies', function() {
        updateState({
            1: {
                requests: {
                    127: {
                        blockCookies: false
                    }
                }
            }
        });

        expect(handleSendHeaders(detailsOfNonTracker)).to.be.undefined;
    });


    it('#handleHeadersReceived() removes third-party set-cookies', function() {
        updateState({
            1: {
                requests: {
                    127: {
                        blockCookies: true
                    }
                }
            }
        });

        var res = handleHeadersReceived(detailsOfNonTracker);
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

    it('#handleHeadersReceived() does not remove first-party set-cookies', function() {
        updateState({
            1: {
                requests: {
                    127: {
                        blockCookies: false
                    }
                }
            }
        });

        expect(handleHeadersReceived(detailsOfNonTracker)).to.be.undefined;
    });

    it('#endRequest() removes requestId from state', function () {
        var reqState = {};
        reqState[detailsOfTracker.requestId] = {
            requestId: detailsOfTracker.requestId,
            startTime: Date.now(),
            siteName: '1234.g.63squares.com'
        };
        reqState[detailsOfNonTracker.requestId] = {
            requestId: detailsOfNonTracker.requestId,
            startTime: Date.now(),
            siteName: 'www.safeurl.com'
        };

        updateState({ 1: { requests: reqState } });
        endRequest(detailsOfTracker);
        expect(state[detailsOfTracker.tabId].requests).to.not.have.property(detailsOfTracker.requestId);
        expect(state[detailsOfNonTracker.tabId].requests).to.have.property(detailsOfNonTracker.requestId);
    });


    it('#endRequest emits blocked cookie event', function (done) {
        var startTime = Date.now();
        stream.listen(function (eventObj) {
            expect(eventObj).to.have.property('type', 'blockedThirdPartyCookie');
            expect(eventObj).to.have.property('data')
                .and.to.deep.include(
                    { tabId: 1, siteName: 'www.safeurl.com', blockedTime: startTime });
            done();
        });

        updateState({
            1: {
                requests: {
                    127: {
                        tabId: 1,
                        requestId: detailsOfNonTracker.requestId,
                        siteName: 'www.safeurl.com',
                        startTime: startTime,
                        blockedThirdPartyCookie: true
                    }
                }
            }
        });


        endRequest(detailsOfNonTracker);

    });

    it('#handleError() removes requestId from state', function () {
        var reqState = {};
        reqState[detailsOfTracker.requestId] = {
            requestId: detailsOfTracker.requestId,
            startTime: Date.now(),
            siteName: '1234.g.63squares.com'
        };
        reqState[detailsOfNonTracker.requestId] = {
            requestId: detailsOfNonTracker.requestId,
            startTime: Date.now(),
            siteName: 'www.safeurl.com'
        };

        updateState({ 1: { requests: reqState } });
        handleError(detailsOfTracker);
        expect(state[detailsOfTracker.tabId].requests).to.not.have.property(detailsOfTracker.requestId);
        expect(state[detailsOfNonTracker.tabId].requests).to.have.property(detailsOfNonTracker.requestId);
    });

    it('#handleError emits blocked tracker event', function (done) {
        var startTime = Date.now();

        stream.listen(function (eventObj) {

            expect(eventObj).to.have.property('type', 'blockedTrackingService');
            expect(eventObj).to.have.property('data').and.to.deep.include(
                    { category: 'Analytics', blockedTime: startTime });
            done();
        });

        updateState({
            1: {
                requests: {
                    132: {
                        requestId: detailsOfTracker.requestId,
                        startTime: startTime,
                        serviceId: '63squares.com',
                        cancelled: true
                    }
                }
            }
        });

        handleError(detailsOfTracker);
    });

    it('#handleError emits error event', function (done) {
        var errorDetails = testUtils.copy({error: 'test error'}, detailsOfTracker);
        var reqState = {};

        reqState[detailsOfTracker.requestId] = {
            requestId: detailsOfTracker.requestId,
            startTime: Date.now(),
            siteName: '1234.g.63squares.com'
        };

        errorStream.listen(function (errObj) {
            expect(errObj).to.deep.equal({type: 'error', data: 'test error'});
            done();
        });

        updateState({ 1: { requests: reqState } });
        handleError(errorDetails);
    });

});
