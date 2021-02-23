const rxdb = require('rxdb');
const leveldown = require('leveldown');

rxdb.addRxPlugin(require('pouchdb-adapter-leveldb'));
rxdb.addRxPlugin(require('pouchdb-find'));

const STORES_SCHEMA = {
    title: 'Stores schema',
    version: 0,
    description: 'This model will describe the stores',
    type: 'object',
    properties: {
        storeNumber: {
            type: 'string',
            primary: true,
        },
        phoneNumber: {
            type: 'string',
        },
        address: {
            type: 'string',
        },
        locationDetails: {
            type: 'string',
        },
        latitude: {
            type: 'number',
        },
        longitude: {
            type: 'number',
        },
        name: {
            type: 'string',
        },
        associatedSearches: {
            type: 'array',
            uniqueItems: true,
            items: {
                type: 'number',
            },
        },
    },
    required: ['storeNumber', 'address', 'latitude', 'longitude'],
    indexes: [
        'storeNumber',
        ['latitude', 'longitude'],
    ],
};

/**
 * Create the database.
 * @returns {rxdb.RxDatabase<{[key: string]: rxdb.RxCollection<any, {}, {[key: string]: any;}>}>}
 */
const createDatabase = async () => {
    const database = await rxdb.createRxDatabase({
        name: 'vaccines',
        adapter: leveldown,
    });

    await database.addCollections({
        stores: {
            schema: STORES_SCHEMA,
        },
    });

    return database;
};

module.exports.createDatabase = createDatabase;
