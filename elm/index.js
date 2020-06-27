'use strict';
// ES 2015 imports
import './popup.html';
import './popup.css';
import browser from '../src/browser.js';
import { Elm } from './src/Main.elm';

const app = Elm.Main.init({
    node: document.getElementById('main'),
});

function sendHistory(history) {
    app.ports.onHistoryChange.send(history);
};

// IMPORTANT: Test environment only!!
/*if (browser && !browser.storage) {
    import('../src/history.js')
        .then((module) => {

            var dateKey = module.asDateKey(Date.now());
            var i,
                fakeHistory = {},
                randomInt = function () {
                    return Math.floor(Math.random()*10);
                },
                repeat = function(n, fn) {
                    var len = 0, arr = [];
                    while(len < n) {
                        arr.push(fn());
                        len++;
                    }
                    return arr;
                };

            for (i = 0; i < 7; i++) {
                if (i>0) {
                    dateKey -= module.MILLIS_PER_DAY;
                }
                //if (i%2==1)
                fakeHistory[dateKey] = repeat(7, randomInt);

            }
            console.log('sending', fakeHistory);
            sendHistory(fakeHistory);

        });

}*/

browser.storage.local.get(null, function(history) {
    //console.warn('sending initial history:' + JSON.stringify(history));
    sendHistory(history);
});

browser.storage.onChanged.addListener(function(changes, storageArea) {
    var key, historyChange = {};

    if (storageArea !== 'local') return;
    // reconstruct the expected history data from the change data
    for (key in changes) {
        historyChange[key] = changes[key].newValue;
        //console.warn('sending history update:' + JSON.stringify(historyChange));
        sendHistory(historyChange);
    }
});
