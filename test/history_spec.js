import browser from '../src/browser.js';
import { EventType } from '../src/requestHandler.js';
import { asDateKey,
         initHistory,
         handleBlockingEvent,
         startTimer,
         stopTimer
       } from '../src/history.js';
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
        before(function() {
            Object.assign(browser.storage, {
                local: {
                    get: (_, cb) => {
                        cb({'key1': 'value1'});
                    }
                }
            });
        });

        afterEach(function() {
            CACHE.delete('key1');
            sinon.restore();
        });

        after(function() {
            delete browser.storage.local.get;
        });

        it('stores return value in cache', function(done) {
            initHistory().then(
                function(_) {
                    // TODO check CACHE for keys
                    expect(CACHE.keys()).to.have.members(['key1']);
                    expect(CACHE.get('key1')).to.be.equal('value1');
                    done();
                })
                .catch(function(err) {
                    done(err);
                });
        });
    });

    describe('#saveCacheToDisk', function() {
        var fake, clock, timer;

        beforeEach(function() {
            fake = sinon.fake();
            Object.assign(browser.storage, {
                local: {
                    set: fake
                }
            });
            clock = sinon.useFakeTimers({
                now: Date.now(),
                toFake: ['setInterval', 'clearInterval', 'Date']
            });
            timer = startTimer(5);
        });

        afterEach(function() {
            clearInterval(timer);
            CACHE.delete('key1');
            CACHE.delete('key2');
            delete browser.storage.local.set;
            sinon.restore();
            clock.restore();
        });

        it('#startTimer saves incremental updates', function() {
            CACHE.set('key1', 'value1');
            clock.tick(10);
            sinon.assert.calledOnce(fake);

            CACHE.set('key2', 'value2');
            clock.tick(10);
            sinon.assert.calledTwice(fake);
        });

        it('#stopTimer', function() {
            stopTimer(timer);
            clock.runAll();
            CACHE.set('key1', 'value1');
            sinon.assert.notCalled(fake);
        });

    });

    describe('#handleBlockingEvent', function () {

        var timeStamp, dateKey, testarray;

        beforeEach(function () {
            timeStamp = Date.now();
            dateKey = asDateKey(timeStamp);
            testarray = [0,0,0,0,0,0,0,0];
        });

        afterEach(function () {
            CACHE.delete(dateKey);
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
                   expect(CACHE.keys()).to.have.members([dateKey]);
                   expect(CACHE.get(dateKey)).to.be.an('array')
                       .and.have.length(8)
                       .and.to.include.ordered.members(testarray);
               });
        });

    });
});
