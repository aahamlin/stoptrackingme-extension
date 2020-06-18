'use strict';

require('./popup.html');

const { Elm } = require('./src/Main.elm');

const app = Elm.Main.init({
    node: document.getElementById('main'),
});

// TODO add ports and browser.storage
