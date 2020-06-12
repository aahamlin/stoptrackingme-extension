import state, { reset } from '../src/state_provider.js';

describe('state_provider', function () {

    afterEach(function() {
        reset();
        expect(state.requests).to.be.an('object').and.be.empty;
        expect(state.totalCount).to.be.equal(0);
    });

    it('#state records requests and counts', function () {
        state.requests[123] = { requestId: 123 };
        expect(state.requests).to.have.property('123').and.to.deep.equal({ requestId: 123 });
    })

});
