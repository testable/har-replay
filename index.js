const fs = require('fs');
const moment = require('moment');
const request = require('request');
const _ = require('lodash');

function load(file, options) {
    options = options || {};
    options.timeout = _.isNumber(options.timeout) ? options.timeout : 60000;
    const requestModule = options.request || request;

    fs.readFile(file, function(err, contents) {
        if (err) 
            throw err;

        const har = JSON.parse(contents);

        if (_.isUndefined(har) || 
            _.isUndefined(har.log) || 
            _.isUndefined(har.log.entries) ||
            har.log.entries.length === 0)
            return;

        const onFinish = _.after(har.log.entries.length, function() {
            if (options.onFinish)
                options.onFinish();
        });

        const firstTime = moment(har.log.entries[0].startedDateTime);
        _.forEach(har.log.entries, function(entry) {
            const delay = moment(entry.startedDateTime).diff(firstTime, 'miliseconds');

            if (entry.request.postData && _.isUndefined(entry.request.postData.params))
                entry.request.postData.params = [];
            _.delay(function() {
                if (options.beforeRequest)
                    options.beforeRequest(entry.request);
                requestModule({ har: entry.request, timeout: options.timeout }, function(error, response, body) {
                    if (error !== null) {
                        if (options.onError)
                            options.onError(error, entry.request);
                    } else if(response && options.onResponse) {
                        options.onResponse(response, entry.request, body);
                    }
                    onFinish();
                });
            }, delay);
        });
    });
}

module.exports.load = load;
