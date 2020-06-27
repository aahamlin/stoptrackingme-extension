import testData from './helpers/testData.js';
import * as testUtils from './helpers/testUtils.js';
import { configureServices } from '../src/services.js';
import state from '../src/state_provider.js';
import {
    registerTrackingServices,
    registerEventSinks,
    addTab,
    updateTab,
    removeTab,
    replaceTab,
    beginRequest,
    handleSendHeaders,
    handleHeadersReceived,
    endRequest,
    handleError
} from '../src/requestHandler.js';

describe('requestHandler', function() {

    var eventSpy, errorSpy;

    const detailsOfTracker = {
        tabId: 1,
        requestId: 132,
        initiator: 'https://www.initiator.com/',
        url: "https://1234.g.63squares.com/trackme?foo=bar",
        timeStamp: Date.now(),
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
        timeStamp: Date.now(),
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

    beforeEach(function() {
        registerTrackingServices(
            configureServices(testData));

        // todo use spies
        eventSpy = sinon.spy();
        errorSpy = sinon.spy();

        registerEventSinks({ add: eventSpy }, { add: errorSpy });

        testUtils.updateState(state, {
            '1': {
                requests: {},
                totalCount: 0,
                pageDomain: 'www.initiator.com',
            }
        });
    });

    afterEach(function() {
        testUtils.clearAllProps(state);
        // some tests have to change these values, make sure use a copy
        expect(detailsOfNonTracker.initiator).to.be.equal('https://www.initiator.com/');
        expect(detailsOfTracker.initiator).to.be.equal('https://www.initiator.com/');
    });

    it('#addTab creates state[tabId]', function() {
        addTab({ tabId: 2 });
        expect(state).to.have.property('2');
    });

    it('#updateTab sets state#pageDomain', function() {
        //'https://www.initiator.com/'
        var tabInfo = { url: 'https://www.changedurl.com' };
        updateTab(1, tabInfo, tabInfo);
        expect(state[1]).to.have.property('pageDomain', 'www.changedurl.com');
    });

    it('#removeTab removes state[tabId]', function() {
        removeTab(1);
        expect(state.hasOwnProperty(1)).to.be.false;
    });

    it('#replaceTab() stores state under new id', function() {
        testUtils.updateState(state, {
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

    it('#beginRequest() updates state#pageDomain', function() {
        var details = testUtils.merge({}, detailsOfNonTracker);
        details.initiator = undefined;
        beginRequest(details);
        expect(state[detailsOfTracker.tabId]).to.have.property('pageDomain', 'www.safeurl.com');
    });


    it('#beginRequest() stores requestId in state', function() {
        beginRequest(detailsOfNonTracker);
        expect(state[detailsOfNonTracker.tabId].requests).to.have.property(detailsOfNonTracker.requestId);
    });

    it('#beginRequest() cancels third-party tracking service request', function() {
        var ret = beginRequest(detailsOfTracker);
        expect(ret).to.have.property('cancel', true);
    });

    it('#beginRequest() does not cancel first-party service request https://63squares.com', function() {
        var details = testUtils.merge({}, detailsOfTracker);
        details.initiator = undefined; //'http://63squares.com';
        var ret = beginRequest(details);
        expect(ret).to.be.undefined;
    });

    it('#beginRequest() does not cancel first-party service request to https://www.clearspring.com', function() {
        var details = testUtils.merge({}, detailsOfTracker);
        details.initiator = 'null'; // sets first party to clearspring.com
        details.url = 'https://www.clearspring.com';
        var ret = beginRequest(details);
        expect(ret).to.be.undefined;
    });

    it('#beginRequest() does not cancel third-party service request from first-party service', function() {
        testUtils.updateState(state,{
            1: { pageDomain: 'www.addthiscdn.com' }  // first-party of AddThis service
        });
        var details = testUtils.merge({}, detailsOfTracker);
        details.initiator = 'https://www.addthiscdn.com'; //first-party of AddThis service
        details.url = 'https://www.clearspring.com'; // third-party of AddThis service
        var ret = beginRequest(details);
        expect(ret).to.be.undefined;
    });


    it('#beginRequest() does not cancel non-tracking request', function() {
        var ret = beginRequest(detailsOfNonTracker);
        expect(ret).to.be.undefined;
    });

    it('#handleSendHeaders() does not remove first-party cookies', function () {
        var details = testUtils.merge({}, detailsOfNonTracker);
        details.initiator = undefined;
        beginRequest(details);
        var res = handleSendHeaders(details);
        expect(res).to.be.undefined;
    });

    it('#handleSendHeaders() removes third-party cookies', function() {
        beginRequest(detailsOfNonTracker);
        var res = handleSendHeaders(detailsOfNonTracker);
        expect(res).to.be.an('object');
        expect(res).to.have.property('requestHeaders');
        expect(res.requestHeaders).to.include.deep.members([detailsOfTracker.requestHeaders[0]])
            .but.not.include.deep.members([detailsOfTracker.requestHeaders[1]]);

    });

    it('#handleSendHeaders() does not remove cookies from first-party service request to http://63squares.com', function() {
        var details = testUtils.merge({}, detailsOfTracker);
        details.initiator = undefined; //'http://63squares.com';
        var ret = beginRequest(details);
        expect(ret).to.be.undefined;
        expect(handleSendHeaders(details)).to.be.undefined;
    });

    it('#handleSendHeaders() does not remove third-party cookies from first-party services', function() {
        testUtils.updateState(state,{
            1: { pageDomain: '63squares.com' }  // first-party of AddThis service
        });
        var details = testUtils.merge({}, detailsOfTracker);
        details.initiator = 'null';
        details.url = 'https://www.i-stats.com/service';
        var ret = beginRequest(details);
        expect(ret).to.be.undefined;
        expect(handleSendHeaders(details)).to.be.undefined;
    });

    it('#handleHeadersReceived() does not remove first-party cookies', function () {
        var details = testUtils.merge({}, detailsOfNonTracker);
        details.initiator = undefined;
        beginRequest(details);
        var res = handleHeadersReceived(details);
        expect(res).to.be.undefined;
    });

    it('#handleHeadersReceived() removes third-party set-cookies', function() {
        beginRequest(detailsOfNonTracker);
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

    it('#handleHeadersReceived() does not remove set-cookies from first-party service request to http://63squares.com', function() {
        var details = testUtils.merge({}, detailsOfTracker);
        details.initiator = undefined; //'http://63squares.com';
        var ret = beginRequest(details);
        expect(ret).to.be.undefined;
        expect(handleHeadersReceived(details)).to.be.undefined;
    });

    it('#handleHeadersReceived() does not remove third-party set-cookies from first-party services', function() {
        testUtils.updateState(state,{
            1: { pageDomain: '63squares.com' }  // first-party of AddThis service
        });
        var details = testUtils.merge({}, detailsOfTracker);
        details.initiator = 'null';
        details.url = 'https://www.i-stats.com/service';
        var ret = beginRequest(details);
        expect(ret).to.be.undefined;
        expect(handleHeadersReceived(details)).to.be.undefined;
    });

    it('#endRequest() removes requestId from state', function() {
        var reqState = {};
        reqState[detailsOfTracker.requestId] = {
            requestId: detailsOfTracker.requestId,
            startTime: Date.now(),
            requestDomain: '1234.g.63squares.com'
        };
        reqState[detailsOfNonTracker.requestId] = {
            requestId: detailsOfNonTracker.requestId,
            startTime: Date.now(),
            requestDomain: 'www.safeurl.com'
        };

        testUtils.updateState(state, { 1: { requests: reqState } });
        endRequest(detailsOfTracker);
        expect(state[detailsOfTracker.tabId].requests).to.not.have.property(detailsOfTracker.requestId);
        expect(state[detailsOfNonTracker.tabId].requests).to.have.property(detailsOfNonTracker.requestId);
    });


    it('#endRequest emits blocked cookie event', function() {
        var details = testUtils.merge({}, detailsOfNonTracker);
        beginRequest(details);
        handleSendHeaders(details);
        handleHeadersReceived(details);
        endRequest(details);
        expect(eventSpy.calledOnce).to.be.true;
    });

    it('#handleError() removes requestId from state', function() {
        var reqState = {};
        reqState[detailsOfTracker.requestId] = {
            requestId: detailsOfTracker.requestId,
            startTime: Date.now(),
            requestDomain: '1234.g.63squares.com'
        };
        reqState[detailsOfNonTracker.requestId] = {
            requestId: detailsOfNonTracker.requestId,
            startTime: Date.now(),
            requestDomain: 'www.safeurl.com'
        };

        testUtils.updateState(state, { 1: { requests: reqState } });
        handleError(detailsOfTracker);
        expect(state[detailsOfTracker.tabId].requests).to.not.have.property(detailsOfTracker.requestId);
        expect(state[detailsOfNonTracker.tabId].requests).to.have.property(detailsOfNonTracker.requestId);
    });

    it('#handleError emits blocked tracker event', function() {
        var details = testUtils.merge({}, detailsOfTracker);
        beginRequest(details);
        handleSendHeaders(details);
        handleHeadersReceived(details);
        handleError(details);
        expect(eventSpy.calledOnce).to.be.true;
    });

    it('#handleError emits error event', function() {
        var errorDetails = testUtils.merge({ error: 'test error' }, detailsOfTracker);
        var reqState = {};

        reqState[detailsOfTracker.requestId] = {
            requestId: detailsOfTracker.requestId,
            startTime: Date.now(),
            requestDomain: '1234.g.63squares.com'
        };

        testUtils.updateState(state, { 1: { requests: reqState } });
        handleError(errorDetails);
        expect(errorSpy.calledOnce).to.be.true;
    });

});
