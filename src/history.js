import browser from './browser.js';
import { EventType } from './requestHandler.js';
//import { history } from './state_provider.js';

export const MILLIS_PER_DAY = 86400000;

export const history = {};

export function loadHistory() {
    var dateKey = asDateKey(Date.now());
    return new Promise((resolve, reject) => {
        browser.storage.local.get(dateKey, function (result) {
            if (browser.runtime.lastError) {
                console.warn(browser.runtime.lastError.message);
            }
            //console.log('found ' + dateKey + ' = ' + JSON.stringify(result[dateKey]));
            history[dateKey] = result[dateKey];
            resolve(history);
        });
    });
}

export function saveHistory() {
    browser.storage.local.set(history, function () {
        if(browser.runtime.lastError) {
            console.warn(browser.runtime.lastError.message);
        }
        //console.log('saved history ' + JSON.stringify(history));
    });
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

    if (type !== EventType) {
        return;
    }

    var dateKey = asDateKey(data.blockedTime),
        today = history[dateKey] || [0,0,0,0,0,0,0,0];

    today = incrementCount(today, data.category);

    history[dateKey] = today;
    saveHistory();
};

function incrementCount(today, categoryName) {
    today[getIndex(categoryName)] += 1;
    return today;
}

function getIndex(categoryName) {
    switch (categoryName) {
        case 'Cookie':
            return 0;
        case 'Advertising':
            return 1;
        case 'Analytics':
            return 2;
        case 'Content':
            return 3;
        case 'Cryptomining':
            return 4;
        case 'Disconnect':
        case 'Social':
            return 5;
        case 'Fingerprinting':
            return 6;
        // case 'Social':
        //     return 7;
        default:
            //console.log('Unknown categoryName: ' + categoryName);
            return 7; // Other
    }
}

/**
 * @param epoch timeStamp
 * @return epoch equal to that date, e.g. June 19, 2020
 */
export function asDateKey(millis) {
    var ret = Math.floor(millis/MILLIS_PER_DAY)*MILLIS_PER_DAY;
    return '' + ret;
}
