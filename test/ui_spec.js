import browser from '../src/browser.js';
import { EventType } from '../src/requestHandler.js';
import handleBlockingEvent from '../src/ui.js';

describe('ui', function () {
    var spySetBadgeText, spySetBgColor;

    beforeEach(function() {
        spySetBadgeText = sinon.spy();
        spySetBgColor = sinon.spy();
        Object.assign(browser.browserAction, {
            setBadgeText: spySetBadgeText,
            setBadgeBackgroundColor: spySetBgColor,
        });
    });

    afterEach(function() {
        sinon.restore();
    });

    it('#handleBlockingEvent updates badge text', function () {
        handleBlockingEvent({ type: EventType, data: { tabId: 1, totalCount: 2 }});
        sinon.assert.calledWith(spySetBadgeText, sinon.match.has("text", "2"));
    });

    it('#handleBlockingEvent updates badge color', function () {
        handleBlockingEvent({ type: EventType, data: { tabId: 1, totalCount: 2 }});
        sinon.assert.calledWith(spySetBgColor, sinon.match.has("color", sinon.match.string));
    });

    it('#handleBlockingEvent ignores other events', function () {
        handleBlockingEvent({ type: 'foo', data: 1 });
        sinon.assert.notCalled(spySetBadgeText);
        sinon.assert.notCalled(spySetBgColor);
    });
});
