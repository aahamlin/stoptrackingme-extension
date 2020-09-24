/* setup the extension module */
import browser from './browser.js';
import { initTrackingServices } from './services.js';
import requestManager from './requestHandler.js';
import StreamController from './streams.js';
import { handleBlockingEvent } from './ui.js';
import {
    initHistory, startTimer,
    handleBlockingEvent as handleHistoryEvent
} from './history.js';

const netFilters = {
    urls: ['https://*/*', 'http://*/*'],
};

const storageTimeMs = 1500;

initHistory()
    .then(startTimer(storageTimeMs));

initTrackingServices()
    .then(registerExtensionListeners);

function registerExtensionListeners(trackingServices) {

    var eventStreamController = StreamController(),
        errorsStreamController = StreamController(),
        rm = requestManager(trackingServices, {
            'events': eventStreamController.sink,
            'errors': errorsStreamController.sink
        });

    // start listening for events
    eventStreamController.stream.listen(handleBlockingEvent);
    eventStreamController.stream.listen(handleHistoryEvent);
    errorsStreamController.stream.listen(handleError);

    browser.tabs.query({}, function(tabs) {
        var tabId;
        for (let i = 0; i < tabs.length; i++) {
            tabId = tabs[i].id;
            rm.addTab({ tabId: tabId });
            rm.updateTab(tabId, { url: tabs[i].url }, tabs[i]);
        }
    });

    browser.tabs.onActivated.addListener(rm.addTab);
    browser.tabs.onUpdated.addListener(rm.updateTab);
    browser.tabs.onRemoved.addListener(rm.removeTab);
    browser.tabs.onReplaced.addListener(rm.replaceTab);

    browser.webRequest.onBeforeRequest.addListener(
        rm.beginRequest,
        netFilters,
        ['blocking']
    );

    try {
        browser.webRequest.onBeforeSendHeaders.addListener(
            rm.handleSendHeaders,
            netFilters,
            ['blocking', 'requestHeaders', 'extraHeaders']
        );
    }
    catch (e) {
        // Firefox does not support extraHeaders, while chrome requires them
        browser.webRequest.onBeforeSendHeaders.addListener(
            rm.handleSendHeaders,
            netFilters,
            ['blocking', 'requestHeaders']
        );
    }

    try {
        browser.webRequest.onHeadersReceived.addListener(
            rm.handleHeadersReceived,
            netFilters,
            ['blocking', 'responseHeaders', 'extraHeaders']
        );
    }
    catch (e) {
        // firefox does not support extraHeaders, while chrome requires them
        browser.webRequest.onHeadersReceived.addListener(
            rm.handleHeadersReceived,
            netFilters,
            ['blocking', 'responseHeaders']
        );
    }


    browser.webRequest.onCompleted.addListener(
        rm.endRequest,
        netFilters
    );

    browser.webRequest.onErrorOccurred.addListener(
        rm.handleError,
        netFilters
    );

}

function handleError(err) {
    const { data } = err;
    console.log('Error occurred:' + data);
}
