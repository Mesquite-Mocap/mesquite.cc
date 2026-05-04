(function (exports) {
    'use strict';

    /**
     * @typedef {import('./').Request} Request
     * @typedef {import('./').RequestOptions} RequestOptions
     * @typedef {import('./').Response} Response
     * @typedef {import('./').Headers} Headers
     */

    // `fetch` will be available for node and browsers as a global
    //var fetch = window.fetch;

    // https://developer.mozilla.org/en-US/docs/Web/API/fetch
    // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
    let _fetchDefaults = {
        method: 'GET', // *GET, POST, PATCH, PUT, DELETE, etc
        headers: {},
        body: undefined, // String, ArrayBuffer, FormData, etc
        mode: 'cors', // no-cors, *cors, same-origin
        credentials: 'same-origin', // omit, *same-origin, include
        cache: 'default', // *default, no-store, reload, no-cache, force-cache, only-if-cached
        redirect: 'follow', // *follow, error, manual,
        referrer: undefined,
        referrerPolicy: 'no-referrer-when-downgrade', // no-referrer, *no-referrer-when-downgrade, same-origin, origin, strict-origin, origin-when-cross-origin, strict-origin-when-cross-origin, unsafe-url
        integrity: '',
        keepalive: false,
        signal: null //
    };

    let _optionKeys = Object.keys(_fetchDefaults).concat([
        //'encoding', // N/A
        //'stream', // TODO via getReader
        //'json' // handled manually
        //'form', // TODO
        //'auth' // handled manually
        //'formData', // TODO
        //'FormData', // TODO
        //'userAgent' // not allowed, non-standard for request.js
    ]);

    /**
     * @returns {Request>}
     */
    function setDefaults(_defs) {
        /**
         * @param {RequestOptions} opts
         * @returns {Promise<Response>}
         **/
        async function request(opts) {
            if ('string' === typeof opts) {
                opts = { url: opts };
            }
            let reqOpts = { headers: {} };

            if (
                opts.body ||
                (opts.json && true !== opts.json) ||
                opts.form ||
                opts.formData
            ) {
                // TODO this is probably a deviation from request's API
                // need to check and probably eliminate it
                reqOpts.method = (reqOpts.method || 'POST').toUpperCase();
            } else {
                reqOpts.method = (reqOpts.method || 'GET').toUpperCase();
            }

            _optionKeys.forEach(function (key) {
                if (key in opts) {
                    if ('undefined' !== typeof opts[key]) {
                        reqOpts[key] = opts[key];
                    }
                } else if (key in _defs) {
                    reqOpts[key] = _defs[key];
                }
            });

            if (opts.auth) {
                // if opts.uri specifies auth it will be parsed by url.parse and passed directly to the http module
                if ('string' !== typeof opts.auth) {
                    let u = opts.auth.user || opts.auth.username || '';
                    let p = opts.auth.pass || opts.auth.password || '';
                    reqOpts.headers.Authorization = encodeBasicAuth(
                        `${u}:${p}`
                    );
                } else if ('string' === typeof opts.auth) {
                    reqOpts.headers.Authorization = encodeBasicAuth(
                        `${opts.auth}`
                    );
                }

                // [request-compat]
                if (opts.auth.bearer) {
                    // having a shortcut for base64 encoding makes sense,
                    // but this? Eh, whatevs...
                    reqOpts.header.Authorization = `Bearer ${opts.auth.bearer}`;
                }
            }

            let body;
            if (opts.json && true !== opts.json) {
                if (!opts.headers['content-type']) {
                    opts.headers['content-type'] = 'application/json';
                }
                body = JSON.stringify(opts.json);
                if (!opts.method) {
                    opts.method = 'POST';
                }
            }

            // The node version will send HTTP Auth by default, but not Cookies.
            // We don't have an equivalent option for `fetch`. Furthermore,
            // `fetch` caches HTTP Auth Basic across browser refreshes,
            // which is not analogous to the node behavior.
            //
            // "In the face of ambiguity, refuse the temptation to guess"
            //
            //if (!('credentials' in opts)) {
            //    opts.credentials = 'include';
            //}

            if (!('mode' in opts)) {
                reqOpts.mode = 'cors';
            }
            if (!('body' in opts)) {
                if (body) {
                    reqOpts.body = body;
                }
            }

            let resp = await fetch(opts.url, reqOpts);

            let result = {
                ok: resp.ok,
                headers: headersToObj(resp.headers),
                body: undefined,
                // swapped to match request.js
                statusCode: resp.status,
                status: resp.statusText,
                request: reqOpts,
                response: resp
            };
            result.toJSON = function () {
                return {
                    ok: result.ok,
                    headers: result.headers,
                    body: result.body,
                    statusCode: result.statusCode,
                    status: result.status
                };
            };

            // return early if there's no body
            if (!result.headers['content-type']) {
                return result;
            }

            // TODO blob, formData ?
            if (null === opts.encoding) {
                return await resp.arrayBuffer();
            }

            if (!opts.json) {
                result.body = await resp.text();
            } else {
                result.body = await resp.json().catch(async function () {
                    return await resp.text();
                });
            }
            return result;
        }

        return request;
    }

    /**
     * @param {Iterable.<*>} rheaders
     * @returns {Object.<String, String>}
     */
    function headersToObj(rheaders) {
        /*
    Array.from(resp.headers.entries()).forEach(function (h) {
        headers[h[0]] = h[1];
    });
    */
        let headerNames = Array.from(rheaders.keys());
        let resHeaders = {};
        headerNames.forEach(function (k) {
            resHeaders[k] = rheaders.get(k);
        });
        return resHeaders;
    }

    /**
     * @param {String} utf8
     * @returns {String}
     */
    function encodeBasicAuth(utf8) {
        let b64 = unicodeToBase64(utf8);
        return `Basic ${b64}`;
    }

    /**
     * @param {String} utf8
     * @returns {String}
     */
    function unicodeToBase64(utf8) {
        let str = '';
        let uint8 = new TextEncoder().encode(utf8);
        uint8.forEach(function (b) {
            str += String.fromCharCode(b);
        });
        let b64 = btoa(str);
        return b64;
    }

    let defaultRequest = setDefaults({ mode: 'cors' });
    //@ts-ignore
    exports.urequest = defaultRequest;
    //@ts-ignore
    exports.urequest.defaults = setDefaults;

    // for backwards compat
    if ('undefined' !== typeof module) {
        module.exports = defaultRequest;
        module.exports.defaults = setDefaults;
    }
})(('undefined' !== typeof module && module.exports) || window);
