import browser from './browser.js';

// TODO phase 2: history is changing from a summary of a day individual events.
export function loadHistory() {
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

export function saveHistory(history) {
    browser.storage.local.set(history, function () {
        if(browser.runtime.lastError) {
            console.warn(browser.runtime.lastError.message);
        }
        //console.log('saved history ' + JSON.stringify(history));
    });
}
