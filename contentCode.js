var FaciaTool = require('aws-s3-facia-tool');
var _ = require('lodash');
var mkdirp = require('mkdirp');
var path = require('path');
var fs = require('fs');
var async = require('async');
var request = require('request');
var Promise = require('es6-promise').Promise;

var tool = new FaciaTool({
    'bucket': 'aws-frontend-store',
    'env': 'FABIO',
    'configKey': 'frontsapi/config/config.json',
    'collectionsPrefix': 'frontsapi/collection',
    'maxParallelRequests': 6
});

tool.fetchConfig()
.then(filterFronts)
.then(generateMigrationVideoFromDisk)
.then(generateMigrationGalleryFromDisk)
.then(generateMigrationCartoonsFromDisk)
.then(fetchCollectionContent)
.then(filterCollections)
.then(replaceCapi)
.then(generatePaths)
.then(logDisappeared)
.then(storeOriginalOnDisk)
.then(applyTransform)
.then(findAffectedFronts)
.then(storeTransformedOnDisk)
.then(function (model) {
	console.log([
		'',
		'I have rewritten ' + model.collections.length + ' collections',
		'and ' + model.articles.length + ' unique articles, ' + model.totalArticles + ' articles in total',
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

function filterFronts (config) {
	console.log('Getting the configuration from ' + tool.options.env);
	return {
		collections: _(config.json.fronts)
			// .filter({ priority: 'commercial' })
			// .filter(interestingFronts)
			.pluck('collections')
			.flatten()
			.uniq()
			// .take(10)
			// .takeRight(20)
			.value(),
		config: config
	};
}

var IOnlyWantThese = [
'cities'
];
function interestingFronts (front, name) {
	if (IOnlyWantThese.length) {
		return IOnlyWantThese.indexOf(name) !== -1;
	} else {
		return true;
	}
}

function generateMigrationVideoFromDisk (model) {
	var filePath = '/tmp/migrated-ids.txt';
	console.log('Trying to read file', filePath);
	return new Promise(function (resolve, reject) {
		fs.readFile(filePath, function (err, data) {
			if (err) {
				reject(err);
			} else {
				model.migratedIds = understandMigrationOfVideos(data.toString());
				resolve(model);
			}
		});
	});
}

function generateMigrationGalleryFromDisk (model) {
	var filePath = '/tmp/fabio_report.txt';
	console.log('Trying to read file', filePath);
	return new Promise(function (resolve, reject) {
		fs.readFile(filePath, function (err, data) {
			if (err) {
				reject(err);
			} else {
				model.migratedIds = understandCommaSeparatedText(data.toString());
				resolve(model);
			}
		});
	});
}

function generateMigrationCartoonsFromDisk (model) {
	var filePath = '/tmp/recentCartoons.txt';
	console.log('Trying to read file', filePath);
	return new Promise(function (resolve, reject) {
		fs.readFile(filePath, function (err, data) {
			if (err) {
				reject(err);
			} else {
				model.migratedIds = understandCommaSeparatedText(data.toString());
				resolve(model);
			}
		});
	});
}

function understandMigrationOfVideos (data) {
	var map = {};
	data.split('\n').forEach(function (line) {
		var match = line.match(/(\d{8,10})\s+(\d{6,8})/);
		if (match) {
			map['internal-code/content/' + match[1]] = 'internal-code/page/' + match[2];
		}
	});
	return map;
}

function understandCommaSeparatedText (data) {
	var map = {};
	data.split('\n').forEach(function (line) {
		var match = line.match(/(\d{8,10}),(\d{6,8})/);
		if (match) {
			map['internal-code/content/' + match[1]] = 'internal-code/page/' + match[2];
		}
	});
	return map;
}

function fetchCollectionContent (model) {
	console.log('Fetching ' + model.collections.length + ' collections');
	return tool.findCollections(model.collections).then(function (collections) {
		model.collections = collections;
		return model;
	});
}

function filterCollections (model) {
	var filtered = [],
		articles = [];

	model.collections.forEach(function (collection) {
		var wantsChanges = false;
		collection.raw.live.forEach(function (item) {
			if (item.id.indexOf('internal-code/content/') === 0) {
				articles.push({
					id: item.id,
					collection: collection.id
				});
				wantsChanges = true;
			}
			if (item.meta && item.meta.supporting) {
				item.meta.supporting.forEach(function (supp) {
					if (supp.id.indexOf('internal-code/content/') === 0) {
						articles.push({
							id: supp.id,
							collection: collection.id
						});
						wantsChanges = true;
					}
				});
			}
		});
		if (collection.raw.draft) {
			collection.raw.draft.forEach(function (item) {
				if (item.id.indexOf('internal-code/content/') === 0) {
					articles.push({
						id: item.id,
						collection: collection.id
					});
					wantsChanges = true;
				}
				if (item.meta && item.meta.supporting) {
					item.meta.supporting.forEach(function (supp) {
						if (supp.id.indexOf('internal-code/content/') === 0) {
							articles.push({
								id: supp.id,
								collection: collection.id
							});
							wantsChanges = true;
						}
					});
				}
			});
		}
		if (collection.raw.previously) {
			collection.raw.previously.forEach(function (item) {
				if (item.id.indexOf('internal-code/content/') === 0) {
					articles.push({
						id: item.id,
						collection: collection.id
					});
					wantsChanges = true;
				}
				if (item.meta && item.meta.supporting) {
					item.meta.supporting.forEach(function (supp) {
						if (supp.id.indexOf('internal-code/content/') === 0) {
							articles.push({
								id: supp.id,
								collection: collection.id
							});
							wantsChanges = true;
						}
					});
				}
			});
		}

		if (wantsChanges) {
			filtered.push(collection);
		}
	});
	model.collections = filtered;
	model.totalArticles = articles.length;
	model.articlesInfo = articles;
	model.articles = _.uniq(_.pluck(articles, 'id'));
	return model;
}

function replaceCapi (model) {
	var idMap = {};
	return new Promise(function (resolve, reject) {
		var articlesNeedCapiRequest = model.articles.filter(function (article) {
			if (model.migratedIds && model.migratedIds[article]) {
				idMap[article] = model.migratedIds[article];
				return false;
			} else {
				return true;
			}
		});

		async.parallelLimit(_.chunk(articlesNeedCapiRequest, 20).map(function (ids) {
			return function (callback) {
				var url = ['https://redacted-content-api-host/search',
					'?api-key=fabio-wants-to-get-rid-of-contentCode',
					'&show-fields=internalContentCode,internalPageCode',
					'&page-size=50',
					'&ids=' + ids.join(',')
				].join('');

				request.get(url, {
					'auth': {
						'user': 'redacted-user',
						'pass': 'redacted-password'
					}
				}, function (err, resp, body) {
					if (err) {
						callback(err);
					} else {
						try {
							var json = JSON.parse(body).response;
							json.results.forEach(function (result) {
								idMap[
									'internal-code/content/' + result.fields.internalContentCode
								] = 'internal-code/page/' + result.fields.internalPageCode;
							});
							callback();
						} catch (ex) {
							callback(ex);
						}
					}
				});
			};
		}), 10, function (err) {
			if (err) {
				reject(err);
			} else {
				model.idMap = idMap;
				resolve(model);
			}
		});
	});
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

function logDisappeared (model) {
	var collections = [];
	var disappearedArticles = [];

	model.articlesInfo.forEach(function (article) {
		if (!model.idMap[article.id]) {
			collections.push(article.collection);
			disappearedArticles.push(article);
		}
	});
	collections = _.uniq(collections);
	console.log(disappearedArticles.length, 'disappeared from', collections.length, 'collections');

	if (disappearedArticles.length) {
		var modelForAffected = {
			collections: _.filter(model.collections, function (collection) {
				return _.contains(collections, collection.collection.id);
			}),
			config: model.config
		};
		findAffectedFronts(modelForAffected);
		console.log('Fronts with disappearing content\n\t' + modelForAffected.fronts.join('\n\t'));

		disappearedArticles.forEach(function (article) {
			var fronts = model.config.fronts.find({'config.collections': article.collection}).map(function (front) {
				return front.id;
			});
			console.log('Article with ID', article.id, 'disappeared from fronts', fronts.join(', '), 'collection', article.collection);
		});
	}
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
		collection.transformed = replaceIDs(collection.original, model.idMap);
		return collection;
	});
	return model;
}

function replaceIDs (originalCollection, idMap) {
	var modified = _.cloneDeep(originalCollection);
	modified.live.forEach(function (item) {
		if (item.id in idMap) {
			item.id = idMap[item.id];
		}
		if (item.meta && item.meta.supporting) {
			item.meta.supporting.forEach(function (supp) {
				if (supp.id in idMap) {
					supp.id = idMap[supp.id];
				}
			});
		}
	});
	if (modified.draft) {
		modified.draft.forEach(function (item) {
			if (item.id in idMap) {
				item.id = idMap[item.id];
			}
			if (item.meta && item.meta.supporting) {
				item.meta.supporting.forEach(function (supp) {
					if (supp.id in idMap) {
						supp.id = idMap[supp.id];
					}
				});
			}
		});
	}
	if (modified.previously) {
		modified.previously.forEach(function (item) {
			if (item.id in idMap) {
				item.id = idMap[item.id];
			}
			if (item.meta && item.meta.supporting) {
				item.meta.supporting.forEach(function (supp) {
					if (supp.id in idMap) {
						supp.id = idMap[supp.id];
					}
				});
			}
		});
	}

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
