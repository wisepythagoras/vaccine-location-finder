const axios = require('axios').default;
const { compact, values } = require('lodash');

/**
 * @typedef {{
 *     storeNumber: number,
 *     phoneNumber: string,
 *     address: string,
 *     locationDetails: string,
 *     latitude: number,
 *     longitude: number,
 *     name: string,
 *     associatedSearches: number[],
 * }} Store
 */

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 11.0; rv:84.0) Gecko/20100101 Firefox/84.0';

/**
 * Get the stores around a specific zip code.
 * @param {number} zip The zip code to check.
 * @returns {Promise<Store[]>}
 */
const getStores = async (zip) => {
    const RITE_AID_GET_STORES = `https://www.riteaid.com/services/ext/v2/stores/getStores?address=${zip}&attrFilter=PREF-112&fetchMechanismVersion=2&radius=50`;

    const result = await axios.get(RITE_AID_GET_STORES, {
        headers: { 'User-Agent': USER_AGENT },
    });
    const resp = result.data;

    if (resp.Status !== 'SUCCESS') {
        return [];
    }

    /** @type {Store[]} */
    const stores = resp.Data.stores.map((store) => {
        return {
            storeNumber: store.storeNumber.toString(),
            phoneNumber: store.fullPhone,
            address: compact([store.address, store.city, store.state, store.zip]).join(', '),
            locationDetails: store.locationDescription,
            latitude: store.latitude,
            longitude: store.longitude,
            name: store.name,
            // distance: store.milesFromCenter,
            associatedSearches: [zip],
        };
    });

    return stores;
};

/**
 * Check a store if it has available slots.
 * @param {number} storeNumber The store number.
 * @returns {boolean}
 */
const checkStoreSlots = async (storeNumber) => {
    const RITE_AID_CHECK_SLOTS = `https://www.riteaid.com/services/ext/v2/vaccine/checkSlots?storeNumber=${storeNumber}`;

    const resp = await axios.get(RITE_AID_CHECK_SLOTS, {
        headers: { 'User-Agent': USER_AGENT },
    });
    const body = resp.data;
    const data = body.Data;

    if (body.Status === 'SUCCESS') {
        const slots = values(data.slots);

        if (!slots || !slots.length) {
            return false;
        }

        return slots[0] !== false || slots[1] !== false;
    }

    return false;
};

module.exports.getStores = getStores;
module.exports.checkStoreSlots = checkStoreSlots;
