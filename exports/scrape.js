const cheerio = require('cheerio');
const fs = require('fs');

//WORLDOMETERS SCRAPING
function parseScrape(usa) {
    return new Promise(resolve => {
        const filename = (usa) ? 'us-scrape.html' : 'world-scrape.html';
        const file = fs.readFileSync(`./data/scrape/${filename}`);
        const $ = cheerio.load(file, null, false);
        const rows = [];
        const wrapper = (usa) ? '#usa_table_countries_today' : '#main_table_countries_today';
        const count = (usa) ? 12 : 14;
        $(`${wrapper} > tbody > tr`).each((index, element) => {
            var props = [];
            for (let i = 1; i <= count; i++) {
                let prop = ($($(element).find('td')[i]).text());
                prop = prop.replace(/,/g, '').trim();
                if (prop === 'New York') { prop = 'New York State'; }
                else if (prop === 'District Of Columbia') { prop = 'District of Columbia'; }
                props.push(prop);
            }
            if (usa) {
                if (index > 0 && index <= 51) {
                    rows.push({
                        country: props[0],
                        totalCases: Number(props[1]),
                        newCases: Number(props[2]),
                        totalDeaths: Number(props[3]),
                        newDeaths: Number(props[4]),
                        totalRecovered: Number(props[5]),
                        activeCases: Number(props[6]),
                        seriousCritical: null,
                        casesPerMil: Number(props[7]),
                        deathsPerMil: Number(props[8]),
                        totalTests: Number(props[9]),
                        testsPerMil: Number(props[10]),
                        population: Number(props[11])
                    });
                }
            }
            else {
                rows.push({
                    country: props[0],
                    totalCases: Number(props[1]),
                    newCases: Number(props[2]),
                    totalDeaths: Number(props[3]),
                    newDeaths: Number(props[4]),
                    totalRecovered: Number(props[5]),
                    activeCases: Number(props[7]),
                    seriousCritical: Number(props[8]),
                    casesPerMil: Number(props[9]),
                    deathsPerMil: Number(props[10]),
                    totalTests: Number(props[11]),
                    testsPerMil: Number(props[12]),
                    population: Number(props[13])
                });
            }
        });
        resolve(rows);
    });
};
function parseYesterdayScrape(usa) {
    return new Promise(resolve => {
        const filename = (usa) ? 'us-scrape.html' : 'world-scrape.html';
        const file = fs.readFileSync(`./data/scrape/${filename}`);
        const $ = cheerio.load(file, null, false);
        const rows = [];
        const wrapper = (usa) ? '#usa_table_countries_yesterday' : '#main_table_countries_yesterday';
        $(`${wrapper} > tbody > tr`).each((index, element) => {
            var props = [];
            for (let i = 1; i <= 5; i += 2) {
                let prop = ($($(element).find('td')[i]).text());
                prop = prop.replace(/,/g, '').trim();
                if (prop === 'New York') { prop = 'New York State'; }
                else if (prop === 'District Of Columbia') { prop = 'District of Columbia'; }
                props.push(prop);
            }
            if (usa) {
                if (index > 0 && index <= 51) {
                    rows.push({
                        country: props[0],
                        newCases: Number(props[1]),
                        newDeaths: Number(props[2])
                    });
                }
            }
            else {
                rows.push({
                    country: props[0],
                    newCases: Number(props[1]),
                    newDeaths: Number(props[2])
                });
            }
        });
        resolve(rows);
    });
}

module.exports = { parseScrape, parseYesterdayScrape };