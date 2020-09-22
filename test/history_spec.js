import browser from '../src/browser.js';
import { EventType } from '../src/requestHandler.js';
import { loadHistory } from '../src/storage.js';
import { asDateKey, initHistory, handleBlockingEvent } from '../src/history.js';
import CACHE from '../src/cache.js';

describe('history', function () {

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

    describe('#initHistory', function() {

        beforeEach(function() {

            Object.assign(browser.storage, {
                local: {
                    get: (_, cb) => {
                        cb({'key1': 'value1'});
                    }
                }
            });
        });

        afterEach(function() {
            delete browser.storage.local.get;
            sinon.restore();
        });

        it('stores return value in cache', function(done) {
            // TODO needs to return a Promise for testing...
            initHistory().then(
                function(_) {
                    // TODO check CACHE for keys
                    expect(CACHE.keys()).to.have.members(['key1']);
                    done();
                })
                .catch(function(err) {
                    done(err);
                });
        });
    });

    describe('#handleBlockingEvent', function () {

        var setFake = sinon.fake(),
            timeStamp, dateKey, testarray;

        beforeEach(function () {

            timeStamp = Date.now();
            dateKey = asDateKey(timeStamp);
            testarray = [0,0,0,0,0,0,0,0];

            Object.assign(browser.storage, {
                local: {
                    set: setFake
                }
            });
        });

        afterEach(function () {
            CACHE.delete(dateKey);
            delete browser.storage.local.set;
            sinon.restore();
        });

        var categoryTests = [
            {cat: 'Cookie', index: 0},
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
            it('#increment ' + test.cat + ' category',
               function() {

                   testarray[test.index] += 1;
                   handleBlockingEvent({
                       type: EventType,
                       data: { category: test.cat,
                               blockedTime: timeStamp
                             }
                   });

                   var result = setFake.firstArg;
                   expect(result).to.have.property(dateKey);
                   expect(result[dateKey]).to.be.an('array')
                       .and.have.length(8)
                       .and.to.include.ordered.members(testarray);
               });
        });

    });
});
