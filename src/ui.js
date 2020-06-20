import browser from './browser.js';
import state from './state_provider.js';

const badgeColor = '#399E5A';

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
    var data = { text: str },
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


export { showTotal as default };
