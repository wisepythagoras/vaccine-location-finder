const axios = require('axios').default;
const UserAgent = require('user-agents');
const { compact, values } = require('lodash');

/**
 * @typedef {{
 *     isAvailable: boolean,
 *     dose1: boolean,
 *     dose2: boolean,
 * }} Availablility
 */

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

/**
 * Generates a random user agent string.
 * @returns {string}
 */
const genUserAgent = () => {
    const userAgent = new UserAgent();
    return userAgent.toString();
};

/**
 * Get the stores around a specific zip code.
 * @param {number} zip The zip code to check.
 * @returns {Promise<Store[]>}
 */
const getStores = async (zip) => {
    const RITE_AID_GET_STORES = `https://www.riteaid.com/services/ext/v2/stores/getStores?address=${zip}&attrFilter=PREF-112&fetchMechanismVersion=2&radius=50`;

    const result = await axios.get(RITE_AID_GET_STORES, {
        headers: { 'User-Agent': genUserAgent() },
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
            address: compact([store.address, store.city, store.state, store.zipcode]).join(', '),
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
 * @returns {Promise<Availablility>}
 */
const checkStoreSlots = async (storeNumber) => {
    const RITE_AID_CHECK_SLOTS = `https://www.riteaid.com/services/ext/v2/vaccine/checkSlots?storeNumber=${storeNumber}`;

    const resp = await axios.get(RITE_AID_CHECK_SLOTS, {
        headers: { 'User-Agent': genUserAgent() },
    });
    const body = resp.data;
    const data = body.Data;

    if (body.Status === 'SUCCESS') {
        const slots = values(data.slots);

        if (!slots || !slots.length) {
            return {
                isAvailable: false,
                dose1: false,
                dose2: false,
            };
        }
        return {
            isAvailable: slots[0] !== false || slots[1] !== false,
            dose1: slots[0] !== false,
            dose2: slots[1] !== false,
        };
    }

    return {
        isAvailable: false,
        dose1: false,
        dose2: false,
    };
};

module.exports.getStores = getStores;
module.exports.checkStoreSlots = checkStoreSlots;
