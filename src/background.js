/* setup the extension module */
import browser from './browser.js';
import fetch from './fetch.js';
import toConfig from './loadTrackers.js';
import { configure } from './tracker.js';
import * as Block from './blockRequests.js';

const netFilters = {
    urls: ['https://*/*', 'http://*/*'],
};

// get extension configuration
fetch(browser.extension.getURL('config/services.json'),
      function(err, text) {
          if (err){
              console.error('Failed to get the configuration: ' + err);
          } else {
              configure(toConfig(JSON.parse(text)));
          }
      });

// register listeners
browser.webRequest.onStartRequest.addListener(
    Block.beginRequest,
    netFilters
);

browser.webRequest.onBeforeSendHeaders.addListener(
    Block.handleSendHeaders,
    netFilters,
    ['blocking', 'requestHeaders', 'extraHeaders']
);

browser.webRequest.onHeadersReceived.addListener(
    Block.handleHeadersReceived,
    netFilters,
    ['blocking', 'responseHeaders', 'extraHeaders']
);


browser.webRequest.onCompleted.addListener(
    Block.endRequest,
    netFilters
);

browser.webRequest.onErrorOccurred.addListener(
    Block.handleError,
    netFilters
);
