import browser from './browser.js';
import state from './state_provider.js';

export function handleBlockingEvent(event) {
    const { type, data } = event;

    if(!state.hasOwnProperty(data.tabId)) {
        return;
    }
    if (type === 'blockedTrackingService' || type === 'blockedThirdPartyCookie') {
        state[data.tabId].totalCount += 1;
        showTotal(state[data.tabId].totalCount.toString(),
                  data.tabId);

    }
    else  {
        console.log('event type not handled: ' + type, data);
    }
};


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
