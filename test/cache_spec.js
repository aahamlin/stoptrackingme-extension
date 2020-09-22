import { SimpleCache } from '../src/cache.js';

describe('Cache module', function() {

    var cache;

    beforeEach(function() {
        cache = SimpleCache({
            'key-text': 'value-text',
            'key2-text': 'value2-text'
        });
    });

    it('#get returns a value', function() {
        expect(cache.get('key-text')).to.be.equal('value-text');
    });

    it('#set caches a value', function() {
        cache.set('set-text', 'set-value');
        expect(cache.get('set-text')).to.be.equal('set-value');
    });

    it('#delete removes a value', function() {
        cache.delete('key-text');
        expect(cache.get('key-text')).to.be.undefined;
        expect(cache.get('key2-text')).to.be.equal('value2-text');
    });

    it('#items returns iterable', function() {
        var items = cache.items();
        expect(items.length).to.be.equal(2);
        expect(items).to.have.deep.members([
            ['key-text', 'value-text'],
            ['key2-text', 'value2-text']
        ]);
    });

    it('#keys returns list of keys', function() {
        var keys = cache.keys();
        expect(keys).to.have.members(['key-text', 'key2-text']);
    });

    it('#values returns list of values', function() {
        var values = cache.values();
        expect(values).to.have.members(['value-text', 'value2-text']);
    });

    it('#toObject returns an object', function() {
        var obj = cache.toObject();
        expect(obj).to.deep.equal({
            'key-text': 'value-text',
            'key2-text': 'value2-text',
        });
    });

});
