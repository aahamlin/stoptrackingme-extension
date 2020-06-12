import browser from '../src/browser.js';
import setBadgeText from '../src/ui.js';

describe('ui', function () {
    var spyOnBrowserAction;

    beforeEach(function() {
        spyOnBrowserAction = sinon.spy();
        Object.assign(browser.browserAction, {
            setBadgeText: spyOnBrowserAction
        });
    });

    afterEach(function() {
        sinon.restore();
    });

    it('#setBadgeText() sends object with text property', function () {
        setBadgeText('1');
        expect(spyOnBrowserAction.calledOnceWith({text:'1'})).to.be.true;
    });
});
