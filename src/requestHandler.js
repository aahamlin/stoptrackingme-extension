import { lookup, areEqual } from './services.js';
import {
    eventSink as defaultEventSink,
    errorSink as defaultErrorSink
} from './streams.js';


// options
const opts_allowThirdPartyCookies = false;

export const EventType = 'BlockedEvent';

// TODO after refactoring, can we remove the state object arg all together?
export function createRequestManager(svc, cfg) {
    if (!svc) throw Error('services not provided');

    const services = svc;
    const state = (cfg && cfg['state']) ? cfg['state'] : {};
    const eventSink = (cfg && cfg['events']) ? cfg['events'] : defaultEventSink;
    const errorSink = (cfg && cfg['errors']) ? cfg['errors'] : defaultErrorSink;

    const requestManager = Object.create({
        addTab: (info) => {
            const { tabId } = info;
            if(!state.hasOwnProperty(tabId)) {
                state[tabId] = {
                    tabId: tabId,
                    requests: {},
                    totalCount: 0
                };
            }
        },

        updateTab: (tabId, info, tab) => {
            if (!state.hasOwnProperty(tabId)) {
                return;
            }

            if (info.url) {
                if (!looseContains(tab.url, state[tabId].pageDomain)) {
                    state[tabId].pageDomain = getDomain(tab.url);
                }
            }
        },

        removeTab: (tabId, _) => {
            if(state.hasOwnProperty(tabId)) {
                delete state[tabId];
            }
        },


        replaceTab: (newTabId, oldTabId) => {
            if(state.hasOwnProperty(oldTabId)) {
                state[newTabId] = state[oldTabId];
                delete state[oldTabId];
            }
        },


        beginRequest: (details) => {
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

            state[tabId].requests[requestId] = request;

            if (request.cancelled){
                return { cancel: true };
            }
        },

        handleSendHeaders: (details) => {
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
                    // TODO blockedThirdPartyCookie will be a request method
                    request.blockedThirdPartyCookie = true;
                    return {
                        requestHeaders: requestHeaders
                    };
                }
            }
        },


        handleHeadersReceived: (details) => {
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
                    // TODO blockedThirdPartyCookie will be a request method
                    request.blockedThirdPartyCookie = true;
                    return {
                        responseHeaders: responseHeaders
                    };
                }
            }
        },


        endRequest: (details) => {
            const { tabId, requestId } = details;

            if (!state.hasOwnProperty(tabId)
                || !state[tabId].requests.hasOwnProperty(requestId)) {
                return;
            }

            var request = state[tabId].requests[requestId];

            if (request.blockedThirdPartyCookie) {
                var count = incrementTabCount(tabId);
                reportBlockedCookie(request, count);
            }

            delete state[tabId].requests[requestId];
        },

        handleError: (details) => {
            const { tabId, requestId } = details;

            if (!state.hasOwnProperty(tabId)
                || !state[tabId].requests.hasOwnProperty(requestId)) {
                return;
            }

            var request = state[tabId].requests[requestId];

            // TODO refactor
            if (request.cancelled) {
                var count = incrementTabCount(tabId);
                reportBlockedService(request, count);
            }
            else if(details.error) {
                emitError({type: 'error', data: details.error});
            }

            delete state[tabId].requests[requestId];
        }
    });


    // Private functions
    function incrementTabCount(tabId) {
        state[tabId].totalCount += 1;
        return state[tabId].totalCount;
    }

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
            requestDomain: requestDomain,
            cancelled: false
        };
        // request domain === page domain
        request.isFirstPartyRequest = isFirstPartyRequest(requestDomain, state[tabId].pageDomain);

        // requesting a known tracking service or undefined
        request.service = lookup(services, requestDomain);

        // true when this is a service and it is allowed within the domain matching rules
        request.isAllowedServiceRequest = request.service ?
            isAllowedServiceRequest(request.service, state[tabId].pageDomain) : false;

        if (request.service && !request.isAllowedServiceRequest) {
            request.cancelled = true;
        }

        return request;
    }

    /** report blocking of a tracking service. **/
    function reportBlockedService(request, count) {
        var service = services[request.service],
            data = BlockedEventData(
                    request, count, service.category
                );

        emitEvent(
            Object.assign(data, {
                name: service.name,
                url: service.url,
            })
        );

    }

    /** report blocking of a third-party cookie. **/
    function reportBlockedCookie(request, count) {
        var data = BlockedEventData(
            request, count, 'Cookie');

        emitEvent(data);
    }

    function emitEvent(obj) {
        if(!eventSink) {
            console.error('event sink not registered');
        }
        else {
            eventSink.add(
                {
                    type: EventType,
                    data: obj
                }
            );
        }
    }

    function emitError(obj) {
        if(!errorSink) {
            console.error('event sink not registered');
        }
        else {
            errorSink.add(obj);
        }
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

    return requestManager;
}


function BlockedEventData(req, count, category) {
    return {
        tabId: req.tabId,
        requestDomain: req.requestDomain,
        blockedTime: req.startTime,
        category: category,
        totalCount: count
    };
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

export { createRequestManager as default };
