
const fs = require('fs');
const moment = require('moment');
const request = require('request');
const url = require('url');
const _ = require('lodash');

function load(file, options) {
    options = options || {};
    options.timeout = _.isNumber(options.timeout) ? options.timeout : 60000;

    fs.readFile(file, function(err, contents) {
        if (err) 
            throw err;

        var har = JSON.parse(contents);

        if (_.isUndefined(har) || 
            _.isUndefined(har.log) || 
            _.isUndefined(har.log.entries) ||
            har.log.entries.length === 0)
            return;

        var onFinish = _.after(har.log.entries.length, function() {
            if (options.onFinish)
                options.onFinish();
        });

        var firstTime = moment(har.log.entries[0].startedDateTime);
        _.forEach(har.log.entries, function(entry) {
            if (options.beforeRequest)
                options.beforeRequest(entry.request);
            var delay = moment(entry.startedDateTime).diff(firstTime, 'miliseconds');

            if (entry.request.postData && _.isUndefined(entry.request.postData.params))
                entry.request.postData.params = [];
            _.delay(function() {
                var req = request({ har: entry.request, timeout: options.timeout }, function(error, response, body) {
                    if(response && options.onResponse)
                        options.onResponse(response, entry.request);
                });
                req.on('error', function(error) {
                    if (options.onError)
                        options.onError(error, entry.request);
                    onFinish();
                });
                req.on('end', function() {
                    onFinish();
                });
            }, delay);
        });
    });
}

module.exports.load = load;