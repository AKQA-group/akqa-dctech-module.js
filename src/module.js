'use strict';

var Promise = require('promise');
var _ = require('underscore');
var $ = require('jquery');
var ResourceManager = require('resource-manager');

/**
 * @class Module
 * @description Base class that represents all modules of an App.
 */
var Module = function (options) {
    this.initialize(options);
};

/**
 * Extends a class and allows creation of subclasses.
 * @param protoProps
 * @param staticProps
 * @returns {*}
 */
var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
        child = protoProps.constructor;
    } else {
        child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate();

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) {
        _.extend(child.prototype, protoProps);
    }

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
};

Module.extend = extend;

Module.prototype = {

    /**
     * Initialization.
     */
    initialize: function (options) {
        this.options = options;
        this.options = _.extend({}, options);
        this.subModules = {};
    },

    /**
     * A load function that should be overridden by subclass for custom implementations.
     * @abstract
     * @return {*} May returns a promise when done
     * @param options
     */
    onLoad: function (options) {
        // support legacy _handleLoad method
        if (this._handleLoad) {
            return this._handleLoad(options);
        } else {
            return Promise.resolve();
        }
    },

    /**
     * A show function that should be overridden by subclass for custom implementations.
     * @abstract
     * @return {*} May returns a promise when done
     */
    onShow: function () {
        return Promise.resolve();
    },

    /**
     * A hide function that should be overridden by subclass for custom implementations.
     * @abstract
     * @return {*} May returns a promise when done
     */
    onHide: function () {
        return Promise.resolve();
    },

    /**
     * Loads.
     * @param {Object} options - Options
     * @return {Promise}
     */
    load: function (options) {
        var views = _.values(this.subModules);
        // load all subModules
        if (!this.loaded) {
            return Promise.all(_.invoke(views, 'load')).then(function () {
                return this._ensurePromise(this.onLoad(options)).then(function () {
                    this.loaded = true;
                }.bind(this));
            }.bind(this));
        } else {
            return Promise.resolve();
        }
    },

    /**
     * Shows the page.
     * @return {Promise}
     */
    show: function () {
        if (!this.loaded) {
            console.warn('Page show() method was called before its load() method.');
        }
        return this._ensurePromise(this.onShow());
    },

    /**
     * Hides the page.
     * @return {Promise}
     */
    hide: function () {
        if (!this.loaded) {
            console.warn('Page hide() method was called before its load() method.');
        }
        return this._ensurePromise(this.onHide());
    },

    /**
     * Wraps a promise around a function if doesnt already have one.
     * @param func
     * @private
     */
    _ensurePromise: function (func) {
        if (!func || !func.then) {
            func = Promise.resolve();
        }
        return func;
    },

    /**
     * Gets the data for the template to show on the page.
     * @returns {*}
     */
    getData: function (dataUrl) {
        return new Promise(function (resolve, reject) {
            if (dataUrl) {
                var defaultOptions = {
                    url: dataUrl,
                    success: function (data) {
                        data = this.serializeData(data);
                        resolve(data);
                    }.bind(this),
                    error: reject
                };
                $.ajax(defaultOptions);
            } else {
                resolve();
            }
        }.bind(this));
    },

    /**
     * Gets the css files for the module.
     * @param cssUrl
     * @return {Promise}
     */
    getStyles: function (cssUrl) {
        return ResourceManager.loadCss(cssUrl);
    },

    /**
     * Gets the html template for the module.
     * @param templateUrl
     * @returns {Promise|*}
     */
    getTemplate: function (templateUrl) {
        return ResourceManager.loadTemplate(templateUrl);
    },

    /**
     * A function that should overridden that serializes the data for a template.
     * @param data
     * @returns {*}
     */
    serializeData: function (data) {
        return data;
    },

    /**
     * Destroys all nested views and cleans up.
     */
    destroy: function () {
        var subModules = this.subModules;
        for (var key in subModules) {
            if (subModules.hasOwnProperty(key) && subModules[key]) {
                subModules[key].destroy();
            }
        }
        this.subModules = {};
    }

};


module.exports = Module;