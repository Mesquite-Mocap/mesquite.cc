'use strict';

module.exports = require('./request.js');

/**
 * @callback Request
 * @param {RequestOptions} opts
 * @returns {Response}
 */

/**
 * @typedef {Object} RequestOptions
 * @prop {any} [opts.body]
 * @prop {Object.<String,any>} [opts.form]
 * @prop {Headers} [opts.headers]
 * @prop {String} [opts.method]
 * @prop {Boolean | any} [opts.json]
 * @prop {String} opts.url
 */

/**
 * @typedef {Object} Response
 * @prop {any} body
 * @prop {Headers} headers
 * @prop {Boolean} ok
 * @prop {any} [response] - TODO (browser only)
 * @prop {any} [request] - TODO
 * @prop {String} status
 * @prop {Number} statusCode
 */

/**
 * @typedef {Object.<String,String|Array<String>>} Headers
 */
