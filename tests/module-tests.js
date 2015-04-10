var sinon = require('sinon');
var assert = require('assert');
var Promise = require('promise');
var ResourceManager = require('resource-manager-js');

describe('Module', function () {
    it('should return correct instance when extending', function () {
        var Module = require('module');
        var prop = 'myProp';
        var method = function () {};
        var customClassProps = {my: prop, custom: method};
        var CustomClass = Module.extend(customClassProps);
        var customInstance = new CustomClass();
        assert.equal(customInstance.my, prop, 'after extending Module, custom class has its own property');
        assert.equal(customInstance.custom, method, 'custom class has its own method');
        customInstance.destroy();
    });

    it('should call its subclasses initialize method when subclass is instantiated', function () {
        var Module = require('module');
        var method = function () {};
        var customClassProps = {initialize: sinon.spy()};
        var CustomClass = Module.extend(customClassProps);
        assert.equal(customClassProps.initialize.callCount, 0, 'subclasses initialize method was not called because it hasnt been instantiated');
        var customInstance = new CustomClass();
        assert.equal(customClassProps.initialize.callCount, 1, 'after subclass is instantiated, its initialize method is called');
        customInstance.destroy();
    });

    it('should have its prototype method called when an overriding subclass method calls it', function () {
        var Module = require('module');
        var method = function () {};
        var CustomClass = Module.extend({
            initialize: function () {
                Module.prototype.initialize.call(this);
            }
        });
        sinon.stub(Module.prototype, 'initialize');
        var customInstance = new CustomClass();
        assert.equal(Module.prototype.initialize.callCount, 1, 'Module\'s initialize method is called when custom class overrides it, but calls its prototype');
        Module.prototype.initialize.restore();
        customInstance.destroy();
    });

    it('should pass subclass constructor options back to the subclass\'s initialize method', function () {
        var Module = require('module');
        var customClassInitializeSpy = sinon.spy();
        var CustomClass = Module.extend({initialize: customClassInitializeSpy});
        sinon.stub(Module.prototype, 'initialize');
        var customClassOptions = {does: 'it work?'};
        var customInstance = new CustomClass(customClassOptions);
        assert.deepEqual(customClassInitializeSpy.args[0], [customClassOptions], 'subclass\'s initialize method was called with same options passed to its constructor');
        Module.prototype.initialize.restore();
        customInstance.destroy();
    });

    it('should NOT have its method called, when a method of a two-level nested child instance has the same method name', function () {
        var Module = require('module');
        var subClassProps = {myMethod: sinon.spy()};
        var SubClass = Module.extend(subClassProps);
        var subClassInstance = new SubClass();
        subClassInstance.myMethod();
        assert.equal(subClassProps.myMethod.callCount, 1, '');
    });

    it('should NOT have its method called, when a method of a two-level nested child instance has the same method name', function () {
        var Module = require('module');
        var subClassProps = {testMethod: null};
        var SubClass = Module.extend(subClassProps);
        var subClassedSubClassProps = {testMethod: sinon.spy()};
        var SubClassedSubClass = SubClass.extend(subClassedSubClassProps);
        var subClassedSubClassInstance = new SubClassedSubClass();
        subClassedSubClassInstance.testMethod();
        assert.equal(subClassedSubClassProps.testMethod.callCount, 1, 'when subclass A has a method that overrides the same method of the subclass it inherits from, subclass A gets called');
    });

    it('should not call handle load when already loaded', function (done) {
        var Module = require('module');
        var method = function () {};
        var customClassProps = {_handleLoad: sinon.stub().returns(Promise.resolve())};
        var CustomClass = Module.extend(customClassProps);
        var customInstance = new CustomClass();
        customInstance.load()
            .then(function () {
                assert.equal(customClassProps._handleLoad.callCount, 1, 'on first load() call _handle load was called');
                customInstance.load()
                    .then(function () {
                        assert.equal(customClassProps._handleLoad.callCount, 1, 'on second load() call handle load was not called');
                        customInstance.destroy();
                        done();
                    })
                    .catch(done);
            })
            .catch(done);
    });

    it('should call onLoad() with first argument when load() is called', function () {
        var Module = require('module');
        var module = new Module();
        var onLoadSpy = sinon.spy(module, 'onLoad');
        var mockOptions = {my: 'customModuleOptions'};
        return module.load(mockOptions)
            .then(function () {
                assert.deepEqual(onLoadSpy.args[0][0], mockOptions, 'on load() call onLoad() load was called with first arg passed to load call');
                module.destroy();
                onLoadSpy.restore();
            });
    });

    it('load() method should still return a promise even if onLoad() custom implementation doesnt', function () {
        var Module = require('module');
        var onLoadStub = sinon.stub().returns(null);
        var CustomModule = Module.extend({onLoad: onLoadStub});
        var module = new CustomModule();
        return module.load()
            .then(function () {
                assert.equal(onLoadStub.callCount, 1, 'test passed if this is called');
                module.destroy();
            });
    });

    it('should call onShow() when show() is called', function () {
        var Module = require('module');
        var module = new Module();
        var onShowSpy = sinon.spy(module, 'onShow');
        return module.show()
            .then(function () {
                assert.deepEqual(onShowSpy.callCount, 1, 'onShow() was called');
                module.destroy();
                onShowSpy.restore();
            });
    });

    it('show() method should still return a promise even if onShow() custom implementation doesnt', function () {
        var Module = require('module');
        var onShowStub = sinon.stub().returns(null);
        var CustomModule = Module.extend({onShow: onShowStub});
        var module = new CustomModule();
        return module.show()
            .then(function () {
                assert.equal(onShowStub.callCount, 1, 'test passed if this is called');
                module.destroy();
            });
    });

    it('should call onHide() when hide() is called', function () {
        var Module = require('module');
        var module = new Module();
        var onHideSpy = sinon.spy(module, 'onHide');
        return module.hide()
            .then(function () {
                assert.deepEqual(onHideSpy.callCount, 1, 'onHide() was called');
                module.destroy();
                onHideSpy.restore();
            });
    });

    it('hide() method should still return a promise even if onShow() custom implementation doesnt', function () {
        var Module = require('module');
        var onHideStub = sinon.stub().returns(null);
        var CustomModule = Module.extend({onHide: onHideStub});
        var module = new CustomModule();
        return module.hide()
            .then(function () {
                assert.equal(onHideStub.callCount, 1, 'test passed if this is called');
                module.destroy();
            });
    });

    it('should pass ResourceManager.loadCss() correct parameters when calling getStyles()', function () {
        var Module = require('module');
        var resourceManagerGetStylesStub = sinon.stub(ResourceManager, 'loadCss').returns(Promise.resolve());
        var module = new Module();
        var styleUrls = ['my/styles'];
        return module.getStyles(styleUrls)
            .then(function () {
                assert.deepEqual(resourceManagerGetStylesStub.args[0][0], styleUrls, 'first parameter passed to getStyles was passed to ResourceManager.loadCss()');
                resourceManagerGetStylesStub.restore();
                module.destroy();
            });
    });
});