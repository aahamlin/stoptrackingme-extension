import * as testUtils from './helpers/testUtils.js';
import browser from '../src/browser.js';
import { history } from '../src/state_provider.js';
import { asDateKey, loadHistory, saveHistory, handleBlockingEvent } from '../src/history.js';


describe('history', function () {

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

    it('#asDateKey returns epoch timestamp string from start of day', function () {
        var utcJun19 = new Date(Date.UTC(2020, 5, 19, 0, 0, 0, 1));
        var jun19Key = '' + Date.UTC(2020, 5, 19, 0, 0, 0, 0);
        var  res = asDateKey(utcJun19.getTime());
        expect(res).to.be.an('string').and.equal(jun19Key);
    });

    it('#asDateKey returns epoch timestamp string from end of day', function () {
        var utcJun18 = new Date(Date.UTC(2020, 5, 18, 23, 59, 59, 999));
        var jun18Key = '' + Date.UTC(2020, 5, 18, 0, 0, 0, 0);
        var res = asDateKey(utcJun18.getTime());
        expect(res).to.be.an('string').and.equal(jun18Key);

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
        saveHistory();
        expect(fake.calledOnce).to.be.true;
    });

    it('#handleBlockingEvent() increment from existing history value', function () {
        var timeStamp = Date.now(),
            dateKey = asDateKey(timeStamp);

        var old = {};
        old[dateKey] = [1,0,0,0,0,0,0,0];
        testUtils.updateState(history, old);
        handleBlockingEvent({ type: 'blockedThirdPartyCookie', data: { blockedTime: timeStamp } });
        expect(history).to.have.property(dateKey);
        expect(history[dateKey]).to.be.an('array').and.have.length(8)
            .and.to.include.ordered.members([2,0,0,0,0,0,0,0]);
    });

    it('#handleBlockingEvent() increments Cookies, twice', function() {
        var timeStamp = Date.now(),
            dateKey = asDateKey(timeStamp);

        handleBlockingEvent({ type: 'blockedThirdPartyCookie', data: { blockedTime: timeStamp } });
        handleBlockingEvent({ type: 'blockedThirdPartyCookie', data: { blockedTime: timeStamp } });
        expect(history).to.have.property(dateKey);
        expect(history[dateKey]).to.be.an('array').and.have.length(8)
            .and.to.include.ordered.members([2,0,0,0,0,0,0,0]);
    });

    var categoryTests = [
        {cat: "Advertising", index: 1},
        {cat: "Analytics", index: 2},
        {cat: "Content", index: 3},
        {cat: "Cryptomining", index: 4},
        {cat: "Disconnect", index: 5}, // merge with social
        {cat: "Fingerprinting", index: 6},
        {cat: "Social", index: 5},
        {cat: "Unknown", index: 7},
    ];

    categoryTests.forEach((test) => {
        it('#handleBlockingEvent() increments ' + test.cat + ' category',
           function() {

               var timeStamp = Date.now(),
                   dateKey = asDateKey(timeStamp),
                   testarray = [0,0,0,0,0,0,0,0];

               testarray[test.index] = 1;
               handleBlockingEvent.apply(null, [{
                   type: 'blockedTrackingService',
                   data: { category: test.cat, blockedTime: timeStamp
                         }
               }]);
               expect(history).to.have.property(dateKey);
               expect(history[dateKey]).to.be.an('array')
                   .and.have.length(8)
                   .and.to.include.ordered.members(testarray);
           });
    });

});
