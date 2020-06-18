import testData from './helpers/testData.js';
import * as testUtils from './helpers/testUtils.js';
import { configureServices } from '../src/services.js';
import state from '../src/state_provider.js';
import {
    registerTrackingServices,
    registerEventSinks,
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

    var eventSpy, errorSpy;

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

        // todo use spies
        eventSpy = sinon.spy();
        errorSpy = sinon.spy();

        registerEventSinks({add: eventSpy}, {add:errorSpy});

        updateState({
            '1': {
                requests: {},
                totalCount: 0
            }
        });
    });

    afterEach(function () {
        testUtils.clearAllProps(state);
        // some tests have to change these values, make sure use a copy
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

    it('#beginRequest() cancels third-party tracking service request', function () {
        var ret = beginRequest(detailsOfTracker);
        expect(ret).to.have.property('cancel', true);
        // state
        expect(state[1].requests[132]).to.have.property('serviceId');
        expect(state[1].requests[132]).to.have.property('isFirstPartyRequest', false);
        expect(state[1].requests[132]).to.have.property('isAllowedServiceRequest', false);

    });

    it('#beginRequest() does not cancel first-party tracking service request', function () {
        var details = testUtils.copy({}, detailsOfTracker);
        details.initiator = undefined; //'http://63squares.com';
        var ret = beginRequest(details);
        expect(ret).to.be.undefined;
        expect(state[1].requests[132]).to.have.property('isFirstPartyRequest', true);
        expect(state[1].requests[132]).to.have.property('isAllowedServiceRequest', true);
    });

    it('#beginRequest() does not cancel non-tracking request', function () {
        var ret = beginRequest(detailsOfNonTracker);
        expect(ret).to.be.undefined;
    });

    it('#handleSendHeaders() removes third-party cookies', function() {
        updateState({
            1: {
                requests: {
                    127: {
                        requestId: detailsOfNonTracker.requestId
                    },
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
        var details = testUtils.copy({}, detailsOfTracker);
        details.initiator = undefined; //'http://63squares.com';

        updateState({
            1: {
                requests: {
                    132: {
                        requestId: detailsOfTracker.requestId,
                        isFirstPartyRequest: true,
                    },
                }
            }
        });
        expect(handleSendHeaders(details)).to.be.undefined;
    });

    it('#handleSendHeaders() does not remove third-party cookies related to first-party services', function() {
        var details = testUtils.copy({}, detailsOfTracker);
        details.initiator = 'http://63squares.com';
        details.url = 'https://www.i-stats.com/service';

        updateState({
            1: {
                requests: {
                    132: {
                        requestId: detailsOfTracker.requestId,
                        isFirstPartyRequest: false,
                        isAllowedServiceRequest: true,
                    },
                }
            }
        });
        expect(handleSendHeaders(details)).to.be.undefined;
    });


    it('#handleHeadersReceived() removes third-party set-cookies', function() {
        updateState({
            1: {
                requests: {
                    127: {
                        requestId: detailsOfNonTracker.requestId
                    },
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
        var details = testUtils.copy({}, detailsOfTracker);
        details.initiator = undefined; //'http://63squares.com';
        updateState({
            1: {
                requests: {
                    132: {
                        requestId: detailsOfTracker.requestId,
                        isFirstPartyRequest: true,
                    },
                }
            }
        });

        expect(handleHeadersReceived(details)).to.be.undefined;
    });

    it('#handleHeadersReceived() does not remove third-party set-cookies related to first-party services', function() {
        var details = testUtils.copy({}, detailsOfTracker);
        details.initiator = 'http://63squares.com';
        details.url = 'https://www.i-stats.com/service';
        updateState({
            1: {
                requests: {
                    132: {
                        requestId: detailsOfTracker.requestId,
                        isFirstPartyRequest: false,
                        isAllowedServiceRequest: true,
                    },
                }
            }
        });

        expect(handleHeadersReceived(details)).to.be.undefined;
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


    it('#endRequest emits blocked cookie event', function () {
        var startTime = Date.now();
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
        expect(eventSpy.calledOnce).to.be.true;
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

    it('#handleError emits blocked tracker event', function () {
        var startTime = Date.now();
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
        expect(eventSpy.calledOnce).to.be.true;
    });

    it('#handleError emits error event', function () {
        var errorDetails = testUtils.copy({error: 'test error'}, detailsOfTracker);
        var reqState = {};

        reqState[detailsOfTracker.requestId] = {
            requestId: detailsOfTracker.requestId,
            startTime: Date.now(),
            siteName: '1234.g.63squares.com'
        };

        updateState({ 1: { requests: reqState } });
        handleError(errorDetails);

        expect(errorSpy.calledOnce).to.be.true;
    });

});
