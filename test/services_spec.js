import testData from './helpers/testData.js';
import browser from '../src/browser.js';
import {
    lookup,
    initTrackingServices,
    configureServices } from '../src/services.js';

describe('services', function () {

    var xhr, requests, getURLSpy;

    beforeEach(function() {
        xhr = sinon.useFakeXMLHttpRequest();
        requests = [];
        xhr.onCreate = function(req) { requests.push(req); };

        getURLSpy = sinon.spy();
        Object.assign(browser.extension, {
            getURL: getURLSpy
        });
    });

    afterEach(function () {
        xhr.restore();
    });

    it('should configure services from resource file', function () {
        var spy = sinon.spy(configureServices);
        initTrackingServices();
        requests[0].respond(200, { "Content-Type": "application/json" },
                            JSON.stringify(testData));
        expect(getURLSpy.calledOnce);
        expect(spy.calledOnce);

    });

    it('should populate services from parsed data', function () {
        var services = configureServices(testData);
        expect(services).to.have.property('2leep.com').and.to.be.an('object');
        expect(services).to.not.have.property('nothing-to-see.com');
        expect(services).to.have.property('xgraph.net').and.to.deep.equal(
            {category: 'Social', name: 'AddThis', url: 'http://www.addthis.com/'});
    });

    it('should lookup a valid serviceId', function () {
        var services = configureServices(testData);
        // key: 2leep.com
        expect(lookup(services, '2leep.com')).to.be.equal('2leep.com');
        expect(lookup(services, 'www.2leep.com')).to.be.equal('2leep.com');
        expect(lookup(services, 'api.2leep.com')).to.be.equal('2leep.com');
        expect(lookup(services, 'foo.bar.2leep.com')).to.be.equal('2leep.com');
        // non-key: safeurl.com
        expect(lookup(services, 'safeurl.com')).to.be.undefined;
        expect(lookup(services, '.com'))
    });

    it('should validate lookup args', function () {
        var services = configureServices(testData);
        expect(() => lookup()).to.throw(/provide services/);
        expect(() => lookup(services)).to.throw(/provide servername/);
        expect(() => lookup(services, 1)).to.throw(/provide servername/);
        expect(() => lookup(services, true)).to.throw(/provide servername/);
        expect(() => lookup(services, {})).to.throw(/provide servername/);
        expect(() => lookup(services, ()=>{})).to.throw(/provide servername/);
    });

});
