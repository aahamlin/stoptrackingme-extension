import fetch from '../src/fetch.js';

describe('fetch', function() {
    var xhr, requests;

    beforeEach(function() {
        xhr = sinon.useFakeXMLHttpRequest();
        requests = [];
        xhr.onCreate = function(req) { requests.push(req); };
    });

    afterEach(function() {
        xhr.restore();
    });

    it('#fetch() returns text', function() {
        const callback = sinon.spy(),
            responseText = JSON.stringify({ 'name': 'value' });

        fetch('chrome://ext/config/config.json', callback);

        expect(requests).to.have.lengthOf(1);

        requests[0].respond(200,
            { "Content-Type": "application/json" },
            responseText);

        expect(callback.calledOnce).to.be.true;
        expect(callback.args[0][0]).to.be.null;
        expect(callback.args[0][1]).to.be.equal(responseText);
    });

    it('#fetch() reports error', function() {
        const callback = sinon.spy(),
            responseText = 'File not found';

        fetch('chrome://ext/invalid/path/config.json', callback);

        expect(callback.notCalled).to.be.true;
        expect(requests).to.have.lengthOf(1);

        //requests[0].error('File not found');
        requests[0].respond(404,
            { "Content-Type": "text/plain" },
            responseText);

        expect(callback.calledOnce).to.be.true;
        expect(callback.getCall(0).args[0]).to.be.equal('404: ' + responseText);

    });
});
