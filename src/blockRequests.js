import asTracker from './tracker.js';
import state from './state_provider.js';
import setBadgeText from './ui.js';

function beginRequest(details) {
    const { tabId, requestId } = details;

    // shouldn't re-enter, but place holder for tabId handling
    if (state.requests.hasOwnProperty(requestId)) {
        return;
    }

    var request = { requestId: requestId },
        tracker = asTracker(details.url);

    if (tracker) {
        Object.assign(request, {
            tracker: tracker,
            isBlocked: false
        });
    }

    state.requests[requestId] = request;
}

function handleSendHeaders(details) {
    const { tabId, requestId } = details;

    var requestHeaders, request;

    if (!details.hasOwnProperty('requestHeaders')) {
        return;
    }

    if (!state.requests.hasOwnProperty(requestId)) {
        return;
    }

    request = state.requests[requestId];

    if(request.tracker) {
        if(requestHeaders = stripHeaders(details.requestHeaders, 'cookie')) {
            request.isBlocked = true;
            return {
                requestHeaders: requestHeaders
            };
        }
    }

}

function handleHeadersReceived(details) {
    const { tabId, requestId } = details;

    var responseHeaders, request;

    if (!details.hasOwnProperty('responseHeaders')) {
        return;
    }
    if (!state.requests.hasOwnProperty(requestId)) {
        return;
    }

    request = state.requests[requestId];

    if(request.tracker) {
        if(responseHeaders = stripHeaders(details.responseHeaders, 'set-cookie')) {
            request.isBlocked = true;
            return {
                responseHeaders: responseHeaders
            };
        }
    }
}

function endRequest(details) {
    const { tabId, requestId } = details;

    var request;

    if (!state.requests.hasOwnProperty(requestId)) {
        return;
    }

    request = state.requests[requestId];

    if (request.isBlocked) {
        // TODO: emit blocked event here
        state.totalCount += 1;
        console.log('blocked ' + request.url, state.totalCount);
        setBadgeText(state.totalCount.toString());
    }

    delete state.requests[requestId];
}

function handleError(details) {
    const { tabId, requestId } = details;

    //var request;

    if (!state.requests.hasOwnProperty(requestId)) {
        return;
    }

    //request = state.requests[requestId];

    if(details.error) {
        console.warn('Encountered error: ' + error, error);
    }

    delete state.requests[requestId];
}

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

export { beginRequest, handleSendHeaders, handleHeadersReceived, endRequest, handleError };
