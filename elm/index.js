'use strict';
// ES 2015 imports
import './popup.html';
import browser from '../src/browser.js';
import { Elm } from './src/Main.elm';

const app = Elm.Main.init({
    node: document.getElementById('main'),
});

function sendHistory(history) {
    app.ports.onHistoryChange.send(history);
};

browser.storage.local.get(null, function (history) {
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
