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
.then(filterCommercialCollections)
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

function filterCommercialCollections(config) {
	console.log('Getting the configuration from ' + tool.options.env);
	return {
		collections: _(config.json.fronts)
			.filter({ priority: 'commercial' })
			.pluck('collections')
			.flatten()
			.uniq()
			// .take(30)
			.value(),
		config: config
	};
}

function fetchCollectionContent(model) {
	console.log('Fetching ' + model.collections.length + ' commercial collections');
	return tool.findCollections(model.collections).then(function (collections) {
		model.collections = collections;
		return model;
	});
}

function filterCollections(model) {
	model.collections = tool.query({
		raw: {
			live: {
				meta: {
					$and: [
						{ snapType: { $exists: false } },
						{ href: { $exists: true } }
					]
				}
			}
		}
	}, model.collections);
	return model;
}

function generatePaths(model) {
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

function storeOriginalOnDisk(model) {
	model.collections.forEach(function (collection) {
		writeTo(collection.originalPath, collection.original);
	});
	return model;
}

function writeTo(fileName, json) {
	console.log('Writing file to: ' + fileName);
	mkdirp.sync(path.dirname(fileName));
	fs.writeFileSync(fileName, JSON.stringify(json, null, '    '));
}

function applyTransform(model) {
	model.collections = model.collections.map(function (collection) {
		collection.transformed = addSnapType(collection.original);
		return collection;
	});
	return model;
}

function addSnapType(collection) {
	var modified = _.cloneDeep(collection);
	modified.live = modified.live.map(function (article) {
		if (article.meta && article.meta.href && !article.meta.snapType) {
			article.meta.snapType = 'link';

			if (article.meta.href.indexOf('http://www.theguardian.com') === 0) {
				article.meta.href = article.meta.href.substring('http://www.theguardian.com'.length);
			} else if (article.meta.href.indexOf('https://www.theguardian.com') === 0) {
				article.meta.href = article.meta.href.substring('https://www.theguardian.com'.length);
			}
		}
		return article;
	});
	return modified;
}

function findAffectedFronts(model) {
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

function storeTransformedOnDisk(model) {
	model.collections.forEach(function (collection) {
		writeTo(collection.destinationPath, collection.transformed);
	});
	return model;
}
