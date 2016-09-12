/*
 * Attaches the 'Branded' tag to a batch of containers.
 */
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

// Update this list with the IDs of containers to tag.
var collectionIds = [
    'bb05ba4d-1234-46c3-9778-78c2e610e6a0',
    'b07ffc65-263d-46cb-a7c3-bb5a01d8f4fe',
    '5bf3112d-e762-4764-8d1d-6914035a3226',
    '099d45e1-0e51-40e2-8a6a-e46fc375c120',
    '7e811d7f-97fa-4c0b-923a-cfbcba2d2937',
    'c4332202-40e5-41d2-ab70-090c9741ca8f',
    '4847b6a0-8785-4ed4-bc80-105e1242ca88',
    '4b345fc7-c236-4190-8ab1-a15f5f764619',
    '867591e5-c85a-47df-8f7b-3a4e7ae32566',
    '32d5fc09-c584-4e97-8e2c-35e3fb1d444b',
    '49ffe0bd-f8b6-4fb5-b7ae-b1e790cdb1c2',
    '8c359ed4-7925-4545-88b1-f70c0ebe8b58',
    '54e6bab0-7a09-4843-909f-6418eed69ce0',
    'cf693b4c-7967-4247-8751-506e46b50058',
    '634969f8-08ac-405c-89e2-44f9b907a894',
    'c1fac4c5-416c-46a5-9dda-1ae060015431',
    '7d964e50-1dde-49de-a5b6-5bbf7495a030',
    'eb253d98-2dda-466b-880e-83e471bba7d2',
    '1867ff74-8998-47c0-9f76-be74afb9bcd3',
    'aba8ddea-309c-408a-b8cf-09bc45ab3e24',
    '9466a202-d6b0-411b-a05c-7aa8a8a1efaa',
    '5b860a20-5dea-46f5-806a-6f5621009b24',
    '393788b1-6673-41ac-939c-aa290b07a870',
    'aff5429e-b70c-4de2-9d65-ad30b91b0251',
    '52651e4f-cab1-4e8b-ac03-c61cd27a7b0b',
    '1834a5dc-be59-4d5e-bf2a-5c41b8cb50ef',
    '4fdd1ca2-d603-4273-91d4-c220827b4a91',
    '349ac67d-0467-420d-ad36-89f74d1eace9',
    '674d2623-1822-4f70-a3a4-da75c64c799e',
    '6c6ce201-ed32-43b9-b904-027abffff40e',
    '40cb50b3-7c1b-4bd0-a9d1-192deff88ca3',
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
    '0aa579ca-2a2c-4b78-b2fe-b6c2978c8857',
    '3ed8869e-1024-4c51-9ce7-97ebd404e2e3',
    '2ec19003-02f2-4a1d-b150-0376c9deaefc',
    'c1568f78-67c7-45aa-8bde-204cd5412e46',
    'e18caf3d-69ff-4c40-be96-ab88bb26c392',
    '35f9327d-db4f-4a47-8d75-fdb7c9548a88',
    'e6047c8e-3c7b-4575-b7d7-05bfe0e62c38',
    '662b7e6b-e090-44bd-99af-42ce5deaeed2',
    '434e3f17-ca8c-449b-a467-fcacd7fbefc8',
    '78702b56-f91f-4bae-adc7-5a01c6bf52e5',
    '7e591241-62ed-4a44-954f-d436af8b8e1c',
    '33a9f1c8-429e-420f-a4db-d7900bb49c5a',
    'c93da35f-2548-4b4a-ae53-c347672bb07f',
    '518de4cf-e307-4efc-b766-03fefbacbc6a',
    '5308791e-55bb-4593-8d57-7afee3d9b8f1',
    'f7e372d6-0929-406c-b8e0-48431e9098ac',
    '6b2474bd-ae7d-45a8-92bf-0bb11d9f484f',
    'ffefaaaa-dc74-4776-9063-a9cfee49c092',
    'c7f48719-6cbc-4024-ae92-1b5f9f6c0c99',
    '2d72d3b6-06b5-4ee3-ac82-72c99db5ff03',
    'e3ba2328-b40d-409a-b52c-e9a2282df364',
    '764cf7c5-de6e-493c-947f-f1f7bcab854c',
    '4307e123-ab9d-4d00-aac1-85d14944fe07',
    '3b92db62-b28c-4a45-a465-9429bdac052b',
    '113f7cb7-ff65-407b-a226-f6fb28310e3e',
    '8419e34e-e43f-4b3e-831e-bf174a66a860',
    '329aea87-0f64-4b18-8662-bef16d178f63',
    '5a4bdca8-fac6-4285-a880-b963f06136b8',
    '4bd318ef-6ba6-4df5-b919-f3ede5232c1e',
    '346b3a3e-d4fd-4cbb-9427-e61ac809db02',
    '0b1748a0-24f8-458a-b2e8-95c98d60ea0f',
    '189cc47a-153c-4050-b00c-f134678479f2',
    '62449ee9-14a1-4d29-878c-a2521bcf70ed',
    'ac7a85d4-e3e3-41c7-bb46-3cabe6d73325',
    'fccd24c3-e09e-498a-9228-df768c331580',
    'f28e38cf-ecbc-47fa-8f9d-866613ad1817',
    '44183650-6ee2-48c6-abf4-d722b73718d2',
    'dbdea2b2-0d21-47f1-8e56-bab8790d2017',
    '636654b7-62a7-48ca-bd87-698b0f0379dd',
    'e6536c46-235d-4bfd-8e63-f9450fc6f35e',
    '48c176e5-32a2-4c17-8fb9-d7dbccd49f01',
    'e513f7ec-6846-4411-803b-e64a57a9997b',
    'ed7df49a-e040-45d7-ac6a-2bbd0816068e',
    '36ff548d-7488-40bc-bc3b-3f86aabab94c',
    'ea388e47-7989-4d87-9b26-1d5056e12eb3',
    'f7571c03-7083-4f2f-91aa-498d480aea4e',
    '75b2dcf8-65e9-4bf4-94fc-60b03533f37f',
    '0050fb21-7c60-4e25-857b-06d07e42966c',
    '8f071c88-c2ca-4eaa-aeec-4e9d63217147',
    'eb02a18e-811a-4d83-abf9-25225e98c6fe',
    '9a2848a7-d4c3-490b-a14d-bf20a14773b9',
    '2bd8f5c5-cc35-439d-8b0b-958f4603a486',
    'e34311d5-cf99-4d45-a695-dcbcb2f8cd66',
    '30049d7f-e730-42f9-8359-e10a6986ac4b',
    '5ad9bdd3-baef-4053-a6aa-f16075e66caf',
    '2affc11f-c5d3-413e-b534-0733dd2399ce',
    'f0d57f9b-6b5b-47a2-9abb-515c440260a0',
    '75f42c4c-cbb7-44f7-8cc9-befb9a760387',
    'aed5ac78-c1f6-43dd-970f-efdcff1da73a',
    'd63e72bd-c248-40a8-8662-d175eedf77ab',
    '644d6161-1f35-4681-8edd-c403d583b5ab',
    '8ceab815-5b93-411b-9026-07e0a48f86ca',
    '783702c5-d0c8-4b63-a849-d7812be57eed',
    'bb170e21-8ba4-4316-8650-ca109281fe75',
    '11ace620-84a0-4ef6-bae0-956e54e050bd',
    'a8487c34-a7d0-450e-9813-a5ac26512001',
    '5d91cdb7-3ae4-4758-b7a4-52844f3e6126',
    '2f32cd87-d640-4632-9952-c070bc8d500c',
    '16ddbfea-affe-472e-a440-f2805b8fc95b',
    'c258733e-a769-4192-9651-a6098159a7ad',
    '3ba6fee7-b692-4c8e-a09a-6cae36b688b2',
    '51cae6a6-422b-463d-ae33-8f5f15530f0d',
    '027808a8-2dbb-4cc7-9166-3a66a51559a1',
    '21aa6bc5-23ab-4658-b5e1-2eedb90abebe',
    'd795b4db-b183-4998-836a-1381f9acbaf2',
    '81447511-6f44-4afa-9a09-7a35cc26bb52',
    '11bab5a8-05be-45ab-92b2-91cf4410011a',
    '75c5c68a-8379-4114-a06b-d5d573913a69',
    '4f19de3e-9c09-4148-8a0a-b67d6160c271',
    'f12202bc-c484-492a-b196-b2bdfdb25744',
    'b32ee35a-624c-4527-9c2d-16e509422937',
    '0e2cb415-2759-44fc-b063-58a569944998',
    '71fd3aa8-56fe-4f13-83bf-274052252b42',
    'bb260f05-bb39-41cb-b68c-d35fa149cc37',
    'b480709d-9499-492f-81a2-207e426e0f4e',
    'c5d60449-4fe5-497a-b62f-c02c9263f6c9',
    '048afbf6-5abb-4d35-8ce9-00c2477daa48',
    'ee5a9bbc-4c6b-4b7f-bce8-20d8d78a2163',
    'e7840727-de36-4f6d-8e36-d2a8c2bdb411',
    '85a7f30c-390d-4598-ac69-b684a14fc4b4',
    '283cc6be-3985-4f54-8b1d-d54578d9eefc',
    '8d824d95-95ec-4ef0-8c57-cf9cee85df69',
    '2483b6ee-78bf-443f-9f8a-efede38acc51',
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
