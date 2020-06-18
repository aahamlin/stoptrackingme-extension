import { lookup } from './services.js';
import state from './state_provider.js';

var _eventSink, _errorSink;

const services = {};

// options

const opts_allowThirdPartyCookies = false;


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
    if (!state.hasOwnProperty(tabId)) {
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

    // request domain === initiator domain
    request.isFirstPartyRequest = isFirstPartyRequest(request.siteName, details.initiator);

    // move service handling to helper function
    const serviceId = lookup(services, requestDomain);

    if (serviceId) {
        request.serviceId = serviceId;
        request.isAllowedServiceRequest = isAllowedServiceRequest(serviceId, details.initiator);
        // don't block service requests or their cookies when first-party is the same service
        if (!request.isAllowedServiceRequest) {
            request.cancelled = true;
        }
    }

    state[tabId].requests[requestId] = request;

    if (request.cancelled){
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

    if(!opts_allowThirdPartyCookies
       && !request.isFirstPartyRequest
       && !request.isAllowedServiceRequest) {
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

    if(!opts_allowThirdPartyCookies
       && !request.isFirstPartyRequest
       && !request.isAllowedServiceRequest) {
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

function isFirstPartyRequest(domain, initiator) {
    if (!domain) throw new Error('Must provide domain');
    if (!initiator
        || initiator.indexOf(domain) >= 0) {
        return true; // request is calling back to the origin, e.g. first-party
    }
    return false;
}

function isAllowedServiceRequest(serviceId, initiator) {
    if (!services.hasOwnProperty(serviceId)) {
        return false;
    }
    // is this a request calling back to an allowed url of a first-party service provider?
    var serviceDefinition = services[serviceId],
        serviceDomain = getDomain(serviceDefinition.url);

    if (!initiator
        || initiator.indexOf(serviceDomain) >= 0) {
        return true;
    }

    return false;
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
