'use strict';

require('./popup.html');

const { Elm } = require('./src/Main.elm');

const app = Elm.Main.init({
    node: document.getElementById('main'),
});

// TODO add ports and browser.storage
var fakeHistory = [
    { name: "cat1", count: 1 },
    { name: "cat2", count: 2 }
]
setInterval(function () {
    console.log('sending updated history');
    fakeHistory[0].count *= 3;
    fakeHistory[1].count *= 2;
    app.ports.onHistoryChange.send(fakeHistory);
}, 1000);
