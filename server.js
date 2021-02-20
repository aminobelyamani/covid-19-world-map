const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

//SERVER START
const server = http.createServer(app);
//LOCALHOST
/* server.listen(4000, '0.0.0.0', () => {
    console.log('Listening on port 4000...');
}); */
//BLUEHOST VPS
const port = process.env.PORT || 3000;
server.listen(port, '162.214.173.250', () => {
    console.log(`Listening on port ${port}...`);
});

//EXPRESS ROUTING
const bodyParser = require('body-parser');
app.use(bodyParser.json());
//app.use(express.static(path.join(__dirname, 'public')));//localhost
app.use(express.static(path.join(__dirname, '/../../public_html/worldmapcovid19')));//bluehost vps

//OTHER PACKAGES
const io = require('socket.io')(server);
const csv = require('csv-parser');
const cheerio = require('cheerio');

//DOWNLOAD DATA FILES
var parsedFull, fetchData, parsedCsv, vaccineData, parsedLocationsCsv, parsedUsCsv, usVaccineData, usData, yestData, yestUsData, usDataHist;
function switchDir(url) {
    let filename = '';
    switch (url) {
        case 'https://www.worldometers.info/coronavirus/country/us/':
            filename = 'data/scrape/us-scrape.html';
            break;
        case 'https://covid.ourworldindata.org/data/vaccinations/vaccinations.csv':
            filename = 'data/owid/vaccinations.csv';
            break;
        case 'https://covid.ourworldindata.org/data/vaccinations/locations.csv':
            filename = 'data/owid/locations.csv';
            break;
        case 'https://covid.ourworldindata.org/data/vaccinations/us_state_vaccinations.csv':
            filename = 'data/owid/us_state_vaccinations.csv';
            break;
        case 'https://api.apify.com/v2/key-value-stores/SmuuI0oebnTWjRTUh/records/LATEST?disableRedirect=true':
            filename = 'data/scrape/LATEST.json';
            break;
        case 'https://www.worldometers.info/coronavirus/':
            filename = 'data/scrape/world-scrape.html';
            break;
        case 'https://covid.ourworldindata.org/data/owid-covid-data.json':
            filename = 'data/owid/owid-covid-data.json';
    }
    return filename;
}
function downloadFile(url, callback) {
    var filename = switchDir(url);
    const downloadReq = https.get(url, res => {
        if (res.statusCode >= 200 && res.statusCode < 304) {
            const filestream = fs.createWriteStream(filename);
            res.pipe(filestream);
            filestream.on('open', () => {
                console.log(`DOWNLOAD ${filename} BEGIN AT ${new Date()}`);
            });
            filestream.on('error', (err) => {
                console.log(`ERROR WRITING STREAM FOR: ${filename}`);
                console.log(err)
            });
            filestream.on('finish', () => {
                filestream.close();
                console.log(`FILE: ${filename} DOWNLOADED SUCCESSFULLY`);
            });
            filestream.on('close', () => {
                callback(filename);
            });
        }
        else {
            callback(false);
        }
    });
    downloadReq.on('error', (err) => {
        console.log(`ERROR DOWNLOADING FILE: ${filename} AT ${new Date()}`);
        console.log(err);
        callback(false);
    });
}
//WORLDOMETERS SCRAPING
function parseScrape(usa) {
    return new Promise(resolve => {
        const filename = (usa) ? 'us-scrape.html' : 'world-scrape.html';
        const file = fs.readFileSync(path.join(__dirname, `data/scrape/${filename}`));
        const $ = cheerio.load(file, null, false);
        var rows = [];
        const wrapper = (usa) ? '#usa_table_countries_today' : '#main_table_countries_today';
        const count = (usa) ? 12 : 13;
        $(`${wrapper} > tbody > tr`).each((index, element) => {
            var props = [];
            for (let i = 1; i <= count; i++) {
                prop = ($($(element).find('td')[i]).text());
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
                    activeCases: Number(props[6]),
                    seriousCritical: Number(props[7]),
                    casesPerMil: Number(props[8]),
                    deathsPerMil: Number(props[9]),
                    totalTests: Number(props[10]),
                    testsPerMil: Number(props[11]),
                    population: Number(props[12])
                });
            }
        });
        const output = (usa) ? 'US' : 'WORLD';
        console.log(`${output} Data Scraping parsed...`);
        resolve(rows);
    });
};
function parseYesterdayScrape(usa) {
    return new Promise(resolve => {
        const filename = (usa) ? 'us-scrape.html' : 'world-scrape.html';
        const file = fs.readFileSync(path.join(__dirname, `data/scrape/${filename}`));
        const $ = cheerio.load(file, null, false);
        var rows = [];
        const wrapper = (usa) ? '#usa_table_countries_yesterday' : '#main_table_countries_yesterday';
        $(`${wrapper} > tbody > tr`).each((index, element) => {
            var props = [];
            for (let i = 1; i <= 5; i += 2) {
                prop = ($($(element).find('td')[i]).text());
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
        const output = (usa) ? 'US' : 'WORLD';
        console.log(`${output} YESTERDAY Data Scraping parsed...`);
        resolve(rows);
    });
}
//CRON JOB SCHEDULING FOR OWID AND WORLDOMETER DOWNLOADS
const CronJob = require('cron').CronJob;
const owidJob = new CronJob('0 3 * * *', function () {// 3 AM
    const url = 'https://covid.ourworldindata.org/data/owid-covid-data.json';
    downloadFile(url, async (file) => {
        if (file) {
            console.log(`${file} FINISHED DOWNLOADING AT ${new Date()}`);
            parsedFull = await loadFullData();
        }
        else {
            console.log(`FILE NOT FOUND: ${url}`);
        }
    });
}, null, true, 'America/New_York');
const worldometersJob = new CronJob('0 21 * * *', function () {// 9 PM
    const url = 'https://api.apify.com/v2/key-value-stores/SmuuI0oebnTWjRTUh/records/LATEST?disableRedirect=true';
    downloadFile(url, async (file) => {
        if (file) {
            console.log(`${file} FINISHED DOWNLOADING AT ${new Date()}`);
            fetchData = await parseFetchData();
        }
        else {
            console.log(`FILE NOT FOUND: ${url}`);
        }
    });
}, null, true, 'America/New_York');
const vaccJob = new CronJob('0 */1 * * *', function () {// EVERY HOUR
    const url = 'https://covid.ourworldindata.org/data/vaccinations/vaccinations.csv';
    downloadFile(url, (file) => {
        if (file) {
            console.log(`${file} FINISHED DOWNLOADING AT ${new Date()}`);
            const url2 = 'https://covid.ourworldindata.org/data/vaccinations/locations.csv';
            downloadFile(url2, (file) => {
                if (file) {
                    console.log(`${file} FINISHED DOWNLOADING AT ${new Date()}`);
                    runCSV();
                }
                else {
                    console.log(`FILE NOT FOUND: ${url2}`);
                }
            });
        }
        else {
            console.log(`FILE NOT FOUND: ${url}`);
        }
    });
}, null, true, 'America/New_York');
const vaccUsJob = new CronJob('2 */1 * * *', function () {// EVERY HOUR:2 min
    const url = 'https://covid.ourworldindata.org/data/vaccinations/us_state_vaccinations.csv';
    downloadFile(url, (file) => {
        if (file) {
            console.log(`${file} FINISHED DOWNLOADING AT ${new Date()}`);
            runUsVaccHist();
        }
        else {
            console.log(`FILE NOT FOUND: ${url}`);
        }
    });
}, null, true, 'America/New_York');
const usJob = new CronJob('*/5 * * * *', function () {// EVERY 5 MINUTES  
    const url = 'https://www.worldometers.info/coronavirus/country/us/';
    downloadFile(url, file => {
        if (file) {
            console.log(`${file} FINISHED DOWNLOADING AT ${new Date()}`);
            runUsCSV();
        }
        else {
            console.log(`COULD NOT SCRAPE FILE: ${url}`);
        }
    });
}, null, true, 'America/New_York');
const yesterdayJob = new CronJob('3 21 * * *', function () {// 9:03 PM
    const url = 'https://www.worldometers.info/coronavirus/';
    downloadFile(url, file => {
        if (file) {
            console.log(`${file} FINISHED DOWNLOADING AT ${new Date()}`);
            runYest();
        }
        else {
            console.log(`COULD NOT SCRAPE FILE: ${url}`);
        }
    });
}, null, true, 'America/New_York');
//LOAD FILES ON SERVER START
const worldFile = fs.readFileSync(path.join(__dirname, 'data/ref/world.json'));
const countryCodes = JSON.parse(worldFile);
console.log("parsed country codes...")

const usFile = fs.readFileSync(path.join(__dirname, 'data/ref/us-states.json'));
const usCodes = JSON.parse(usFile);
console.log("parsed us-state codes...")

const runINITIAL = async () => {
    parsedFull = await loadFullData();
    fetchData = await parseFetchData();
    //usCSV
    parsedUsCsv = await readCsv('data/owid/us_state_vaccinations.csv');
    usVaccineData = await getUsVaccineData();
    const rawUsData = await parseScrape(true);
    usData = compileUsData(rawUsData);
    //Yest
    yestData = await parseYesterdayScrape();
    yestUsData = await parseYesterdayScrape(true);
    const parsedUsData = await parseUsDataHist();
    const addedUsData = await addNewDataToHist(yestUsData, parsedUsData);
    console.log('Added LATEST DATA to us-data-hist.json...');
    compileUsDataHist(addedUsData);
    //CRON JOBS
    owidJob.start();
    worldometersJob.start();
    vaccJob.start();
    vaccUsJob.start();
    usJob.start();
    yesterdayJob.start();
};
const runCSV = async () => {
    parsedCsv = await readCsv('data/owid/vaccinations.csv');
    parsedLocationsCsv = await readCsv('data/owid/locations.csv');
    vaccineData = getVaccineData();
};
const runUsCSV = async () => {
    parsedUsCsv = await readCsv('data/owid/us_state_vaccinations.csv');
    usVaccineData = await getUsVaccineData();
    const rawUsData = await parseScrape(true);
    usData = compileUsData(rawUsData);
};
const runYest = async () => {
    yestData = await parseYesterdayScrape();
    yestUsData = await parseYesterdayScrape(true);
    const parsedUsData = await parseUsDataHist();
    const addedUsData = await addNewDataToHist(yestUsData, parsedUsData);
    console.log('Added LATEST DATA to us-data-hist.json...');
    compileUsDataHist(addedUsData);
};
const runUsVaccHist = async () => {
    parsedUsCsv = await readCsv('data/owid/us_state_vaccinations.csv');
    const rawData = await parseUsDataHist();
    compileUsDataHist(rawData);
};

runINITIAL();
runCSV();

//SERVER FUNCTIONS
function compileUsDataHist(data) {
    usCodes.forEach(state => {
        const parsedStateList = parsedUsCsv.filter(row => row.location.toLowerCase() === state.state.toLowerCase());
        const histIndex = data.findIndex(row => row.country.toLowerCase() === state.state.toLowerCase());
        const histList = (histIndex != -1) ? data[histIndex].data : false;
        if (histList) {
            parsedStateList.forEach(row => {
                const finalIndex = histList.findIndex(record => record.date.toString() === row.date.toString());
                if (finalIndex != -1) {
                    const dailyVacc = row.daily_vaccinations || 0;
                    data[histIndex].data[finalIndex].new_vaccinations_smoothed = dailyVacc;
                }
            })
        }
    });
    fs.writeFile(path.join(__dirname, 'data/nyt/us-data-hist.json'), JSON.stringify(data), async (err) => {
        if (!err) { console.log('Added VACCINE DATA to us-data-hist.json...'); usDataHist = await parseUsDataHist(); }
    });
}
function getYestDate() {
    const today = new Date().toUTCString();//get GMT timezone
    var yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday = yesterday.toISOString().slice(0, 10);
    return yesterday;
}
function addNewDataToHist(data, parsedData) {
    return new Promise(resolve => {
        const date = getYestDate();
        data.forEach(row => {
            const record = parsedData.find(record => record.country === row.country);
            const index = parsedData.findIndex(record => record.country === row.country);
            const i = record.data.length - 1;
            if (record && record.data[i].date != date) {
                let caseSum = row.newCases, deathSum = row.newDeaths;
                for (k = 1; k <= 6; k++) {
                    caseSum += record.data[i - k].new_cases_smoothed;
                    deathSum += record.data[i - k].new_deaths_smoothed;
                }
                const caseAvg = roundVal((caseSum / 7), 2);
                const deathAvg = roundVal((deathSum / 7), 2);
                const payload = {
                    date: date,
                    new_cases_smoothed: caseAvg,
                    new_deaths_smoothed: deathAvg
                }
                parsedData[index].data.push(payload);
            }
        });
        resolve(parsedData);
    });
}
function roundVal(value, precision) {
    const multiplier = Math.pow(10, precision || 0);
    return Math.ceil(value * multiplier) / multiplier;
}
function readCsv(file) {
    return new Promise(resolve => {
        const results = [];
        const filestream = fs.createReadStream(file);
        filestream.pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                console.log(`${file} parsed...`);
                resolve(results);
            });
        filestream.on('error', (err) => {
            console.log(`${file} could NOT be read...`);
            console.error(err);
            resolve(results);
        });
    });
}
async function loadFullData() {
    try {
        var parsed;
        const rawData = fs.readFileSync(path.join(__dirname, 'data/owid/owid-covid-data.json'));
        parsed = JSON.parse(rawData);
        console.log("parsed owid data...")
        return await parsed;
    }
    catch (err) {
        if (err) {
            console.log(err);
            return parsedFull;
        }
    }
}
async function parseFetchData() {
    try {
        const rawData = fs.readFileSync(path.join(__dirname, 'data/scrape/LATEST.json'));
        var parsed;
        parsed = JSON.parse(rawData);
        console.log("parsed fetch data...")
        return await parsed;
    }
    catch (err) {
        if (err) {
            console.log(err);
            return fetchData;
        }
    }
}
async function parseUsDataHist() {
    try {
        const rawData = fs.readFileSync(path.join(__dirname, 'data/nyt/us-data-hist.json'));
        var parsed;
        parsed = JSON.parse(rawData);
        console.log("parsed us-data-hist.json...")
        return await parsed;
    }
    catch (err) {
        if (err) {
            console.log(err);
            return usDataHist;
        }
    }
}
//VACCINE FUNCTIONS
function mapVaccineData(data, prop) {
    const valList = data.map(item => {
        return item[prop];
    });
    return valList;
}
function getVaccineData() {
    if (parsedCsv.length === 0 || parsedLocationsCsv.length === 0) { return false; }
    else {
        const dataList = [];
        const propList = ['total_vaccinations', 'people_vaccinated', 'people_fully_vaccinated'];
        countryCodes.forEach(country => {
            const list = parsedCsv.filter(row => row.iso_code.toLowerCase() === country.alpha3.toLowerCase());
            if (list.length > 0) {
                const values = [];
                propList.forEach(prop => {
                    const mapped = mapVaccineData(list, prop);
                    const max = Math.max.apply(null, mapped);
                    values.push(max);
                });
                const index = parsedLocationsCsv.findIndex(row => row.iso_code.toLowerCase() === country.alpha3.toLowerCase());
                const vaccines = (index != -1) ? parsedLocationsCsv[index].vaccines : 'Not Reported';
                dataList.push({ country: country.alpha2, totalVaccinations: values[0], peopleVaccinated: values[1], peopleFullyVaccinated: values[2], vaccines: vaccines });
            }
        });
        //OWID_WRL
        const list = parsedCsv.filter(row => row.iso_code === 'OWID_WRL');
        if (list.length > 0) {
            const values = [];
            propList.forEach(prop => {
                const mapped = mapVaccineData(list, prop);
                const max = Math.max.apply(null, mapped);
                values.push(max);
            });
            dataList.push({ country: 'OWID_WRL', totalVaccinations: values[0], peopleVaccinated: values[1], peopleFullyVaccinated: values[2] });
        }
        console.log("WORLD vaccine data compiled...");
        return dataList;
    }
}
function getUsVaccineData() {
    return new Promise(resolve => {
        if (parsedUsCsv.length === 0) { resolve(false); }
        else {
            const dataList = [];
            const propList = ['total_vaccinations', 'people_vaccinated', 'people_fully_vaccinated', 'people_vaccinated_per_hundred', 'people_fully_vaccinated_per_hundred'];
            usCodes.forEach(state => {
                const list = parsedUsCsv.filter(row => row.location === state.state);
                if (list.length > 0) {
                    const values = [];
                    propList.forEach(prop => {
                        const mapped = mapVaccineData(list, prop);
                        const max = Math.max.apply(null, mapped);
                        values.push(max);
                    });
                    dataList.push({ country: state.state, totalVaccinations: values[0], peopleVaccinated: values[1], peopleFullyVaccinated: values[2], percVacc: values[3], percFullyVacc: values[4] });
                }
            });
            console.log("US vaccine data compiled...");
            resolve(dataList);
        }
    });
}
function compileUsData(data) {
    const results = [];
    usVaccineData.forEach(row => {
        const index = data.findIndex(data => data.country === row.country);
        if (index != -1) {
            data[index].totalVaccinations = row.totalVaccinations;
            data[index].peopleVaccinated = row.peopleVaccinated;
            data[index].peopleFullyVaccinated = row.peopleFullyVaccinated;
            data[index].percVacc = row.percVacc;
            data[index].percFullyVacc = row.percFullyVacc;
            results.push(data[index]);
        }
    });
    console.log('US DATA compiled...')
    return results;
}
//CLIENT SERVER FUNCTIONS
function loadCountryData(country) {
    if (parsedFull.length === 0) { return false; }
    else {
        const alpha3 = countryCodes.find(record => record.alpha2.toLowerCase() === country.toLowerCase()).alpha3.toUpperCase();
        if (alpha3) {
            const raw = (parsedFull[alpha3]) ? parsedFull[alpha3].data : false;
            if (raw) {
                const data = {};
                data.country = country;
                data.data = [];
                const propList = ['new_cases', 'new_deaths', 'new_cases_smoothed', 'new_deaths_smoothed', 'new_tests_smoothed', 'new_vaccinations_smoothed', 'stringency_index'];
                raw.forEach(row => {
                    const payload = {};
                    payload.date = row.date;
                    propList.forEach(prop => {
                        if (row.hasOwnProperty(prop)) {
                            payload[prop] = row[prop];
                        }
                    });
                    data.data.push(payload);
                });
                return data;
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }
}
function getCountryLatest(country, usOn) {
    const dataset = (usOn) ? yestUsData : yestData;
    const record = dataset.find(record => record.country.toLowerCase() === country.toLowerCase());
    const latest = (record) ? record : false;
    return latest;
}
function getStateData(country) {
    const record = usDataHist.find(record => record.country.toLowerCase() === country.toLowerCase());
    const data = (record) ? record : false;
    return data;
}
//SOCKET LISTENERS
io.on('connection', (socket) => {
    socket.on('getCountryCodes', () => {
        socket.emit('getCountryCodes', countryCodes);
    });
    socket.on('getCountryData', country => {
        const data = loadCountryData(country);
        socket.emit('getCountryData', data);
    });
    socket.on('getLatestData', payload => {
        const latest = getCountryLatest(payload.country, payload.usOn);
        const newPayload = { latest: latest, country: payload.country };
        socket.emit('getLatestData', newPayload);
    });
    socket.on('getLatestWorldData', country => {
        const latest = getCountryLatest(country);
        const newPayload = { latest: latest, country: country };
        socket.emit('getLatestWorldData', newPayload);
    });
    socket.on('getVaccineData', () => {
        socket.emit('getVaccineData', vaccineData);
    });
    socket.on('getUsData', () => {
        socket.emit('getUsData', usData);
    });
    socket.on('getStateData', country => {
        const data = getStateData(country);
        socket.emit('getStateData', data);
    });
    socket.on('getFetchFromServer', () => {
        socket.emit('getFetchFromServer', fetchData);
    });
});