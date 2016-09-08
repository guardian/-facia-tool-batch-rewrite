var FaciaTool = require('aws-s3-facia-tool');
var _ = require('lodash');
var mkdirp = require('mkdirp');
var path = require('path');
var fs = require('fs');

var tool = new FaciaTool({
    'bucket': 'facia-tool-store',
    'env': 'PROD',
    'configKey': 'frontsapi/config/config.json'
});

var collectionIds = [
    'b07ffc65-263d-46cb-a7c3-bb5a01d8f4fe',
    'cf693b4c-7967-4247-8751-506e46b50058',
    'eb253d98-2dda-466b-880e-83e471bba7d2',
    '1867ff74-8998-47c0-9f76-be74afb9bcd3',
    '349ac67d-0467-420d-ad36-89f74d1eace9',
    '674d2623-1822-4f70-a3a4-da75c64c799e',
    '40b7616b-9ef2-49a7-b208-deb84d335c54',
    'fa2a376e-5ba1-4020-b272-46c4f9296a80',
    'ed3ac55e-b988-4afb-b52b-7fef0e545853',
    'e4bafce3-1f98-4f65-89bd-c7e141e84320',
    '040b71a8-140d-4c50-a0b1-55b9680d071f',
    '8ea50906-d03b-4c7d-9e65-6b9a425a42a4',
    '22efe98a-90de-4d4c-a089-75b424bd008a',
    '82ae9a94-1e72-4401-9e61-33f1eb39b568',
    'f1e963c3-3516-4807-ae7a-c5b9edb41821',
    '1b389a8b-7a32-46f2-b70b-841d05ba7878',
    '26a6eb81-74da-4818-91cd-ad24df8b5e38',
    '349ac67d-0467-420d-ad36-89f74d1eace9',
    '53597c32-b7b4-440e-9adc-3a31959ee4ea',
    'adbe28d4-f0fa-4181-8e2a-b2356438fe42',
    '24894261-d813-4313-ba1d-9e406ce4ef0c',
    '1c193035-8ee4-443c-9319-1e8e54fc9249',
    'e23c4964-b5ad-4116-a790-95a0df01994a',
    'f00756df-c7bc-4294-95d0-5adc77334577',
    'a4de1c1b-f325-43a3-8646-e7ec9af59c68',
    'b93bd2de-8fd0-4a64-b5e8-461b04dc6d92',
    '47251625-c6aa-40ec-8471-d02b9042f639',
    '8e38a9f2-a321-4e19-a9c1-8230dcc679a3',
    '8c8fe971-9f7e-46d4-8270-33d341d93d28',
    'd03ed2e0-f09f-47bd-8584-033b5371730f',
    '247974d4-fafc-4765-9cc8-2bc35f96a8c4',
    '69ea80a5-132e-47cc-96e5-2419bf065094',
    'fe8d07b3-c0e1-41da-972f-3a81f4e720a2',
    '355abe85-158a-4b90-be33-ef5eca25af8e',
    'f2abeb3b-ed32-48ee-936c-a55d0ff05802',
    '41c14538-1ce2-4c14-822d-f8e0b6e5bc42',
    '3c01073a-b8a3-46b3-bd34-65518d74a223',
    'b53ebb45-27d6-421d-8d55-cf2722993a3d',
    '97265f7e-cd8a-4e4b-b831-632af4bdec1f',
    '30c29ade-a897-4d69-8c20-17b887743810',
    'a74fba2d-5545-49ca-81ee-ba614d3b1833',
    'fcb5263c-ded4-44c6-aeff-d2e9c5db9a73',
    '6e8dd53a-b5dd-4fc9-b648-bd31c4916315',
    '633b8ef0-cc4c-452d-b897-c1c794256baa',
    '5af6fd97-ee09-4fe1-89dd-fd7698cea8f9',
    '518de4cf-e307-4efc-b766-03fefbacbc6a',
    'c7f48719-6cbc-4024-ae92-1b5f9f6c0c99',
    '11bab5a8-05be-45ab-92b2-91cf4410011a',
    '85a7f30c-390d-4598-ac69-b684a14fc4b4',
    '283cc6be-3985-4f54-8b1d-d54578d9eefc',
    'd2be4ae4-c089-49d1-8baa-3c3e58eb0920'
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
