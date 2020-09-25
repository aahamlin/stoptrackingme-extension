import browser from '../src/browser.js';

import * as Storage from '../src/storage.js';

describe('Storage', function() {

    var setFake = sinon.fake();

    beforeEach(function () {
        Object.assign(browser.storage, {
            local: {
                get: () => {},
                set: setFake
            }
        });
    });

    afterEach(function() {
        delete browser.storage.local.get;
        delete browser.storage.local.set;
        sinon.restore();
    });

    // TODO https://www.chaijs.com/plugins/chai-as-promised/

    // Change the history argument to an immutable string "__CACHE__" or something...
    it('should resolve promise supplying object from storage', function (done) {
        var dateKey = '1600646400000', // asDateKey(Date.now()),
            historyToday = {};

        historyToday[dateKey] = [5,0,0,0,0,0,0,0];
        browser.storage.local.get = function(_, cb) {
            cb(historyToday);
        };

        // TODO this is not testing that call args to storage.local.get.
        Storage.load().then(
            function (result) {
                expect(result).to.deep.equal(historyToday);
                done();
            })
            .catch(function(err) {
                done(err);
            });
    });

    it('should save object to storage', function () {
        Storage.save({});
        expect(setFake.calledOnce).to.be.true;
    });
});
