import browser from './browser.js';
import { history } from './state_provider.js';

export function loadHistory() {
    var dateKey = asDateKey(Date.now());

    return new Promise((resolve, reject) => {
        browser.storage.local.get([dateKey], function (result) {
            if (browser.runtime.lastError) {
                reject(browser.runtime.lastError.message);
            }
            history[dateKey] = result[dateKey];
            resolve(history);
        });
    });
}
// TODO: store history
export function saveHistory(_, changeInfo, tab) {
    if (changeInfo.status && tab.status === 'complete') {
        browser.storage.local.set(history, function () {
            if(browser.runtime.lastError) console.warn(browser.runtime.lastError.message);
            //console.log('saved history ' + JSON.stringify(history));
        });
    }
}

// history includes objects { name: "category", count: int }
// events include:
// tabId: req.tabId,
// siteName: req.siteName,
// blockedTime: req.startTime
// category: service.category,
// name: service.name,
// url: service.url,

export function handleBlockingEvent(event) {
    const { type, data } = event;

    var dateKey = asDateKey(data.blockedTime),
        today = {};

    if (history.hasOwnProperty(dateKey)) {
        today = history[dateKey];
    }

    if (type === 'blockedTrackingService') {
        today = incrementCount(today, data.category);
    }
    else if (type === 'blockedThirdPartyCookie') {
        today = incrementCount(today, 'cookie');
    }
    else  {
        //console.log('event type not handled: ' + type, data);
        return;
    }
    history[dateKey] = today;
    //console.log('updated history entry:' + (data.category || 'cookie'), history[dateKey][data.category || 'cookie']);
};

function incrementCount(today, categoryName) {
    var count = 0;

    if (today.hasOwnProperty(categoryName)) {
        count = today[categoryName];
    }
    today[categoryName] = count+1;
    return today;
}

export function asDateKey(millis) {
    var dateTime = new Date(millis);
    return [
        dateTime.getFullYear(),
        pad(dateTime.getMonth()+1),
        pad(dateTime.getDate())
    ].join('-');
}

function pad(num) {
    if(num<10){
        return '0'+num;
    }
    return num;
}
