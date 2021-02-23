const geolib = require('geolib');
const usZips = require('us-zips');
const { values, keys } = require('lodash');

/**
 * @typedef {{
 *     longitude: number,
 *     latitude: number,
 *     zip: number,
 * }} ZipCode
 */

/**
 * Find zip codes that are within 10km from the provided zip code.
 * @param {number} zip The zip code to start from.
 * @returns {ZipCode[]}
 */
const getClosebyZips = (zip) => {
    const location = usZips[zip];

    if (!location) {
        return [];
    }

    const zipCodes = geolib.orderByDistance(location, keys(usZips).map((zipCode) => {
        return {
            zip: zipCode,
            ...usZips[zipCode],
        };
    }));
    const closeByZipCodes = [];

    for (let i = 0; i < zipCodes.length; i++) {
        const distance = geolib.getDistance(location, zipCodes[i]);

        if (distance > 10000) {
            break;
        }

        closeByZipCodes.push(zipCodes[i]);
    }

    return closeByZipCodes;
};

// 1 meter = 0.00062137119223733 miles

module.exports.getClosebyZips = getClosebyZips;
