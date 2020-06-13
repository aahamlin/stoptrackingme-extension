import { lookup } from './services.js';
import { Sink } from './streams.js';
import state, { eventStream, errorStream } from './state_provider.js';

const eventSink = Sink(eventStream);

const errorSink = Sink(errorStream);

const services = {};

/**
 * register known tracking services with the request module.
 *
 * previously registered services are removed.
 *
 * @param @object containing service definitions.
 */
export function registerTrackingServices(trackingServices) {
    for(let old in services) { delete services[old]; }
    for(let service in trackingServices) {
        services[service] = trackingServices[service];
    }
}


export function addTab(info) {
    const { tabId } = info;
    if(!state.hasOwnProperty(tabId)) {
        state[tabId] = {
            tabId: tabId,
            requests: {},
            totalCount: 0
        };
    }
}

// export function updateTab(tabId, info, tab) {
//     console.log('updated ' + tabId, info);
//     if(!state.hasOwnProperty(tabId)) {
//         return;
//     }

//     if (info.status) {
//         console.log('tabId ' + tabId + ' status = ' + tab.status, info);
//     }

//     if(info.url) {
//         state[tabId].siteName = getDomain(tab.url);
//     }
//     else if (info.pendingUrl) {
//         state[tabId].siteName = getDomain(tab.pendingUrl);
//     }
// }

export function removeTab(tabId, info) {
    if(state.hasOwnProperty(tabId)) {
        delete state[tabId];
    }
}

export function replaceTab(newTabId, oldTabId) {
    if(state.hasOwnProperty(oldTabId)) {
        state[newTabId] = state[oldTabId];
        delete state[oldTabId];
    }
}

function getDomain(url) {
    return new URL(url).hostname;
}

export function beginRequest(details) {
    const { tabId, requestId } = details;

    // shouldn't re-enter, but place holder for tabId handling
    if (!state.hasOwnProperty(tabId)) {
        return;
    }

    if(!details.initiator) {
        return;
    }

    var pageDomain = getDomain(details.initiator);
    var requestDomain = getDomain(details.url);

    var request = {
        tabId: tabId,
        requestId: requestId,
        startTime: details.timeStamp,
        siteName: requestDomain,
        blockCookies: false
    };

    const serviceId = lookup(services, requestDomain);

    if (serviceId) {
        request.serviceId = serviceId;
        var serviceDefinition = services[serviceId],
            serviceDomain = getDomain(serviceDefinition.url);

        // allow first-party services
        if (serviceDomain !== pageDomain) {
            request.cancelled = true;
        }
    }
    else if (pageDomain !== requestDomain) {
        request.blockCookies = true;
        console.log('blocking third-party cookies b/c ' + requestDomain
                    + ' does not match '
                    + pageDomain,
                    details.url);
    }

    state[tabId].requests[requestId] = request;

    if (request.cancelled){
        // console.log('cancelled request'
        //             + ' b/c tracking service domain '
        //             + serviceDomain
        //             + ' does not match '
        //             + pageDomain,
        //             details.url);

        return { cancel: true };
    }
}

export function handleSendHeaders(details) {
    const { tabId, requestId } = details;

    var requestHeaders, request;

    if (!state.hasOwnProperty(tabId)
        || !state[tabId].requests.hasOwnProperty(requestId)) {
        return;
    }

    if (!details.hasOwnProperty('requestHeaders')) {
        return;
    }

    request = state[tabId].requests[requestId];

    if(request.blockCookies) {
        // TODO use synchronous callback
        if(requestHeaders = stripHeaders(details.requestHeaders, 'cookie')) {
            request.blockedThirdPartyCookie = true;
            return {
                requestHeaders: requestHeaders
            };
        }
    }

}

export function handleHeadersReceived(details) {
    const { tabId, requestId } = details;

    var responseHeaders, request;

    if (!state.hasOwnProperty(tabId)
        || !state[tabId].requests.hasOwnProperty(requestId)) {
        return;
    }

    if (!details.hasOwnProperty('responseHeaders')) {
        return;
    }

    request = state[tabId].requests[requestId];

    if(request.blockCookies) {
        // TODO use synchronous callback
        if(responseHeaders = stripHeaders(details.responseHeaders, 'set-cookie')) {
            request.blockedThirdPartyCookie = true;
            return {
                responseHeaders: responseHeaders
            };
        }
    }
}

export function endRequest(details) {
    const { tabId, requestId } = details;

    var request, eventData;

    if (!state.hasOwnProperty(tabId)
        || !state[tabId].requests.hasOwnProperty(requestId)) {
        return;
    }

    request = state[tabId].requests[requestId];

    if (request.blockedThirdPartyCookie) {
        eventSink.add(blockedThirdPartyCookieEvent(request));
    }

    delete state[tabId].requests[requestId];
}

export function handleError(details) {
    const { tabId, requestId } = details;

    if (!state.hasOwnProperty(tabId)
        || !state[tabId].requests.hasOwnProperty(requestId)) {
        return;
    }

    var request = state[tabId].requests[requestId];

    if (request.cancelled) {
        eventSink.add(blockedTrackingServiceEvent(request));
    }
    else if(details.error) {
        errorSink.add({type: 'error', data: details.error});
    }

    delete state[tabId].requests[requestId];
}

// Private functions

function blockedEventData(req) {
    return {
        tabId: req.tabId,
        siteName: req.siteName,
        blockedTime: req.startTime
    };
}

function blockedTrackingServiceEvent(req) {
    var data = blockedEventData(req),
        service = services[req.serviceId];

    return {
        type: 'blockedTrackingService',
        data: Object.assign(data, {
            category: service.category,
            name: service.name,
            url: service.url,
        })
    };
}

function blockedThirdPartyCookieEvent(req) {
    var data = blockedEventData(req);
    return {
        type: 'blockedThirdPartyCookie',
        data: data
    };
}

// TODO: add a callback instead of return value
function stripHeaders(headers, name) {
    var didStrip = false,
        res = [];
    for(let idx in headers) {
        if(headers[idx].name.toLowerCase() === name) {
            didStrip = true;
        }
        else {
            res.push(headers[idx]);
        }
    }
    return didStrip ? res : undefined;
}
