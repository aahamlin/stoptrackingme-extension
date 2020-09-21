import { lookup, areEqual } from './services.js';

// options
const opts_allowThirdPartyCookies = false;

export const EventType = 'BlockedEvent';

// TODO after refactoring, can we remove the state object arg all together?
export function createRequestManager(services, state) {
    var state = state ? state : {},
        services = services ? services : {};

    return new RequestManager(state, services);
}

class RequestManager {

    constructor(state, services) {
        this.state = state || {};
        this.services = services || {};
    }

    registerEventSinks(eventSink, errorSink) {
        this.eventSink = eventSink;
        this.errorSink = errorSink;
    }

    addTab(info) {
        const { tabId } = info;
        if(!this.state.hasOwnProperty(tabId)) {
            this.state[tabId] = {
                tabId: tabId,
                requests: {},
                totalCount: 0
            };
        }
    }

    updateTab(tabId, info, tab) {
        if (!this.state.hasOwnProperty(tabId)) {
            return;
        }

        if (info.url) {
            if (!looseContains(tab.url, this.state[tabId].pageDomain)) {
                this.state[tabId].pageDomain = getDomain(tab.url);
            }
        }
    }

    removeTab(tabId, _) {
        if(this.state.hasOwnProperty(tabId)) {
            delete this.state[tabId];
        }
    }


    replaceTab(newTabId, oldTabId) {
        if(this.state.hasOwnProperty(oldTabId)) {
            this.state[newTabId] = this.state[oldTabId];
            delete this.state[oldTabId];
        }
    }


    beginRequest(details) {
        const { tabId, requestId } = details;

        if (!this.state.hasOwnProperty(tabId)) {
            return;
        }

        // Things to know
        // if the first party url domain matches the request domain, then allow all
        // if request domain matches a service and the first party url domain matches
        // the service domain or any of service's known domains, then allow because
        // person has directly requested a known service entity

        var request = this.configureRequest(details);

        this.state[tabId].requests[requestId] = request;

        if (request.cancelled){
            return { cancel: true };
        }
    }

    handleSendHeaders(details) {
        const { tabId, requestId } = details;

        var requestHeaders, request;

        if (!this.state.hasOwnProperty(tabId)
            || !this.state[tabId].requests.hasOwnProperty(requestId)) {
            return;
        }

        request = this.state[tabId].requests[requestId];

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
    }


    handleHeadersReceived(details) {
        const { tabId, requestId } = details;

        var responseHeaders, request;

        if (!this.state.hasOwnProperty(tabId)
            || !this.state[tabId].requests.hasOwnProperty(requestId)) {
            return;
        }

        request = this.state[tabId].requests[requestId];

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
    }


    endRequest(details) {
        const { tabId, requestId } = details;

        if (!this.state.hasOwnProperty(tabId)
            || !this.state[tabId].requests.hasOwnProperty(requestId)) {
            return;
        }

        var request = this.state[tabId].requests[requestId];

        if (request.blockedThirdPartyCookie) {
            var count = this.incrementTabCount(tabId);
            this.reportBlockedCookie(request, count);
        }

        delete this.state[tabId].requests[requestId];
    }

    incrementTabCount(tabId) {
        this.state[tabId].totalCount += 1;
        return this.state[tabId].totalCount;
    }

    handleError(details) {
        const { tabId, requestId } = details;

        if (!this.state.hasOwnProperty(tabId)
            || !this.state[tabId].requests.hasOwnProperty(requestId)) {
            return;
        }

        var request = this.state[tabId].requests[requestId];

        // TODO refactor
        if (request.cancelled) {
            var count = this.incrementTabCount(tabId);
            this.reportBlockedService(request, count);
        }
        else if(details.error) {
            this.emitError({type: 'error', data: details.error});
        }

        delete this.state[tabId].requests[requestId];
    }

    // Private functions

    configureRequest(details) {
        const { tabId, requestId } = details;

        if (!this.state.hasOwnProperty(tabId)) {
            return;
        }

        var requestDomain = getDomain(details.url);

        if (!details.initiator || details.initiator === 'null') {
            this.state[tabId].pageDomain = requestDomain;
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
        request.isFirstPartyRequest = isFirstPartyRequest(requestDomain, this.state[tabId].pageDomain);

        // requesting a known tracking service or undefined
        request.service = lookup(this.services, requestDomain);

        // true when this is a service and it is allowed within the domain matching rules
        request.isAllowedServiceRequest = request.service ?
            this.isAllowedServiceRequest(request.service, this.state[tabId].pageDomain) : false;

        if (request.service && !request.isAllowedServiceRequest) {
            request.cancelled = true;
        }

        return request;
    }

    reportBlockedService(request, count) {
        var service = this.services[request.service],
            data = Object.assign(
                BlockedEventData(
                    request, count, service.category
                ),
                {
                    name: service.name,
                    url: service.url,
                });

        this.emitEvent(data);

    }

    reportBlockedCookie(request, count) {
        var data = BlockedEventData(
            request, count, 'Cookie');

        this.emitEvent(data);
    }

    emitEvent(obj) {
        if(!this.eventSink) {
            console.error('event sink not registered');
        }
        else this.eventSink.add(
            {
                type: EventType,
                data: obj
            }
        );
    }

    emitError(obj) {
        if(!this.errorSink) {
            console.error('event sink not registered');
        }
        else this.errorSink.add(obj);
    }

    isAllowedServiceRequest(service, pageDomain) {
        if (!service || !this.services.hasOwnProperty(service)) {
            return false;
        }
        // is this a request calling back to an allowed url of a first-party service provider?
        var serviceDefinition = this.services[service];
        // find out whether serviceDomain of request and pageDomain each map to the same service
        var firstPartyService = lookup(this.services, pageDomain);

        if(!firstPartyService) {
            return false;
        }

        return areEqual(serviceDefinition, this.services[firstPartyService]);
    }
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
