import { lookup, areEqual } from './services.js';
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

export function updateTab(tabId, info, tab) {
    if (!state.hasOwnProperty(tabId)) {
        return;
    }

    if (info.url) {
        if (!looseContains(tab.url, state[tabId].pageDomain)) {
            state[tabId].pageDomain = getDomain(tab.url);
        }
    }
}

export function removeTab(tabId, _) {
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

    if (!state.hasOwnProperty(tabId)) {
        return;
    }

    // Things to know
    // if the first party url domain matches the request domain, then allow all
    // if request domain matches a service and the first party url domain matches
    // the service domain or any of service's known domains, then allow because
    // person has directly requested a known service entity

    var request = configureRequest(details);

    if (request.service && !request.isAllowedServiceRequest) {
        request.cancelled = true;
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

function configureRequest(details) {
    const { tabId, requestId } = details;

    if (!state.hasOwnProperty(tabId)) {
        return;
    }

    var requestDomain = getDomain(details.url);

    if (!details.initiator || details.initiator === 'null') {
        state[tabId].pageDomain = requestDomain;
        //console.warn('switched pageDomain to ' + requestedDomain + ' because initator is empty or "null"', details.initator);
    }

    var request = {
        tabId: tabId,
        requestId: requestId,
        startTime: details.timeStamp,
        requestDomain: requestDomain
    };
    // request domain === page domain
    request.isFirstPartyRequest = isFirstPartyRequest(requestDomain, state[tabId].pageDomain);

    // requesting a known tracking service or undefined
    request.service = lookup(services, requestDomain);

    // true when this is a service and it is allowed within the domain matching rules
    request.isAllowedServiceRequest = request.service ? isAllowedServiceRequest(request.service, state[tabId].pageDomain) : false;

    return request;
}


function blockedEventData(req) {
    return {
        tabId: req.tabId,
        requestDomain: req.requestDomain,
        blockedTime: req.startTime
    };
}

function blockedTrackingServiceEvent(req) {
    var data = blockedEventData(req),
        service = services[req.service];

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

/**
 * try to match server names in both directions, because we cannot be sure
 * whether we are loading twitter.com, www.twitter.com, or api.twitter.com
 */
function looseContains(a, b) {
    if (!(a && b)) return false;
    if ((a.length >= b.length && a.indexOf(b) >= 0) || b.indexOf(a) >= 0) {
        return true; // request is calling back to the origin, e.g. first-party
    }
    return false;

}

function isFirstPartyRequest(domain, pageDomain) {
    if (!domain) throw new Error('Must provide domain');
    return looseContains(domain, pageDomain);
}

function isAllowedServiceRequest(service, pageDomain) {
    if (!service || !services.hasOwnProperty(service)) {
        return false;
    }
    // is this a request calling back to an allowed url of a first-party service provider?
    var serviceDefinition = services[service];
    // find out whether serviceDomain of request and pageDomain each map to the same service
    var firstPartyService = lookup(services, pageDomain);

    if(!firstPartyService) {
        return false;
    }

    return areEqual(serviceDefinition, services[firstPartyService]);
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
