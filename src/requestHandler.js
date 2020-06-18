import { lookup } from './services.js';
import state from './state_provider.js';

var _eventSink, _errorSink;

const services = {};

/**
 * register known tracking services with the request module.
 *
 * previously registered services are removed.
 *
 * @param @object containing service definitions.
 */
export function registerTrackingServices(trackingServices) {
    // TODO add flag to clear old services
    for(let old in services) { delete services[old]; }
    for(let service in trackingServices) {
        services[service] = trackingServices[service];
    }
}

export function registerEventSinks(eventSink, errorSink) {
    _eventSink = eventSink;
    _errorSink = errorSink;
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

export function beginRequest(details) {
    const { tabId, requestId } = details;

    // shouldn't re-enter, but place holder for tabId handling
    if (!state.hasOwnProperty(tabId)
       || !details.initiator) {
        return;
    }

    var requestDomain = getDomain(details.url);

    var request = {
        tabId: tabId,
        requestId: requestId,
        startTime: details.timeStamp,
        siteName: requestDomain,
        blockCookies: false
    };

    // move service handling to helper function
    const serviceId = lookup(services, requestDomain);

    if (serviceId) {
        request.serviceId = serviceId;
        // allows first-party services (initiator) to load their known services
        if (wantRequestBlocking(request, details.initiator)) {
            request.cancelled = true;
        }
    }
    // else if (pageDomain !== requestDomain) {
    //     request.blockCookies = true;
    //     console.log('blocking third-party cookies b/c ' + requestDomain
    //                 + ' does not match '
    //                 + pageDomain,
    //                 details.url);
    // }

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
        || !details.initiator
        || !state[tabId].requests.hasOwnProperty(requestId)) {
        return;
    }

    if (!details.hasOwnProperty('requestHeaders')) {
        return;
    }

    request = state[tabId].requests[requestId];

    if(wantRequestBlocking(request, details.initiator)) {
        // console.log('blocking third-party cookies b/c '
        //             + details.initiator + ' does not match '
        //             + request.siteName, details.url);

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
        || !details.initiator
        || !state[tabId].requests.hasOwnProperty(requestId)) {
        return;
    }

    if (!details.hasOwnProperty('responseHeaders')) {
        return;
    }

    request = state[tabId].requests[requestId];

    if(wantRequestBlocking(request, details.initiator)) {
        // console.log('blocking third-party set-cookies b/c '
        //             + details.initiator + ' does not match '
        //             + request.siteName, details.url);

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

    if (!state.hasOwnProperty(tabId)
        || !state[tabId].requests.hasOwnProperty(requestId)) {
        return;
    }

    var request = state[tabId].requests[requestId];

    if (request.blockedThirdPartyCookie) {
        emitEvent(blockedThirdPartyCookieEvent(request));
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
        emitEvent(blockedTrackingServiceEvent(request));
    }
    else if(details.error) {
        emitError({type: 'error', data: details.error});
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

function emitEvent(obj) {
    if(!_eventSink) console.error('event sink not registered');
    else _eventSink.add(obj);
}

function emitError(obj) {
    if(!_errorSink) console.error('event sink not registered');
    else _errorSink.add(obj);
}

function getDomain(url) {
    return new URL(url).hostname;
}

function wantRequestBlocking(request, initiator) {
    if (!initiator) return;
    if (initiator.indexOf(request.siteName) >= initiator.indexOf('://')+3) {
        return false; // request is calling back to the origin, e.g. first-party
    }
    // is this a request calling back to an allowed url of a first-party service provider?
    if (request.serviceId) {
        var serviceDefinition = services[request.serviceId],
            serviceDomain = getDomain(serviceDefinition.url);

        // find the first party site and does it match our initiator?
        if (initiator.indexOf(serviceDomain) >= initiator.indexOf('://')+3) {
            return false;
        }
    }

    return true;
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
