import browser from './browser.js';

export function showTotal(str, tabId) {
    var data = { text: str };
    if(tabId) {
        Object.assign(data, { tabId: tabId });
    }
    browser
        .browserAction
        .setBadgeText(data);
};


export { showTotal as default };
