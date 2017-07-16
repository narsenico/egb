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
                "name": " ipad ",
                "category": "tablet",
                "content": "is a tablet"
            }).then(done, done);
        }).then(function(result) {
            result.value.should.be.a('array');
            result.value[0].should.be.equal(1);
            result.value[1].should.to.have.property('_id', 'IPAD');
        });
    });

    it('remove entry "ipad" by name', function() {
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

    it('try to save entry with empty name', function() {
        return app.client.executeAsync(function(done) {
            return adb.save({
                "name": " "
            }).then(done, done);
        }).then(function(result) {
            result.value.should.be.a('object').to.have.property('name', 'Error');
        });
    });

    it('try to save entry with "null" name', function() {
        return app.client.executeAsync(function(done) {
            return adb.save({
                "name": null
            }).then(done, done);
        }).then(function(result) {
            result.value.should.be.a('object').to.have.property('name', 'Error');
        });
    });

    it('try to save entry with "undefined" name', function() {
        return app.client.executeAsync(function(done) {
            return adb.save({
                "name": undefined
            }).then(done, done);
        }).then(function(result) {
            result.value.should.be.a('object').to.have.property('name', 'Error');
        });
    });

    it('try to save entry without name', function() {
        return app.client.executeAsync(function(done) {
            return adb.save({
                "category": "tablet"
            }).then(done, done);
        }).then(function(result) {
            result.value.should.be.a('object').to.have.property('name', 'Error');
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
            result.value.should.be.a('object').to.have.property('_id', 'JACQUELYNN BONGIORNO');
        });
    })

    it('search "brock"', function() {
        return app.client.executeAsync(function(done) {
            return adb.search('brock').then(done, done);
        }).then(function(result) {
            result.value.should.be.a('array').to.have.lengthOf(2);
        });        
    })

    // TODO: testare UTF-8
});
