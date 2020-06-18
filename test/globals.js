/*
  ==========================================================
  This is a short example of mocking the browser object.
  ==========================================================
  Mocking frameworks that I have tried so far (Jasmine, Sinon)
  will not add methods to an object that does not already exist
  this file 'test/globals.js' is loaded in karma before everything
  else and we can then spy on the methods we need for other tests.

  Make sure to track what is added, and then remove it after the tests.


  ex.
    var spy;

    beforeEach(function() {
        spy = sinon.spy();
        Object.assign(browser.browserAction, {
            setBadgeText: spy,
        });
    })

    afterEach(function() {
        sinon.restore();
    });

    it('#browserAction.setBadgeText() ok', function () {
        browser.browserAction.setBadgeText({ text: "foo" });
        expect(spy.calledOnce).to.be.true;
    });
*/


/* test setup pollutes global namespace */
(function() {
    ensureBrowser();
    installBrowserAPIStub(window.browser || window.chrome);

    function ensureBrowser() {
        if (!window.browser && !window.chrome) {
            Object.assign(window, {
                browser: {}
            });
        }
    }
    function installBrowserAPIStub(b) {
        if (!b) throw new Error('unable to initialize test env');
        if(!b.browserAction){
            Object.assign(b, {
                browserAction: {},
                storage: {},
                webRequest: {},
                extension: {},
                runtime: {}
            });
        }
    }
})();
