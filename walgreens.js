const puppeteer = require('puppeteer');
const creds = require('./config.json').walgreens;

const WALGREENS_COVID_DASH = 'https://www.walgreens.com/findcare/vaccination/covid-19/appointment/next-available';

const openBrowser = async () => {
    const browser = await puppeteer.launch({
        headless: false,
    });

    const page = await browser.newPage();

    return { browser, page };
};

const logIn = async () => {
    const { browser, page } = await openBrowser();
    page.setViewport({
        width: 1860,
        height: 1000,
    });
    await page.goto(WALGREENS_COVID_DASH);

    await page.click('#user_name');
    await page.keyboard.type(creds.username);

    await page.click('#user_password');
    await page.keyboard.type(creds.password);

    await page.click('#submit_btn');
    await page.waitForNavigation();

    try {
        await page.waitForSelector('#radio-security');
        await page.click('#radio-security');
        await page.click('#optionContinue');

        await page.click('#secQues');
        await page.keyboard.type(creds.securityQuestion);

        await page.click('#validate_security_answer');
        await page.waitForNavigation();
    } catch (error) {
        console.log('Verification not needed');
    }

    return { browser, page };
};

/**
 * Get the stores for a specific location.
 * @param {puppeteer.Page} page The puppeteer page.
 * @param {[number, number]} location The lat lon tuple.
 * @param {import('./geo').State} state The state.
 */
const getStores = async (page, location, state) => {
    // Get the desired links from the page.
    const stores = await page.evaluate(_ => {
        const WALGREENS_TIMESLOTS_API = 'https://www.walgreens.com/hcschedulersvc/svc/v2/immunizationLocations/timeslots';

        const body = {
            position: {
                latitude: location[0],
                longitude: location[1],
            },
            state: state.stateCode,
            vaccine: {
                productId: '',
            },
            appointmentAvailability: {
                startDateTime: moment().format('YYYY-MM-dd'),
            },
            radius: 25,
            size:25,
            serviceId: '99',
        };

        return fetch(WALGREENS_TIMESLOTS_API, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
        }).then(r => r.json());
    });

    console.log(JSON.stringify(stores, ' ', 4));
};

module.exports.openBrowser = openBrowser;
module.exports.logIn = logIn;
module.exports.getStores = getStores;

// (async () => {
//     const { browser, page } = await logIn();
//     await getStores(page, [0, 0], { stateCode: 'WA' });
//     await browser.close();
//     process.exit(1);
// })();
