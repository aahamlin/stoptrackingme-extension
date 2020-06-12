import testData from './testData.js';
import asTracker, { configure, clear_all, get_config_value } from '../src/tracker.js';

describe('tracker', function() {

    beforeEach(function () {
        configure(testData.config);
    });

    afterEach(function () {
        clear_all();
        expect(get_config_value('trackers')).to.be.undefined;
        expect(get_config_value('dummy_value')).to.be.undefined;
        expect(get_config_value('dummy_value_2')).to.be.undefined;
    });


    // config is a singleton that will persist for the life of the runtime env
    it('#configure() stores value', function() {
        expect(get_config_value('dummy_value')).to.be.undefined;
        configure({ 'dummy_value': 42 });
        expect(get_config_value('dummy_value')).to.be.equal(42);
    });

    it('#configure() updates value', function () {
        configure({'dummy_value_2': 'hello'});
        expect(get_config_value('dummy_value_2')).to.be.equal('hello');
        configure({'dummy_value_2': 'bye'});
        expect(get_config_value('dummy_value_2')).to.be.equal('bye');
     });

    it('#asTracker() returns tracker', function () {
        var tracker = asTracker('https://www.63squares.com/foo');
        expect(tracker).to.deep.equal({
            category: 'Analytics', name: '63 Squares', url: 'http://63squares.com'
        });
    });

    it('#asTracker() returns undefined', function () {
        expect(asTracker('https://www.safenet.com/foo')).to.be.undefined;
    });


    it('#asTracker() in subdomain returns tracker on subdomain', function () {
        expect(asTracker('https://tracker.somewhere.com/foo')).to.deep.equal({
            category: 'Fingerprinting',
            name: 'Somewhere Fake',
            url: 'http://www.somewhere.com'
        });
    });

    it('#asTracker() in subdomain returns undefined on domain', function () {
        expect(asTracker('https://www.somewhere.com/foo')).to.be.undefined;
    });

    it('#asTracker() returns undefined on malformed serverName', function() {
        expect(asTracker('https://.www.safenet.com./foo')).to.be.undefined;
    });

});
