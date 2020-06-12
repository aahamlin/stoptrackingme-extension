import browser from './browser.js';

export default function(str, tabId) {
    var data = { text: str };
    if(tabId) {
        Object.assign(data, { tabId: tabId });
    }
    browser
        .browserAction
        .setBadgeText(data);
};
