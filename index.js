const minimist = require('minimist');
const moment = require('moment');
const rxdb = require('rxdb');
const { getClosebyZips } = require('./geo');
const { createDatabase } = require('./db');
const { getStores, checkStoreSlots } = require('./api');

/** @typedef {rxdb.RxDatabase<{[key: string]: rxdb.RxCollection<any, {}, {[key: string]: any;}>}>} Database */

const argv = minimist(process.argv.slice(2));

if (!('zip' in argv)) {
    console.log('node index.js --zip [your zip code]');
    process.exit(1);
}

/**
 * Format a date.
 * @param {Date | string} date The date to format.
 * @returns {string}
 */
const formatDate = (date) => {
    return moment(date).format('MM/DD/YYYY, h:mm:ss a');
};

/**
 * Console log wrapper.
 * @param  {...any} args Stuff to log.
 */
const log = (...args) => {
    console.log(`[${formatDate(new Date())}]`, ...args);
};

/**
 * Check stores for available appointments.
 * @param {number} zip The zip code to check at.
 * @param {Database} db The database instance.
 */
const checkStoresForAvailableAppts = async (zip, db) => {
    let stores = await db.stores.find({
        selector: {
            associatedSearches: {
                $elemMatch: zip,
            },
        },
    }).exec();

    if (stores.length === 0) {        
        stores = await getStores(zip);
        
        log(`Found ${stores.length} near ${zip}`);

        stores.forEach(async (store) => {
            const foundStore = await db.stores.findOne({
                selector: {
                    storeNumber: store.storeNumber,
                },
            }).exec();

            if (!foundStore) {
                await db.stores.insert(store);
                return;
            }

            if (!foundStore.associatedSearches.includes(zip)) {
                foundStore.associatedSearches.push(zip);
                foundStore.save();
            }
        });
    }

    const storesWithAptAvailable = [];

    stores.forEach(async (store) => {
        const hasOpenSlots = await checkStoreSlots(store.storeNumber);

        if (hasOpenSlots) {
            storesWithAptAvailable.push(store);
            log(`Store ${store.storeNumber} @ ${store.address}`);
        }
    });

    if (!storesWithAptAvailable.length) {
        log('No vaccine location available')
    }
};

/**
 * Resolves the returned promise after the set amount of ms. This should be used with
 * async-await to take advantage of the waiting.
 * @param {number} ms The time in ms to sleep.
 */
const sleep = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

/**
 * Run the checker.
 * @param {number} zip The zip code to check for stores.
 */
const run = async (zip) => {
    const db = await createDatabase();

    while (true) {
        await checkStoresForAvailableAppts(zip, db);
        await sleep(60000);
    }
};

// getStores(argv.zip);
// checkStoreSlots(10568).then(console.log);

run(argv.zip);
