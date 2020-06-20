/* setup the extension module */
import browser from './browser.js';
import { initTrackingServices } from './services.js';
import * as RequestHandler from './requestHandler.js';
import StreamController from './streams.js';
import { handleBlockingEvent } from './ui.js';
import { loadHistory, handleBlockingEvent as handleHistoryEvent } from './history.js';

const netFilters = {
    urls: ['https://*/*', 'http://*/*'],
};

const eventStreamController = StreamController();
const errorStreamController = StreamController();


eventStreamController.stream.listen(handleBlockingEvent);
eventStreamController.stream.listen(handleHistoryEvent);

errorStreamController.stream.listen(function(err) {
    const { data } = err;
    console.log('Error occurred:' + data);
});

loadHistory().then((today) => {
    console.log('history loaded for today', JSON.stringify(today));
}).catch((err) => {
    console.log('loading history failed', err);
}).finally(() => {
    //browser.tabs.onUpdated.addListener(saveHistory);
});

initTrackingServices().then(registerExtensionListeners);

function registerExtensionListeners(trackingServices) {

    RequestHandler.registerTrackingServices(trackingServices);
    RequestHandler.registerEventSinks(
        eventStreamController.sink,
        errorStreamController.sink);

    browser.tabs.query({}, function(tabs) {
        var tabId;
        for (let i = 0; i < tabs.length; i++) {
            tabId = tabs[i].id;
            RequestHandler.addTab({ tabId: tabId });
            RequestHandler.updateTab(tabId, { url: tabs[i].url }, tabs[i]);
        }
    });

    browser.tabs.onActivated.addListener(RequestHandler.addTab);
    browser.tabs.onUpdated.addListener(RequestHandler.updateTab);
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
        // Firefox does not support extraHeaders, while chrome requires them
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

}
