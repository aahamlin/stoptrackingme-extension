import testData from './helpers/testData.js';
import * as testUtils from './helpers/testUtils.js';
import { configureServices } from '../src/services.js';
import { createRequestHandler } from '../src/requestHandler.js';

describe('requestHandler', function() {

    var requestHandler, services, state, eventSpy, errorSpy;

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

        state = {};
        services = configureServices(testData);
        eventSpy = sinon.spy();
        errorSpy = sinon.spy();

        testUtils.updateState(state, {
            '1': {
                requests: {},
                totalCount: 0,
                pageDomain: 'www.initiator.com',
            }
        });

        requestHandler = createRequestHandler(
            services, {
                'state': state,
                'events': { add: eventSpy },
                'errors': { add: errorSpy }
            });

    });

    afterEach(function() {
        // some tests have to change these values, make sure use a copy
        expect(detailsOfNonTracker.initiator).to.be.equal('https://www.initiator.com/');
        expect(detailsOfTracker.initiator).to.be.equal('https://www.initiator.com/');
    });

    it('should record tab by id', function() {
        requestHandler.addTab({ tabId: 2 });
        expect(state).to.have.property('2');
    });

    it('should record domain of tab url', function() {
        //'https://www.initiator.com/'
        var tabInfo = { url: 'https://www.changedurl.com' };
        requestHandler.updateTab(1, tabInfo, tabInfo);
        expect(state[1]).to.have.property('pageDomain', 'www.changedurl.com');
    });

    it('should remove state of tab by id', function() {
        requestHandler.removeTab(1);
        expect(state.hasOwnProperty(1)).to.be.false;
    });

    it('should move state of tab to new id', function() {
        testUtils.updateState(state, {
            1: {
                requests: {
                    132: {
                        requestId: detailsOfTracker.requestId
                    },
                }
            }
        });
        requestHandler.replaceTab(2, 1);
        expect(state[2]).to.have.property('requests');
        expect(state[2].requests).to.include.property(
            detailsOfTracker.requestId);
        expect(state).to.not.have.property('1');
    });

    it('should updates domain of tab url when request begins', function() {
        var details = testUtils.merge({}, detailsOfNonTracker);
        details.initiator = undefined;
        requestHandler.beginRequest(details);
        expect(state[detailsOfTracker.tabId]).to.have.property('pageDomain', 'www.safeurl.com');
    });


    it('should record requestId when request begins', function() {
        requestHandler.beginRequest(detailsOfNonTracker);
        expect(state[detailsOfNonTracker.tabId].requests).to.have.property(detailsOfNonTracker.requestId);
    });

    it('should cancel third-party tracking request', function() {
        var ret = requestHandler.beginRequest(detailsOfTracker);
        expect(ret).to.have.property('cancel', true);
    });

    it('should not cancel first-party service request', function() {
        var details = testUtils.merge({}, detailsOfTracker);
        // browser requests with initiator of undefined or 'null' are first-party
        details.initiator = undefined;
        var ret = requestHandler.beginRequest(details);
        expect(ret).to.be.undefined;
    });

    it('#should not cancel first-party service request', function() {
        var details = testUtils.merge({}, detailsOfTracker);
        // browsers requests with initiator of undefined or 'null' are first-party
        details.initiator = 'null'; // sets first party to clearspring.com
        details.url = 'https://www.clearspring.com';
        var ret = requestHandler.beginRequest(details);
        expect(ret).to.be.undefined;
    });

    it('should not cancel third-party service request from first-party service', function() {
        testUtils.updateState(state,{
            1: { pageDomain: 'www.addthiscdn.com' }  // first-party of AddThis service
        });
        var details = testUtils.merge({}, detailsOfTracker);
        details.initiator = 'https://www.addthiscdn.com'; //first-party of AddThis service
        details.url = 'https://www.clearspring.com'; // third-party of AddThis service
        var ret = requestHandler.beginRequest(details);
        expect(ret).to.be.undefined;
    });


    it('should not cancel non-tracking request', function() {
        var ret = requestHandler.beginRequest(detailsOfNonTracker);
        expect(ret).to.be.undefined;
    });

    it('should not remove first-party cookies', function () {
        var details = testUtils.merge({}, detailsOfNonTracker);
        details.initiator = undefined;
        requestHandler.beginRequest(details);
        var res = requestHandler.handleSendHeaders(details);
        expect(res).to.be.undefined;
    });

    it('should not removed third-party cookies', function() {
        requestHandler.beginRequest(detailsOfNonTracker);
        var res = requestHandler.handleSendHeaders(detailsOfNonTracker);
        expect(res).to.be.an('object');
        expect(res).to.have.property('requestHeaders');
        expect(res.requestHeaders).to.include.deep.members([detailsOfTracker.requestHeaders[0]])
            .but.not.include.deep.members([detailsOfTracker.requestHeaders[1]]);

    });

    it('should not remove cookies from first-party service request', function() {
        var details = testUtils.merge({}, detailsOfTracker);
        // browsers requests with initiator of undefined or 'null' are first-party
        details.initiator = undefined;
        var ret = requestHandler.beginRequest(details);
        expect(ret).to.be.undefined;
        expect(requestHandler.handleSendHeaders(details)).to.be.undefined;
    });

    it('should not remove third-party cookies from first-party services', function() {
        testUtils.updateState(state,{
            1: { pageDomain: '63squares.com' }  // first-party of AddThis service
        });
        var details = testUtils.merge({}, detailsOfTracker);
        // browsers requests with initiator of undefined or 'null' are first-party
        details.initiator = 'null';
        details.url = 'https://www.i-stats.com/service';
        var ret = requestHandler.beginRequest(details);
        expect(ret).to.be.undefined;
        expect(requestHandler.handleSendHeaders(details)).to.be.undefined;
    });

    it('should not remove first-party cookies', function () {
        var details = testUtils.merge({}, detailsOfNonTracker);
        // browsers requests with initiator of undefined or 'null' are first-party
        details.initiator = undefined;
        requestHandler.beginRequest(details);
        var res = requestHandler.handleHeadersReceived(details);
        expect(res).to.be.undefined;
    });

    it('should remove third-party set-cookies', function() {
        requestHandler.beginRequest(detailsOfNonTracker);
        var res = requestHandler.handleHeadersReceived(detailsOfNonTracker);
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

    it('should not remove set-cookies from first-party service', function() {
        var details = testUtils.merge({}, detailsOfTracker);
        // browsers requests with initiator of undefined or 'null' are first-party
        details.initiator = undefined;
        var ret = requestHandler.beginRequest(details);
        expect(ret).to.be.undefined;
        expect(requestHandler.handleHeadersReceived(details)).to.be.undefined;
    });

    it('should remove third-party set-cookies from first-party services', function() {
        testUtils.updateState(state,{
            1: { pageDomain: '63squares.com' }  // first-party of AddThis service
        });
        var details = testUtils.merge({}, detailsOfTracker);
        // browsers requests with initiator of undefined or 'null' are first-party
        details.initiator = 'null';
        details.url = 'https://www.i-stats.com/service';
        var ret = requestHandler.beginRequest(details);
        expect(ret).to.be.undefined;
        expect(requestHandler.handleHeadersReceived(details)).to.be.undefined;
    });


    it('should remove requestId when request ends', function() {
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
        requestHandler.endRequest(detailsOfTracker);
        expect(state[detailsOfTracker.tabId].requests).to.not.have.property(detailsOfTracker.requestId);
        expect(state[detailsOfNonTracker.tabId].requests).to.have.property(detailsOfNonTracker.requestId);
    });


    it('should emit event of blocked third-party cookies', function() {
        var details = testUtils.merge({}, detailsOfNonTracker);
        requestHandler.beginRequest(details);
        requestHandler.handleSendHeaders(details);
        requestHandler.handleHeadersReceived(details);
        requestHandler.endRequest(details);
        expect(eventSpy.calledOnce).to.be.true;
    });

    it('should removes requestId when an error occurs', function() {
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
        requestHandler.handleError(detailsOfTracker);
        expect(state[detailsOfTracker.tabId].requests).to.not.have.property(detailsOfTracker.requestId);
        expect(state[detailsOfNonTracker.tabId].requests).to.have.property(detailsOfNonTracker.requestId);
    });

    it('should emit event of blocked tracker', function() {
        var details = testUtils.merge({}, detailsOfTracker);
        requestHandler.beginRequest(details);
        requestHandler.handleSendHeaders(details);
        requestHandler.handleHeadersReceived(details);
        requestHandler.handleError(details);
        expect(eventSpy.calledOnce).to.be.true;
    });

    it('should emit error event when an error occurs', function() {
        var errorDetails = testUtils.merge({ error: 'test error' }, detailsOfTracker);
        var reqState = {};

        reqState[detailsOfTracker.requestId] = {
            requestId: detailsOfTracker.requestId,
            startTime: Date.now(),
            requestDomain: '1234.g.63squares.com'
        };

        testUtils.updateState(state, { 1: { requests: reqState } });
        requestHandler.handleError(errorDetails);
        expect(errorSpy.calledOnce).to.be.true;
    });

});
