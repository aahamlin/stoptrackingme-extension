import { EventType } from './requestHandler.js';
import CACHE from './cache.js';
import { saveHistory } from './storage.js';

export const MILLIS_PER_DAY = 86400000;

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
        today = CACHE.get(dateKey) || [0,0,0,0,0,0,0,0];

    today = incrementCount(today, data.category);

    CACHE.set(dateKey, today);

    // todo save history every second until page settles
    saveHistory(CACHE.toObject());
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

// TODO remove after refactoring
/**
 * @param epoch timeStamp
 * @return epoch equal to that date, e.g. June 19, 2020
 */
export function asDateKey(millis) {
    var ret = Math.floor(millis/MILLIS_PER_DAY)*MILLIS_PER_DAY;
    return '' + ret;
}
