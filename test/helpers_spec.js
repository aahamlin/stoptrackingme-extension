import * as testUtils from './helpers/testUtils.js';


describe('testUtils', function () {
    var myObj;

    beforeEach(function () {
        // our state objects from state_provider are always Objects
        // so our testutils do not need to support top-level array
        // or  values
        myObj = {
            a: 1,
            b: "string",
            c: [1,2,3],
            nestedObject: { a: 1, b: "string", c: [1,2,3] },
            arrayOfObject: [{a:1, b: "string", c: [1,2,3]}],
        };
    });

    it('#merge should create deep copies of objects', function () {
        expect(testUtils.merge(myObj, {})).to.deep.equal(myObj);
        expect(testUtils.merge({}, myObj)).to.deep.equal(myObj);
    });

    it('#merge() should merge objects from L-to-R into new object', function() {
        var newObj = testUtils.merge(myObj, {
            a: 2,
            d: [4,5,6],
            e: 1,
            nestedObject: { a: 2, b: "hello", d: [4,5,6], e:1 },
            arrayOfObject: [{a:2, b: "hello", c: [4,5,6]}]
        });

        expect(newObj).to.deep.equal({
            a: 2, b: "string", c: [1,2,3], d: [4,5,6], e: 1,
            nestedObject: {a:2, b: "hello", c:[1,2,3], d: [4,5,6], e: 1},
            arrayOfObject: [{a:2, b: "hello", c: [4,5,6]}]
        });
    });
});
