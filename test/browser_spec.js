
import browser from '../src/browser.js';

describe('browser', function () {

    it('retrieves global object', function () {
        expect(browser).to.be.an('object');
        expect(browser).to.include.all.keys('browserAction', 'storage', 'webRequest', 'extension');
    });

});
