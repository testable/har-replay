# HAR Replay Utility

A simple utility to replay the contents of a [HTTP Archive (HAR) file](https://dvcs.w3.org/hg/webperf/raw-file/tip/specs/HAR/Overview.html) while maintaining the delay between requests. Utilizes the [request npm module](https://www.npmjs.com/package/request) to execute the HTTP replay requests.

## Installation

Available on the public NPM registry as `har-replay`.

```
npm install har-replay --save
```

## Example

```javascript
var harReplay = require('har-replay');
harReplay.load('example.har');
```

## API

`harReplay.load(file, [options])`

Load and replay the request in the HAR file found at local path `file`. A delay of `entry.startDateTime - firstEntry.startDateTime` will be applied to all requests after the first one.

**options**

* `timeout`: A timeout (milliseconds) to wait for a reply. Defaults to 1 minute.
* `beforeRequest`: A `function(request) { ... }` to manipulate the request before it is replayed. If this method returns `false` then the request will not be replayed.
* `onResponse`: A `function(response, request, body) { ... }` to process the response that results from a replayed request. `body` refers to the response body.
* `onFinish`: A callback function that gets called once all requests have been replayed and all responses (or errors) have been received.
* `onError`: A `function(error, request) { ... }` callback when any error occurs during replay.
* `replayCachedEntries`: Whether or not to replay requests where the response was loaded from the browser cache. By default this is `false`.

Full Example:

```javscript
var harReplay = require('har-replay');
harReplay.load('example.har', { 
	beforeRequest: function(request) {
		request.headers['Some-New-Header'] = 'abc';
	},
	onResponse: function(response, request, body) {
		console.log('Response status code for ' + request.url + ': ' + response.statusCode);
	},
	onFinish: function() {
		console.log('All done!');
	},
	onError: function(error, request) {
		console.error(error);
	}
});
```
