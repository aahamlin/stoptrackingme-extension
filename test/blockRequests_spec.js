import { configure, clear_all } from '../src/tracker.js';

// TODO add other imports
import testData from './testData.js';
import state from '../src/state_provider.js';
import { beginRequest,
         handleSendHeaders,
         handleHeadersReceived,
         endRequest,
         handleError
       } from '../src/blockRequests.js';

describe('blockRequests', function () {

    beforeEach(function () {
        configure(testData.config);
        Object.assign(state, {
            requests: [],
            totalCount: 0
        });
    });

    afterEach(function () {
        clear_all();
    });

    it('#handleSendHeaders() remove cookies', function() {
        const details = {
            tabId: 1,
            requestId: 132,
            url: "https://1234.g.63squares.com/trackme?foo=bar",
            requestHeaders: [
                { name: 'User-Agent', value: 'My user agent' },
                { name: "Cookie", value: "ABC=123;XYZ=789;" }
            ]
        };

        beginRequest(details);

        var res = handleSendHeaders(details);
        expect(res).to.be.an('object');
        expect(res).to.have.property('requestHeaders');
        expect(res.requestHeaders).to.include.deep.members([details.requestHeaders[0]])
            .but.not.include.deep.members([details.requestHeaders[1]]);

    });

    it('#handleSendHeaders() does not remove cookies', function() {
        const details = {
            tabId: 1,
            requestId: 132,
            url: "https://www.safeurl.com?foo=bar",
            requestHeaders: [
                { name: 'User-Agent', value: 'My user agent' },
                { name: "Cookie", value: "ABC=123;XYZ=789;" }
            ]
        };

        beginRequest(details);

        var res = handleSendHeaders(details);
        expect(res).to.be.undefined;

    });

});
