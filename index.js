const minimist = require('minimist');
const moment = require('moment');
const rxdb = require('rxdb');
const { getClosebyZips } = require('./geo');
const { createDatabase } = require('./db');
const { getStores, checkStoreSlots } = require('./api');

/** @typedef {rxdb.RxDatabase<{[key: string]: rxdb.RxCollection<any, {}, {[key: string]: any;}>}>} Database */

const argv = minimist(process.argv.slice(2));

let storeCache = {};

if ('help' in argv) {
    console.log('node index.js [options]');
    console.log('  --zip* [zip code], Your target area zip code');
    console.log('  --bootstrap, Gets all the stores close to the selected zip');
    console.log('');
    console.log('Run with both --zip and --bootstrap to get a list of stores. And then');
    console.log('run just with --zip to check for availability');
    process.exit();
}

if (!('zip' in argv)) {
    console.log('node index.js --zip [your zip code] [--bootstrap]');
    process.exit(1);
}

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
    /** @type {Store[]} */
    let stores = await db.stores.find({
        selector: {
            associatedSearches: {
                $elemMatch: zip,
            },
        },
    }).exec();

    if (stores.length === 0) {
        return;
    }

    const storesWithAptAvailable = [];

    for (let i = 0; i < stores.length; i++) {
        const store = stores[i];

        if (store.storeNumber in storeCache) {
            return;
        }

        const availability = await checkStoreSlots(store.storeNumber);
        storeCache[store.storeNumber] = true;
        
        if (availability.isAvailable) {
            storesWithAptAvailable.push(store);
            log(
                `Store ${store.storeNumber} @ ${store.address}`,
                store.latitude,
                store.longitude,
                (availability.dose1 ? 'Dose 1' : ''),
                (availability.dose2 ? 'Dose 2' : ''),
            );
            // store['_dataSync$']._value
        }

        await sleep(3000);
    }

    if (!storesWithAptAvailable.length && argv.v) {
        log('No vaccine location available')
    }
};

/**
 * Run the checker.
 * @param {number} zip The zip code to check for stores.
 */
const run = async (zip) => {
    const db = await createDatabase();
    const zipCodes = getClosebyZips(zip);

    if (!zipCodes.length) {
        console.log('No zip codes. Is the supplied zip code valid?');
        process.exit(1);
    }

    while (true) {
        for (let i = 0; i < zipCodes.length; i++) {
            const zipCode = zipCodes[i];

            if (argv.v) {
                log('Checking for available appointments in', zipCode.zip);
            }

            try {
                await checkStoresForAvailableAppts(parseInt(zipCode.zip), db);
                await sleep(2000);
            } catch (e) {
                console.log(e);
            }
        }

        storeCache = {};
        await sleep(20000);
    }
};

/**
 * Download all available stores that are close to the input zip code.
 * @param {number} zip The zip code around which to find stores.
 */
const bootstrap = async (zip) => {
    const db = await createDatabase();
    const zipCodes = getClosebyZips(zip);

    for (let i = 0; i < zipCodes.length; i++) {
        const z = parseInt(zipCodes[i].zip);

        const stores = await getStores(z);
        log(`Found ${stores.length} near ${z}`);

        stores.forEach(async (store) => {
            const foundStore = await db.stores.findOne({
                selector: {
                    storeNumber: store.storeNumber,
                },
            }).exec();

            await sleep(3000);

            if (!foundStore) {
                log(`Inserted store ${store.storeNumber}`);
                await db.stores.insert(store);
                return;
            }

            if (!foundStore.associatedSearches.includes(z)) {
                await foundStore.update({
                    $set: {
                        associatedSearches: [
                            ...foundStore.associatedSearches, z
                        ],
                    },
                });
            }
        });

        await sleep(2000);
    }

    process.exit();
}

if ('bootstrap' in argv) {
    bootstrap(argv.zip);
} else {
    run(argv.zip);
}
