var FaciaTool = require('aws-s3-facia-tool');
var _ = require('lodash');
var mkdirp = require('mkdirp');
var path = require('path');
var fs = require('fs');

var tool = new FaciaTool({
    'bucket': 'facia-tool-store',
    'env': 'CODE',
    'configKey': 'frontsapi/config/config.json'
});

var collectionIds = [
	'e59785e9-ba82-48d8-b79a-0a80b2f9f808',
	'1846430f-d0e4-48ab-9ed7-b625e5685d56'
];

var collectionsThatChanged = [];
var frontsThatChanged = [];

tool.fetchConfig()
.then(writeToDisk('original/config.json'))
.then(brandCollections)
.then(writeToDisk('transformed/config.json'))
.then(summary)
.catch(console.error);

function writeToDisk (destination) {
	return function (config) {
		var fullDestination = path.join(__dirname, 'tmp', destination);
		mkdirp.sync(path.dirname(fullDestination));
		fs.writeFileSync(fullDestination, JSON.stringify(config.json, null, '\t'), 'utf-8');

		return config;
	};
}

function brandCollections (config) {
	return {
		json: Object.assign({}, config.json, rewrite(config.json.collections))
	};
}

function rewrite (collections) {
	var rewritten = {};
	for (var id in collections) {
		rewritten[id] = Object.assign({}, collections[id]);
		if (collectionIds.indexOf(id) !== -1) {
			rewritten[id].metadata = (rewritten[id].metadata || []).filter(function (tag) {
				return tag.type !== 'Branded';
			}).concat([{
				type: 'Branded'
			}]);
			collectionsThatChanged.push(id);
		}
	}
	return {
		collections: rewritten
	};
}

function summary (config) {
	for (var frontId in config.json.fronts) {
		var front = config.json.fronts[frontId];
		if (_.intersection(front.collections, collectionsThatChanged).length > 0) {
			frontsThatChanged.push(frontId);
		}
	}

	console.log('I\'ve rewritten ' + collectionsThatChanged.length + ' in the following ' +
		frontsThatChanged.length + ' fronts:\n' + frontsThatChanged.join('\n'));
}
