'use strict';

var Promise = require('promise');
var _ = require('underscore');
var $ = require('jquery');
var ResourceManager = require('resource-manager-js');

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
     * @param {Object} [options] - An object of options
     * @param {HTMLElement} [options.el] - The module element
     */
    initialize: function (options) {

        this.options = _.extend({}, {
            el: null
        }, options);

        this._handleElementInitialState();

        this.subModules = {};
    },

    /**
     * A function that fires when the module's load() method is called
     * which can be overridden by subclass custom implementations.
     * @abstract
     * @return {*} May return a promise when done
     * @param options
     */
    onLoad: function (options) {
        return Promise.resolve();
    },

    /**
     * A function that fires when the module's show() method is called
     * which can be overridden by subclass custom implementations.
     * @abstract
     * @return {*} May return a promise when done
     */
    onShow: function () {
        return Promise.resolve();
    },

    /**
     * A function that fires when the module's hide() method is called
     * which can be overridden by subclass custom implementations.
     * @abstract
     * @return {*} May return a promise when done
     */
    onHide: function () {
        return Promise.resolve();
    },

    /**
     * A function that fires when the module's enable() method is called
     * which can be overridden by subclass custom implementations.
     * @abstract
     * @returns {*|Promise} Optionally return a promise when done
     */
    onEnable: function () {
        return Promise.resolve();
    },

    /**
     * A function that fires when the module's disable() method is called
     * which can be overridden by subclass custom implementations.
     * @abstract
     * @returns {*|Promise} Optionally return a promise when done
     */
    onDisable: function () {
        return Promise.resolve();
    },

    /**
     * A function that fires when the error() method is called
     * which can be overridden by subclass custom implementations.
     * @abstract
     * @returns {*|Promise} Optionally return a promise when done
     */
    onError: function () {
        return Promise.resolve();
    },

    /**
     * Loads.
     * @param {Object} options - Options
     * @return {Promise}
     */
    load: function (options) {
        var views = _.values(this.subModules),
            el = this.options.el;
        // load all subModules
        if (!this.loaded) {
            return Promise.all(_.invoke(views, 'load')).then(function () {
                return this._ensurePromise(this.onLoad(options))
                    .then(function () {
                        this.loaded = true;
                        if (el) {
                            el.classList.add('module-loaded');
                        }
                    }.bind(this))
                    .catch(function (e) {
                        this.error(e);
                    }.bind(this));
            }.bind(this));
        } else {
            return Promise.resolve();
        }
    },

    /**
     * Triggers a load error on the module.
     * @param {Error} [e] - The error to trigger
     * @return {Promise} Returns a promise when erroring operation is complete
     */
    error: function (e) {
        var el = this.options.el;

        e = e || new Error();

        if (el) {
            el.classList.add('module-error');
        }
        this.error = true;
        console.log('MODULE ERROR!');
        if (e.stack) {
            console.log(e.stack);
        }
        this.loaded = false;
        return this._ensurePromise(this.onError(e));
    },

    /**
     * Enables the module.
     * @return {Promise}
     */
    enable: function () {
        var el = this.options.el;
        if (el) {
            el.classList.remove('module-disabled');
        }
        this.disabled = false;
        return this._ensurePromise(this.onEnable());
    },

    /**
     * Disables the module.
     * @return {Promise}
     */
    disable: function () {
        var el = this.options.el;
        if (el) {
            el.classList.add('module-disabled');
        }
        this.disabled = true;
        return this._ensurePromise(this.onDisable());
    },

    /**
     * Shows the page.
     * @return {Promise}
     */
    show: function () {
        var el = this.options.el;
        if (!this.loaded) {
            console.warn('Module show() method was called before its load() method.');
        }
        if (el) {
            el.classList.add('module-active');
        }
        return this._ensurePromise(this.onShow());
    },

    /**
     * Hides the page.
     * @return {Promise}
     */
    hide: function () {
        var el = this.options.el;
        if (!this.loaded) {
            console.warn('Module hide() method was called before its load() method.');
        }
        if (el) {
            el.classList.remove('module-active');
        }
        return this._ensurePromise(this.onHide());
    },

    /**
     * Sets up element internally by evaluating its initial state.
     * @private
     */
    _handleElementInitialState: function () {
        var el = this.options.el;
        if (!el) {
            return;
        }
        if (el.classList.contains('module-disabled')) {
            this._origDisabled = true;
            this.disable();
        }

        if (el.classList.contains('module-error')) {
            this._origError = true;
            this.error(new Error());
        }
    },

    /**
     * Restores the elements classes back to the way they were before instantiation.
     * @private
     */
    _resetElementInitialState: function () {
        var el = this.options.el;
        if (!el) {
            return;
        }
        if (this._origDisabled) {
            el.classList.add('module-disabled');
        } else {
            el.classList.remove('module-disabled');
        }

        if (!this._origError) {
            el.classList.remove('module-error');
        } else {
            el.classList.add('module-error');
        }
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
     * Makes a request to get the data for the module.
     * @param {string} url - The url to fetch data from
     * @param [options] - ajax options
     * @returns {*}
     */
    fetchData: function (url, options) {
        return ResourceManager.fetchData(url, options);
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

        this._resetElementInitialState();
    }

};


module.exports = Module;