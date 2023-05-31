const FormData = require('form-data');
const fs = require('fs').promises;
const moment = require('moment');
const _ = require('lodash');
const { default: axios } = require('axios');

function isCachedRequest(entry) {
    var response = entry.response;
    var resBodySize = Math.max(0, response.bodySize || 0, response._transferSize || 0);
    return (response.status == 304 || (resBodySize === 0 && response.content && response.content.size > 0));
};

async function load(file, options) {
    options = options || {};
    options.timeout = _.isNumber(options.timeout) ? options.timeout : 60000;
    options.replayCachedEntries = _.isBoolean(options.replayCachedEntries) ? options.replayCachedEntries : false;

    const axiosModule = options.axios || axios;

    const contents = await fs.readFile(file);
    const har = JSON.parse(contents);

    if (_.isUndefined(har) || 
        _.isUndefined(har.log) || 
        _.isUndefined(har.log.entries) ||
        har.log.entries.length === 0) {
        if (options.onFinish)
            options.onFinish();
        return;
    }

    const onFinish = _.after(har.log.entries.length, function() {
        if (options.onFinish)
            options.onFinish();
    });
    const firstTime = moment(har.log.entries[0].startedDateTime);
    _.forEach(har.log.entries, (entry) => {
        if (options.replayCachedEntries || !isCachedRequest(entry)) {
            const delay = moment(entry.startedDateTime).diff(firstTime, 'miliseconds');
            const request = entry.request;

            if (request.postData && _.isUndefined(request.postData.params))
                request.postData.params = [];
            _.delay(async () => {
                try {
                    const headers = {};
                    let data;
                    _.forEach(request.headers, function(header) {
                        if (header.name.indexOf(':') !== 0)
                            headers[header.name] = header.value;
                    });
                    if (options.beforeRequest) {
                        let cont = options.beforeRequest(request);
                        if (cont && cont.then)
                            cont = await cont;
                        if (_.isBoolean(cont) && !cont) {
                            onFinish();
                            return;
                        }
                    }

                    if (request.postData) {
                        const form = new FormData();
                        _.forEach(request.postData.params, (p) => {
                            if (p.fileName) {
                                form.append(p.name, p.value ? Buffer.from(p.value) : fs.createReadStream(p.fileName), p.fileName);
                            } else if (p.value) {
                                form.append(p.name, p.value);
                            }
                        });
                        data = form;
                    }

                    const response = await axiosModule.request({
                        method: request.method,
                        url: request.url,
                        headers,
                        data,
                        timeout: options.timeeout
                    });
                    if(response && options.onResponse)
                        options.onResponse(response, request);
                } catch (err) {
                    if (options.onError)
                        options.onError(err, entry.request);
                }
                onFinish();
            }, delay);
        } else {
            onFinish();
        }
    });
}

module.exports.load = load;
