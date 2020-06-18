import * as testUtils from './helpers/testUtils.js';
import browser from '../src/browser.js';
import state from '../src/state_provider.js';
import setBadgeText, { handleBlockingEvent } from '../src/ui.js';

describe('ui', function () {
    var spyOnBrowserAction;

    beforeEach(function() {
        spyOnBrowserAction = sinon.spy();
        Object.assign(browser.browserAction, {
            setBadgeText: spyOnBrowserAction
        });
    });

    afterEach(function() {
        testUtils.clearAllProps(state);
        sinon.restore();
    });

    it('#setBadgeText() sends object with text property', function () {
        setBadgeText('1');
        expect(spyOnBrowserAction.calledOnceWith({text:'1'})).to.be.true;
    });

    it('#handleBlockingEvent updates badge text', function () {
        // TODO move updateState into testUtils
        testUtils.updateState(state, { 1: { totalCount: 0 }});
        handleBlockingEvent({ type: 'blockedTrackingService', data: { tabId: 1 }});
        handleBlockingEvent({ type: 'blockedThirdPartyCookie', data: { tabId: 1 }});
        handleBlockingEvent({ type: 'unknownType', data: { tabId: 1 }});
        expect(spyOnBrowserAction.calledTwice).to.be.true;
    });
});
