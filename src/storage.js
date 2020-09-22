import browser from './browser.js';

// TODO phase 2: history is changing from a summary of a day individual events.
export function loadHistory(dateKey) {
    //var dateKey = asDateKey(Date.now());
    return new Promise((resolve, _) => {
        browser.storage.local.get(dateKey, function (result) {
            if (browser.runtime.lastError) {
                console.warn(browser.runtime.lastError.message);
            }
            //console.log('found ' + dateKey + ' = ' + JSON.stringify(result[dateKey]));
            var history = (dateKey in result) ? Object.assign({}, result) : {};
            resolve(history);
        });
    });
}

export function saveHistory(history) {
    browser.storage.local.set(history, function () {
        if(browser.runtime.lastError) {
            console.warn(browser.runtime.lastError.message);
        }
        //console.log('saved history ' + JSON.stringify(history));
    });
}
