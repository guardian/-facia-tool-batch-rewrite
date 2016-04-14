var FaciaTool = require('aws-s3-facia-tool');
var _ = require('lodash');
var mkdirp = require('mkdirp');
var path = require('path');
var fs = require('fs');

var tool = new FaciaTool({
    'bucket': 'aws-frontend-store',
    'env': 'PROD',
    'configKey': 'frontsapi/config/config.json',
    'collectionsPrefix': 'frontsapi/collection',
    'maxParallelRequests': 6
});

tool.fetchConfig()
.then(generateModel)
.then(storeOriginalOnDisk)
.then(applyTransform)
.then(findAffectedFronts)
.then(storeTransformedOnDisk)
.then(function (model) {
	console.log([
		'',
		'I have rewritten ' + model.collections.length + ' collections',
		'Please review the diff inside tmp/',
		'',
		'If everything looks fine upload the config JSON to S3',
		'',
		'There are ' + model.fronts.length + ' affected fronts',
		model.fronts.join('\n')
	].join('\n'));
});

function generateModel (config) {
	return {
		config: config,
		original: config.json,
		transformed: null,
		fronts: [],
		collections: []
	};
}

function storeOriginalOnDisk (model) {
	writeTo('original/config.json', model.original);
	return model;
}

function writeTo (fileName, json) {
	fileName = path.join(__dirname, 'tmp', fileName);
	console.log('Writing file to: ' + fileName);
	mkdirp.sync(path.dirname(fileName));
	fs.writeFileSync(fileName, JSON.stringify(json, null, '    '));
}

function applyTransform (model) {
	var transformedCollections = {};
	for (var key in model.original.collections) {
		var collection = model.original.collections[key];
		var newCollection = Object.assign({}, collection);
		if (collection.backfill && collection.backfill.type === 'capi'
			&& collection.backfill.query.indexOf('/') === 0)
		{
			newCollection.backfill = {
				type: 'capi',
				query: collection.backfill.query.replace(/^\/+/, '')
			};
			model.collections.push(key);
		}
		transformedCollections[key] = newCollection;
	}

	model.transformed = {
		fronts: model.original.fronts,
		collections: transformedCollections
	};
	return model;
}

function findAffectedFronts (model) {
	model.fronts = _(model.collections)
		.map(function (collectionId) {
			return _(model.config.json.fronts)
				.pick(function (front) {
					return _.includes(front.collections, collectionId);
				})
				.keys()
				.value();
		})
		.flatten()
		.uniq()
		.value();
	return model;
}

function storeTransformedOnDisk (model) {
	writeTo('transformed/config.json', model.transformed);
	return model;
}
