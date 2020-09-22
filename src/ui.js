import browser from './browser.js';
import { EventType } from './requestHandler.js';

const badgeColor = '#399E5A';

export function handleBlockingEvent(event) {
    const { type, data } = event;

    if (type !== EventType) {
        return;
    }
    showTotal(data.totalCount, data.tabId);
};


function showTotal(count, tabId) {
    var data = { text: count.toString() },
        color = { color: badgeColor };

    if(tabId) {
        Object.assign(data, { tabId: tabId });
        Object.assign(color, { tabId: tabId });
    }
    browser
        .browserAction
        .setBadgeBackgroundColor(color);
    browser
        .browserAction
        .setBadgeText(data);
};

export { handleBlockingEvent as default };
