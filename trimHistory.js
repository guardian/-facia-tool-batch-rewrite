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
.then(filterFronts)
.then(fetchCollectionContent)
.then(filterCollections)
.then(generatePaths)
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
		'If everything looks fine upload the JSON to S3 with',
		'>   s3cmd sync --acl-public --add-header=Cache-Control:no-cache,no-store tmp/transformed/ s3://aws-frontend-store/',
		'',
		'There are ' + model.fronts.length + ' affected fronts',
		model.fronts.join('\n')
	].join('\n'));
})
.catch(function (err) {
	console.err(err);
});

function generateModel (config) {
	return {
		config: config
	};
}

function filterFronts (model) {
	console.log('Getting the configuration from ' + tool.options.env);

	model.collections = _(model.config.json.fronts)
		// .filter({ priority: 'training' })
		.filter(interestingFronts)
		.pluck('collections')
		.flatten()
		.uniq()
		// .take(10)
		// .takeRight(20)
		.value();

	return model;
}

var IOnlyWantThese = [
'gnm-archive'
];
function interestingFronts (front, name) {
	if (IOnlyWantThese.length) {
		return IOnlyWantThese.indexOf(name) !== -1;
	} else {
		return true;
	}
}

function fetchCollectionContent (model) {
	console.log('Fetching ' + model.collections.length + ' collections');
	return tool.findCollections(model.collections).then(function (collections) {
		model.collections = collections;
		return model;
	});
}

function filterCollections (model) {
	model.collections = model.collections.filter(function (collection) {
		return collection.raw.previously && !!_.find(collection.raw.previously, function (article) {
			return article.id.indexOf('internal-code/content/') === 0;
		});
	});
	return model;
}

function generatePaths (model) {
	model.collections = model.collections.map(function (collection) {
		return {
			originalPath: path.join(__dirname, 'tmp/original', collection._Key),
			destinationPath: path.join(__dirname, 'tmp/transformed', collection._Key),
			original: collection.raw,
			collection: collection
		};
	});
	return model;
}

function storeOriginalOnDisk (model) {
	model.collections.forEach(function (collection) {
		writeTo(collection.originalPath, collection.original);
	});
	return model;
}

function writeTo (fileName, json) {
	console.log('Writing file to: ' + fileName);
	mkdirp.sync(path.dirname(fileName));
	fs.writeFileSync(fileName, JSON.stringify(json, null, '    '));
}

function applyTransform (model) {
	model.collections = model.collections.map(function (collection) {
		collection.transformed = trimHistory(collection.original);
		return collection;
	});
	return model;
}

function trimHistory (originalCollection) {
	var modified = _.cloneDeep(originalCollection);
	modified.previously = modified.previously.filter(function (article) {
		return article.id.indexOf('internal-code/content/') !== 0;
	});

	return modified;
}

function findAffectedFronts (model) {
	model.fronts = _(model.collections)
		.pluck('collection')
		.map(function (collection) {
			return _(model.config.json.fronts)
				.pick(function (front) {
					return _.includes(front.collections, collection.id);
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
	model.collections.forEach(function (collection) {
		writeTo(collection.destinationPath, collection.transformed);
	});
	return model;
}
