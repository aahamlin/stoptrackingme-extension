# Stop Tracking Me - Chrome Extension (dev)

Small browser extension using the [Chrome Web Extensions](https://developer.chrome.com/extensions) API using the [disconnect-tracking-protection](https://github.com/disconnectme/disconnect-tracking-protection) data from [Disconnect](https://github.com/disconnectme).

This work is intended only as a demonstration and learning exercise. I do not advise using this extension for actual internet browsing protection. My reasoning includes:

- List of services is static, and therefore out of date.
- No whitelist support is implemented, there is no way to opt-out for a site that gets blocked.
- Third-party coookies are blocked, there is no configuration option to allow them.
- There has only been limited testing by myself.

Many major web browsers use this disconnect-tracking-protection services list, including Mozilla Firefox. Their solutions will be more robust and will have received comprehensive testing.

# Content

The extension is implemented using a combination of JavaScript using ES modules and Elm 0.19.1.

Test coverage for JavaScript is provided by [Karma](http://karma-runner.github.io/latest/index.html), [Mocha](https://mochajs.org/), [Chai](https://www.chaijs.com/), & [Sinon](https://sinonjs.org/).

Test coverage for Elm is provided by elm-test.

## Build steps

Setup:
```
$ npm ci
```

Unit Test Javascript and Elm (JavaScript uses Karma in Chromium, Chrome, or Firefox):
```
$ npm run test
$ npm run test:chrome
$ npm run test:firefox
```

Debug (Javascript):
```
$ npm run debug
$ npm run debug:chrome
```

UI Debug (Elm):
```
$ npm run start
$ open http://localhost:3000/popup.html
```

Build:
```
$ npm run build
```

Build artifacts will be available in the `dist/` directory.

Load into Chrome browser from `Manage Extensions...` > `Loaded unpacked`.

## Source code

Javascript ES modules are located in `src/` directory. Related unit tests are located in `test/`.

Elm code is located in `elm/` directory. Source code in `src/` and unit tests in `tests/`.
