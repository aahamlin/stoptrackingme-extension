import { SimpleCache } from '../src/cache.js';

describe('Cache module', function() {

    var cache;

    beforeEach(function() {
        cache = SimpleCache({
            'key-text': 'value-text',
            'key2-text': 'value2-text'
        });
    });

    it('should return a cached value', function() {
        expect(cache.get('key-text')).to.be.equal('value-text');
    });

    it('should cache a new value', function() {
        var oldLastUpdate = cache.lastUpdate();
        cache.set('set-text', 'set-value');
        expect(cache.get('set-text')).to.be.equal('set-value');
        expect(cache.lastUpdate() > oldLastUpdate).to.be.true;
    });

    it('should remove a cached value', function() {
        cache.delete('key-text');
        expect(cache.get('key-text')).to.be.undefined;
        expect(cache.get('key2-text')).to.be.equal('value2-text');
    });

    it('should return an iterable of items, [[key, value],...]', function() {
        var items = cache.items();
        expect(items.length).to.be.equal(2);
        expect(items).to.have.deep.members([
            ['key-text', 'value-text'],
            ['key2-text', 'value2-text']
        ]);
    });

    it('should return a list of keys, [key, ...]', function() {
        var keys = cache.keys();
        expect(keys).to.have.members(['key-text', 'key2-text']);
    });

    it('should return a list of values, [value, ...]', function() {
        var values = cache.values();
        expect(values).to.have.members(['value-text', 'value2-text']);
    });

    it('should return all key-value pairs as an object', function() {
        var obj = cache.toObject();
        expect(obj).to.deep.equal({
            'key-text': 'value-text',
            'key2-text': 'value2-text',
        });
    });

});
