
import browser from '../src/browser.js';

describe('browser', function () {

    it('should provide all objects required by Web Browser Extension APIs', function () {
        expect(browser).to.be.an('object');
        expect(browser).to.include.all.keys(
            'browserAction',
            'storage',
            'webRequest',
            'extension',
            'runtime'
        );
    });

});
