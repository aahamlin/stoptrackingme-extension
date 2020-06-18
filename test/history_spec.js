import * as testUtils from './helpers/testUtils.js';
import browser from '../src/browser.js';
import { history } from '../src/state_provider.js';
import { asDateKey, loadHistory, saveHistory, handleBlockingEvent } from '../src/history.js';


describe('history', function () {

    var browserStorageSpy;

    beforeEach(function () {
        testUtils.clearAllProps(history);

        Object.assign(browser.storage, {
            local: {
                get: () => {},
                set: () => {},
            }
        });
        // Object.assign(browser.runtime, {
        //     lastError:
        // });
    });

    afterEach(function () {
        //sinon.restore();
    });

    it('#asDateKey returns key', function () {
        var jun19 = new Date(2020, 5, 19);

        expect(asDateKey(jun19.getTime())).to.equal('2020-06-19');
    });

    // TODO https://www.chaijs.com/plugins/chai-as-promised/
    it('#loadHistory() returns promise of history', function (done) {
        var dateKey = asDateKey(Date.now()),
            historyToday = {};

        historyToday[dateKey] = { 'cookie': 5 };
        browser.storage.local.get = function(key, cb) {
            cb(historyToday);
        };
        loadHistory().then(
            function (result) {
                expect(result).to.deep.equal(historyToday);
                done();
            })
            .catch(function(err) {
                done(err);
            });
    });

    it('#saveHistory() calls storage.set', function () {
        var fake = sinon.fake();
        browser.storage.local.set = fake;
        saveHistory(1, { status: 'complete' }, { status: 'complete' });
        expect(fake.calledOnce).to.be.true;
    });

    it('#handleBlockingEvent() increments categories', function () {
        var timeStamp = Date.now(),
            dateKey = asDateKey(timeStamp);

        handleBlockingEvent({ type: 'blockedTrackingService', data: { category: 'cat1', blockedTime: timeStamp } });
        expect(history).to.have.property(dateKey);
        expect(history[dateKey]).to.have.property('cat1', 1);
    });
});
