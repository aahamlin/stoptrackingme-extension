/* setup the extension module */
import browser from './browser.js';
import { initTrackingServices } from './services.js';
import requestManager from './requestHandler.js';
import { eventStream, errorStream } from './streams.js';
import { handleBlockingEvent } from './ui.js';
import { handleBlockingEvent as handleHistoryEvent } from './history.js';

const netFilters = {
    urls: ['https://*/*', 'http://*/*'],
};

initTrackingServices().then(registerExtensionListeners);

function registerExtensionListeners(trackingServices) {

    var rm = requestManager(trackingServices);

    // start listening for events
    eventStream.listen(handleBlockingEvent);
    eventStream.listen(handleHistoryEvent);
    errorStream.listen(function(err) {
        const { data } = err;
        console.log('Error occurred:' + data);
    });

    browser.tabs.query({}, function(tabs) {
        var tabId;
        for (let i = 0; i < tabs.length; i++) {
            tabId = tabs[i].id;
            rm.addTab.call(rm, { tabId: tabId });
            rm.updateTab.call(rm, tabId, { url: tabs[i].url }, tabs[i]);
        }
    });

    browser.tabs.onActivated.addListener(rm.addTab.bind(rm));
    browser.tabs.onUpdated.addListener(rm.updateTab.bind(rm));
    browser.tabs.onRemoved.addListener(rm.removeTab.bind(rm));
    browser.tabs.onReplaced.addListener(rm.replaceTab.bind(rm));

    browser.webRequest.onBeforeRequest.addListener(
        rm.beginRequest.bind(rm),
        netFilters,
        ['blocking']
    );

    try {
        browser.webRequest.onBeforeSendHeaders.addListener(
            rm.handleSendHeaders.bind(rm),
            netFilters,
            ['blocking', 'requestHeaders', 'extraHeaders']
        );
    }
    catch (e) {
        // Firefox does not support extraHeaders, while chrome requires them
        browser.webRequest.onBeforeSendHeaders.addListener(
            rm.handleSendHeaders.bind(rm),
            netFilters,
            ['blocking', 'requestHeaders']
        );
    }

    try {
        browser.webRequest.onHeadersReceived.addListener(
            rm.handleHeadersReceived.bind(rm),
            netFilters,
            ['blocking', 'responseHeaders', 'extraHeaders']
        );
    }
    catch (e) {
        // firefox does not support extraHeaders, while chrome requires them
        browser.webRequest.onHeadersReceived.addListener(
            rm.handleHeadersReceived.bind(rm),
            netFilters,
            ['blocking', 'responseHeaders']
        );
    }


    browser.webRequest.onCompleted.addListener(
        rm.endRequest.bind(rm),
        netFilters
    );

    browser.webRequest.onErrorOccurred.addListener(
        rm.handleError.bind(rm),
        netFilters
    );

}
