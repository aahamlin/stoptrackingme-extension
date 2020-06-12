import testData from './testData.js';
import toConfig from '../src/loadTrackers.js';


describe('loadTracker', function() {
    it('#toConfig() load services.json into config object', function() {

        var config = toConfig(testData.services);
        //console.log('config', config);
        expect(config).to.have.nested.property('trackers.2leep\\.com');
        expect(config).to.not.have.nested.property('trackers.nothing-to-see');
        expect(config).to.have.deep.nested.property('trackers.xgraph\\.net', {
            category: 'Social', name: 'AddThis', url: 'http://www.addthis.com/'});
    });
});
