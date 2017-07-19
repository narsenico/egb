'use strict';

const Application = require('spectron').Application,
    electron = require('electron'),
    path = require('path'),
    chai = require('chai'),
    // expect = require('chai').expect,
    chaiAsPromised = require('chai-as-promised'),
    assert = require('assert'),
    timeout = 10000;

chai.should();
chai.use(chaiAsPromised);

describe('egb test: db', function() {
    this.timeout(timeout);
    let app, adb,
        fakeEntries;

    const startApp = function() {
        app = new Application({
            path: electron,
            args: [
                path.join(__dirname, '..')
            ],
            waitTimeout: timeout
        });
        return app.start();
    };

    before(function() {
        return startApp().then(function(app) {
            chaiAsPromised.transferPromiseness = app.transferPromiseness;
            return app.client.waitUntilWindowLoaded().then(() => {
                app.client.execute(function() {
                    adb = require('electron').remote.require('./main-process/db');
                    fakeEntries = require('./test/fakeentries.json');
                })
            });
        });
    });

    after(function() {
        if (app && app.isRunning()) {
            return app.stop();
        }
    });

    it('remove all entry', function() {
        return app.client.executeAsync(function(done) {
            return adb.clear().then(done, done);
        }).then(function(result) {
            result.value.should.be.a('number');
        });
    });

    it('save entry "ipad"', function() {
        return app.client.executeAsync(function(done) {
            return adb.save({
                "caption": "ipad",
                "category": "tablet",
                "content": "is a tablet"
            }).then(done, done);
        }).then(function(result) {
            result.value.should.be.a('array');
            result.value[0].should.be.equal(1);
            result.value[1].should.to.have.property('name', 'IPAD');
        });
    });

    it('remove entry "ipad" by caption', function() {
        return app.client.executeAsync(function(done) {
            return adb.remove('iPad').then(done, done);
        }).then(function(result) {
            result.value.should.be.a('number').to.equal(1);
        });
    });

    it('check count is zero', function() {
        return app.client.executeAsync(function(done) {
            return adb.count().then(done, done);
        }).then(function(result) {
            return result.value;
        }).should.eventually.be.a('number').to.equal(0);
    });

    it('use caption with spaces', function() {
        return app.client.executeAsync(function(done) {
            return adb.save({
                "caption": " homo sapiens  sapiens "
            }).then(done, done);
        }).then(function(result) {
            result.value.should.be.a('array');
            result.value[0].should.be.equal(1);
            result.value[1].should.to.have.property('name', 'HOMO SAPIENS SAPIENS');
        });
    });

    it('try to save entry with empty caption', function() {
        return app.client.executeAsync(function(done) {
            return adb.save({
                "caption": " "
            }).then(done, done);
        }).then(function(result) {
            result.value.should.be.a('object').to.have.property('name', 'Error');
        });
    });

    it('try to save entry with "null" caption', function() {
        return app.client.executeAsync(function(done) {
            return adb.save({
                "caption": null
            }).then(done, done);
        }).then(function(result) {
            result.value.should.be.a('object').to.have.property('name', 'Error');
        });
    });

    it('try to save entry with "undefined" caption', function() {
        return app.client.executeAsync(function(done) {
            return adb.save({
                "caption": undefined
            }).then(done, done);
        }).then(function(result) {
            result.value.should.be.a('object').to.have.property('name', 'Error');
        });
    });

    it('try to save entry without caption', function() {
        return app.client.executeAsync(function(done) {
            return adb.save({
                "category": "tablet"
            }).then(done, done);
        }).then(function(result) {
            result.value.should.be.a('object').to.have.property('name', 'Error');
        });
    });

    it('change entry caption', async function() {
        return app.client.executeAsync(function(done) {
            const changeCaption = async function() {
                const entry = await adb.findByName('homo sapiens sapiens');
                entry.caption = 'homo herectus';
                const [, newEntry] = await adb.save(entry);
                if (entry._id === newEntry._id) return newEntry;
                else throw `not equals id ${entry._id} === ${newEntry._id}`;
            };
            return changeCaption().then(done, done);
        }).then(function(result) {
            result.value.should.to.have.property('name', 'HOMO HERECTUS');
        });
    });

    it('entry with old caption no longer exists', function() {
        return app.client.executeAsync(function(done) {
            return adb.findByName('homo sapiens sapiens').then(done, done);
        }).then(function(result) {
            result.should.have.property('value').to.be.null;
        });
    });

    it('bulk insert entries', function() {
        return app.client.executeAsync(function(done) {
            return adb.bulkInsert(fakeEntries).then(done, done);
        }).then(function(result) {
            result.value.should.be.a('array').to.have.lengthOf.above(0);
        });
    });

    it('find entry with name "Jacquelynn Bongiorno"', function() {
        return app.client.executeAsync(function(done) {
            return adb.findByName('Jacquelynn Bongiorno').then(done, done);
        }).then(function(result) {
            result.value.should.be.a('object').to.have.property('name', 'JACQUELYNN BONGIORNO');
        });
    });

    it('search "brock"', function() {
        return app.client.executeAsync(function(done) {
            return adb.search('brock').then(done, done);
        }).then(function(result) {
            result.value.should.be.a('array').to.have.lengthOf(2);
        });
    });

    it('search "Daniella Dicks"', function() {
        return app.client.executeAsync(function(done) {
            return adb.search('daniella dicks').then(done, done);
        }).then(function(result) {
            result.value.should.be.a('array').to.have.lengthOf(2);
        });
    });

    it('search "Adélaïde"', function() {
        return app.client.executeAsync(function(done) {
            return adb.search('ADÉLAÏDE').then(done, done);
        }).then(function(result) {
            result.value.should.be.a('array').to.have.lengthOf(1);
        });
    });

    // it('search "Adélaïde" without accents', function() {
    //     return app.client.executeAsync(function(done) {
    //         return adb.search('adelaide').then(done, done);
    //     }).then(function(result) {
    //         result.value.should.be.a('array').to.have.lengthOf(1);
    //     });
    // });

    it('search words with accents', function() {
        return app.client.executeAsync(function(done) {
            return adb.search('èòàù').then(done, done);
        }).then(function(result) {
            result.value.should.be.a('array').to.have.lengthOf(1);
        });
    });

    it('search words with single quote', function() {
        return app.client.executeAsync(function(done) {
            return adb.search('po\'').then(done, done);
        }).then(function(result) {
            result.value.should.be.a('array').to.have.lengthOf(1);
        });
    });

    it('search words with double quote', function() {
        return app.client.executeAsync(function(done) {
            return adb.search('\"èòàù\"').then(done, done);
        }).then(function(result) {
            result.value.should.be.a('array').to.have.lengthOf(1);
        });
    });

    it('search words with special chars', function() {
        return app.client.executeAsync(function(done) {
            return adb.search('100%').then(done, done);
        }).then(function(result) {
            result.value.should.be.a('array').to.have.lengthOf(1);
        });
    });

    it('search words with curly brackets', function() {
        return app.client.executeAsync(function(done) {
            return adb.search('{\"a\": ').then(done, done);
        }).then(function(result) {
            result.value.should.be.a('array').to.have.lengthOf(1);
        });
    });

    it('search words with kanji', function() {
        return app.client.executeAsync(function(done) {
            return adb.search('士郎').then(done, done);
        }).then(function(result) {
            result.value.should.be.a('array').to.have.lengthOf(1);
        });
    });

    it('search words with hiragana', function() {
        return app.client.executeAsync(function(done) {
            return adb.search('しろう').then(done, done);
        }).then(function(result) {
            result.value.should.be.a('array').to.have.lengthOf(1);
        });
    });

    it('search category "code"', function() {
        return app.client.executeAsync(function(done) {
            return adb.search('code').then(done, done);
        }).then(function(result) {
            result.value.should.be.a('array').to.have.lengthOf(1);
        });
    });

    it('search tag "fake"', function() {
        return app.client.executeAsync(function(done) {
            return adb.search('fake').then(done, done);
        }).then(function(result) {
            result.value.should.be.a('array').to.have.lengthOf.above(1);
        });
    });

    it('find by category', function() {
        return app.client.executeAsync(function(done) {
            return adb.findByCategory(' Code').then(done, done);
        }).then(function(result) {
            result.value.should.be.a('array').to.have.lengthOf(1);
        });
    });

});
