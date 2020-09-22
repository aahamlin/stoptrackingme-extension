import browser from '../src/browser.js';

import { loadHistory, saveHistory } from '../src/storage.js';

describe('#retrieval tests', function() {

    beforeEach(function () {
        Object.assign(browser.storage, {
            local: {
                get: () => {}
            }
        });
    });

    afterEach(function() {
        delete browser.storage.local.get;
    });

    // TODO https://www.chaijs.com/plugins/chai-as-promised/

    // Change the history argument to an immutable string "__CACHE__" or something...
    it('#loadHistory() returns promise of history', function (done) {
        var dateKey = '1600646400000', // asDateKey(Date.now()),
            historyToday = {};

        historyToday[dateKey] = [5,0,0,0,0,0,0,0];
        browser.storage.local.get = function(dk, cb) {
            expect(dk).to.equal(dateKey);
            cb(historyToday);
        };

        // TODO this is not testing that call args to storage.local.get.
        loadHistory(dateKey).then(
            function (result) {
                expect(result).to.deep.equal(historyToday);
                done();
            })
            .catch(function(err) {
                done(err);
            });
    });

});


describe('#storage tests', function () {

    var setFake = sinon.fake();

    beforeEach(function () {
        //testUtils.clearAllProps(history);

        Object.assign(browser.storage, {
            local: {
                set: setFake
            }
        });
    });

    afterEach(function () {
        delete browser.storage.local.set;
        sinon.restore();
    });


    it('#saveHistory() calls storage.set', function () {
        saveHistory({});
        expect(setFake.calledOnce).to.be.true;
    });
});
