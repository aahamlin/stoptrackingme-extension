const state = {
    requests: {},
    totalCount: 0,
};


export function reset() {
    state.requests = {};
    state.totalCount = 0;
}

export { state as default };
