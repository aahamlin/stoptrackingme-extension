/* setup the extension module */
import browser from './browser.js';
import { initTrackingServices } from './services.js';
import requestManager from './requestHandler.js';
import StreamController from './streams.js';
import { handleBlockingEvent } from './ui.js';
import { /*loadHistory,*/ handleBlockingEvent as handleHistoryEvent } from './history.js';

const netFilters = {
    urls: ['https://*/*', 'http://*/*'],
};

const eventStreamController = StreamController();
const errorStreamController = StreamController();

// refactor?
eventStreamController.stream.listen(handleBlockingEvent);
eventStreamController.stream.listen(handleHistoryEvent);

errorStreamController.stream.listen(function(err) {
    const { data } = err;
    console.log('Error occurred:' + data);
});

// goal of this refactor is to save history differently allowing the UI to display in local timezone
// timezones can be wicked, hour and half-hour must be accounted for. Therefore, we can save the
// history in 1 minute intervals, allowing the UI (elm) to reduce the entries to accurate timezones.
// rather than a history per day holding counts of categories, e.g.'date': [1,2,1,2,1,2,1]
// let's cache category:[millis,millis,...]
// then a task will run on a 1 sec interval and update the history object
// with all new category counts to the respective minute.
// this new routine should not require loading the history here.
/*loadHistory().then((today) => {
    console.log('history loaded for today', JSON.stringify(today));
}).catch((err) => {
    console.log('loading history failed', err);
}).finally(() => {
    //browser.tabs.onUpdated.addListener(saveHistory);
});*/

initTrackingServices().then(registerExtensionListeners);

function registerExtensionListeners(trackingServices) {

    var rm = requestManager(trackingServices);
    rm.registerEventSinks(eventStreamController.sink, errorStreamController.sink);


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
