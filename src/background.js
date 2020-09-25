/* setup the extension module */
import browser from './browser.js';
import { initTrackingServices } from './services.js';
import requestHandler from './requestHandler.js';
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
        handler = requestHandler(trackingServices, {
            'events': eventStreamController.sink,
            'errors': errorsStreamController.sink
        });

    // TODO this could all be pushed down into request handler and provide
    // stream properties for events and errors.
    
    // start listening for events
    eventStreamController.stream.listen(handleBlockingEvent);
    eventStreamController.stream.listen(handleHistoryEvent);
    errorsStreamController.stream.listen(handleError);

    browser.tabs.query({}, function(tabs) {
        var tabId;
        for (let i = 0; i < tabs.length; i++) {
            tabId = tabs[i].id;
            handler.addTab({ tabId: tabId });
            handler.updateTab(tabId, { url: tabs[i].url }, tabs[i]);
        }
    });

    browser.tabs.onActivated.addListener(handler.addTab);
    browser.tabs.onUpdated.addListener(handler.updateTab);
    browser.tabs.onRemoved.addListener(handler.removeTab);
    browser.tabs.onReplaced.addListener(handler.replaceTab);

    browser.webRequest.onBeforeRequest.addListener(
        handler.beginRequest,
        netFilters,
        ['blocking']
    );

    try {
        browser.webRequest.onBeforeSendHeaders.addListener(
            handler.handleSendHeaders,
            netFilters,
            ['blocking', 'requestHeaders', 'extraHeaders']
        );
    }
    catch (e) {
        // Firefox does not support extraHeaders, while chrome requires them
        browser.webRequest.onBeforeSendHeaders.addListener(
            handler.handleSendHeaders,
            netFilters,
            ['blocking', 'requestHeaders']
        );
    }

    try {
        browser.webRequest.onHeadersReceived.addListener(
            handler.handleHeadersReceived,
            netFilters,
            ['blocking', 'responseHeaders', 'extraHeaders']
        );
    }
    catch (e) {
        // firefox does not support extraHeaders, while chrome requires them
        browser.webRequest.onHeadersReceived.addListener(
            handler.handleHeadersReceived,
            netFilters,
            ['blocking', 'responseHeaders']
        );
    }


    browser.webRequest.onCompleted.addListener(
        handler.endRequest,
        netFilters
    );

    browser.webRequest.onErrorOccurred.addListener(
        handler.handleError,
        netFilters
    );

}

function handleError(err) {
    const { data } = err;
    console.log('Error occurred:' + data);
}
