import { EventType } from './requestHandler.js';
import CACHE from './cache.js';
import * as Storage from './storage.js';

export function initHistory() {
    return new Promise((resolve, _) => {
        Storage.load()
            .then(stored => {
                for(var key in stored) {
                    CACHE.set(key, stored[key]);
                }
                resolve();
            });
    });
}

export const MILLIS_PER_DAY = 86400000;

export function handleBlockingEvent(event) {
    const { type, data } = event;

    if (type !== EventType) {
        return;
    }

    var dateKey = asDateKey(data.blockedTime),
        today = CACHE.get(dateKey) || [0,0,0,0,0,0,0,0];

    today = incrementCount(today, data.category);

    CACHE.set(dateKey, today);
};

export function startTimer(timeout) {
    const timer = setInterval(
        saveCacheToDisk,
        timeout);
    return timer;
}

export function stopTimer(timerFn) {
    clearInterval(timerFn);
}

var lastUpdateTime = 0;

function saveCacheToDisk() {
    var latestUpdateTime = CACHE.lastUpdate();
    if (latestUpdateTime > lastUpdateTime) {
        Storage.save(CACHE.toObject());
        lastUpdateTime = latestUpdateTime;
    }
}

function incrementCount(today, categoryName) {
    today[getIndex(categoryName)] += 1;
    return today;
}


// TODO truncate the categories, there are too many
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
        default:
            //console.log('Unknown categoryName: ' + categoryName);
            return 7; // Other
    }
}

// TODO remove after refactoring from aggregate to individual events
/**
 * @param epoch timeStamp
 * @return epoch equal to that date, e.g. June 19, 2020
 */
export function asDateKey(millis) {
    var ret = Math.floor(millis/MILLIS_PER_DAY)*MILLIS_PER_DAY;
    return '' + ret;
}
