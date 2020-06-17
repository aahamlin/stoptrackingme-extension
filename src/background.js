/* setup the extension module */
import browser from './browser.js';
import { initTrackingServices } from './services.js';
import * as RequestHandler from './requestHandler.js';

import state, { eventStream, errorStream } from './state_provider.js';
import showTotal from './ui.js';

const netFilters = {
    urls: ['https://*/*', 'http://*/*'],
};

initTrackingServices().then(function (trackingServices) {
    RequestHandler.registerTrackingServices(trackingServices);

    browser.tabs.query({}, function (tabs) {
        for(let i=0; i < tabs.length; i++) {
            RequestHandler.addTab({tabId: tabs[i].id});
        }
    });

    browser.tabs.onActivated.addListener(RequestHandler.addTab);
    browser.tabs.onRemoved.addListener(RequestHandler.removeTab);
    browser.tabs.onReplaced.addListener(RequestHandler.replaceTab);

    browser.webRequest.onBeforeRequest.addListener(
        RequestHandler.beginRequest,
        netFilters,
        ['blocking']
    );

    try {
        browser.webRequest.onBeforeSendHeaders.addListener(
            RequestHandler.handleSendHeaders,
            netFilters,
            ['blocking', 'requestHeaders', 'extraHeaders']
        );
    }
    catch (e) {
        // firefox does not support extraHeaders, while chrome requires them
        browser.webRequest.onBeforeSendHeaders.addListener(
            RequestHandler.handleSendHeaders,
            netFilters,
            ['blocking', 'requestHeaders']
        );
    }

    try {
        browser.webRequest.onHeadersReceived.addListener(
            RequestHandler.handleHeadersReceived,
            netFilters,
            ['blocking', 'responseHeaders', 'extraHeaders']
        );
    }
    catch (e) {
        // firefox does not support extraHeaders, while chrome requires them
        browser.webRequest.onHeadersReceived.addListener(
            RequestHandler.handleHeadersReceived,
            netFilters,
            ['blocking', 'responseHeaders']
        );
    }


    browser.webRequest.onCompleted.addListener(
        RequestHandler.endRequest,
        netFilters
    );

    browser.webRequest.onErrorOccurred.addListener(
        RequestHandler.handleError,
        netFilters
    );

});

// TODO: move stream listener into relevant ui and history modules
eventStream.listen(function(event) {
    const { type, data } = event;
    // TODO: store history
    if (type === 'blockedTrackingService') {
        if(!state.hasOwnProperty(data.tabId)) {
            return;
        }
        state[data.tabId].totalCount += 1;
        showTotal(state[data.tabId].totalCount.toString(),
                  data.tabId);
    }
    else  {
        console.log(type, data);
    }
});

errorStream.listen(function(err) {
    const { data } = err;
    console.warn('Error occurred:' + data);
});
