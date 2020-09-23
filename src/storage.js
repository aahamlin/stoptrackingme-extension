import browser from './browser.js';

// TODO storage is changing from a summary of a day to individual events.
// consider storing the "cache" as a single keyed item in localstorage.
export function load() {
    return new Promise((resolve, _) => {
        browser.storage.local.get(null, function (result) {
            if (browser.runtime.lastError) {
                console.warn(browser.runtime.lastError.message);
            }
            //console.log('found ' + dateKey + ' = ' + JSON.stringify(result[dateKey]));
            var history = Object.assign({}, result);
            resolve(history);
        });
    });
}

export function save(history) {
    browser.storage.local.set(history, function () {
        if(browser.runtime.lastError) {
            console.warn(browser.runtime.lastError.message);
        }
        //console.log('saved history ' + JSON.stringify(history));
    });
}
