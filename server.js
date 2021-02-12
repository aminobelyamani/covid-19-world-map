const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const urlParser = require('url');
const csv = require('csv-parser');
const cheerio = require('cheerio');

//SERVER START
const server = http.createServer();
server.on('request', (app));
//LOCALHOST
server.listen(4000, '0.0.0.0', () => {
    console.log('Listening on port 4000...');
});
//BLUEHOST VPS
/* const port = process.env.PORT || 3000;
server.listen(port, '162.214.173.250', () => {
    console.log(`Listening on port ${port}...`);
}); */

//EXPRESS ROUTING
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));//localhost
//app.use(express.static(path.join(__dirname, '/../../public_html/worldmapcovid19')));//bluehost vps

//OTHER PACKAGES
const io = require('socket.io')(server);

//DOWNLOAD DATA FILES
var parsedFull, latestData, fetchData, parsedCsv, vaccineData, parsedLocationsCsv, parsedUsCsv, usVaccineData, usData;
function downloadFile(url, callback) {
    var filename;
    if (url === 'https://api.apify.com/v2/key-value-stores/SmuuI0oebnTWjRTUh/records/LATEST?disableRedirect=true') {
        filename = 'LATEST.json';
    }
    else if (url === 'https://www.worldometers.info/coronavirus/country/us/') {
        filename = 'us-scrape.html';
    }
    else {
        filename = (path.extname(url) != '') ? path.basename(url) : path.basename(urlParser.parse(url).pathname) + '.json';
    }
    const downloadReq = https.get(url, res => {
        if (res.statusCode >= 200 && res.statusCode < 304) {
            const filestream = fs.createWriteStream(filename);
            res.pipe(filestream);
            filestream.on('open', () => {
                console.log(`DOWNLOAD ${filename} BEGIN AT ${new Date()}`);
            });
            filestream.on('error', (err) => {
                console.log("ERROR WRITING STREAM");
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
        console.log(`ERROR DOWNLOADING FILE: ${filename}`);
        console.log(err);
    });
}
//WORLDOMETERS SCRAPING
function parseUSScrape() {
    return new Promise(resolve => {
        const file = fs.readFileSync(path.join(__dirname, 'us-scrape.html'));
        const $ = cheerio.load(file, null, false);
        var rows = [];
        $("#usa_table_countries_today > tbody > tr").each((index, element) => {
            var props = [];
            for (let i = 1; i <= 12; i++) {
                prop = ($($(element).find('td')[i]).text());
                prop = prop.replace(/,/g, '').trim();
                if (prop === 'New York') { prop = 'New York State'; }
                else if (prop === 'District Of Columbia') { prop = 'District of Columbia'; }
                props.push(prop);
            }
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
        });
        console.log('US Data Scraping parsed...');
        resolve(rows);
    });
};

//CRON JOB SCHEDULING FOR OWID AND WORLDOMETER DOWNLOADS
const CronJob = require('cron').CronJob;
const owidJob = new CronJob('0 3 * * *', function () {// 3 AM
    const url = 'https://covid.ourworldindata.org/data/owid-covid-data.json';
    downloadFile(url, async (file) => {
        if (file) {
            console.log(`${file} FINISHED DOWNLOADING AT ${new Date()}`);
            parsedFull = await loadFullData();
            latestData = getLatestData();
        }
        else {
            console.log('FILE NOT FOUND');
        }
    });
}, null, true, 'America/New_York');
const worldometersJob = new CronJob('0 2 * * *', function () {// 2 AM
    const url = 'https://api.apify.com/v2/key-value-stores/SmuuI0oebnTWjRTUh/records/LATEST?disableRedirect=true';
    downloadFile(url, async (file) => {
        if (file) {
            console.log(`${file} FINISHED DOWNLOADING AT ${new Date()}`);
            fetchData = await parseFetchData();
        }
        else {
            console.log('FILE NOT FOUND');
        }
    });
}, null, true, 'America/New_York');
const vaccJob = new CronJob('0 15 * * *', function () {// 3 PM
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
                    console.log('FILE NOT FOUND');
                }
            });
        }
        else {
            console.log('FILE NOT FOUND');
        }
    });
}, null, true, 'America/New_York');
const vaccUsJob = new CronJob('10 21 * * *', function () {// 3:10 AM
    const url = 'https://covid.ourworldindata.org/data/vaccinations/us_state_vaccinations.csv';
    downloadFile(url, (file) => {
        if (file) {
            console.log(`${file} FINISHED DOWNLOADING AT ${new Date()}`);
            runUsCSV();
        }
        else {
            console.log('FILE NOT FOUND');
        }
    });
}, null, true, 'America/New_York');
const usJob = new CronJob('*/5 * * * *', function () {// every 5 min  
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

owidJob.start();
worldometersJob.start();
vaccJob.start();
vaccUsJob.start();
usJob.start();

//LOAD FILES ON SERVER START
const worldFile = fs.readFileSync(path.join(__dirname, 'world.json'));
const countryCodes = JSON.parse(worldFile);
console.log("parsed country codes...")

const usFile = fs.readFileSync(path.join(__dirname, 'us-states.json'));
const usCodes = JSON.parse(usFile);
console.log("parsed us-state codes...")

const runINITIAL = async () => {
    parsedFull = await loadFullData();
    latestData = getLatestData();
    fetchData = await parseFetchData();
};
const runCSV = async () => {
    parsedCsv = await readCsv('vaccinations.csv');
    parsedLocationsCsv = await readCsv('locations.csv');
    vaccineData = getVaccineData();
};
const runUsCSV = async () => {
    parsedUsCsv = await readCsv('us_state_vaccinations.csv');
    usVaccineData = await getUsVaccineData();
    usData = await parseUSScrape();
    usData = compileUsData(usData);
};

runINITIAL();
runCSV();
runUsCSV();

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
            console.log(`${file} could not be read...`);
            console.error(err);
            resolve(results);
        });
    });
}

async function loadFullData() {
    try {
        var parsed;
        const rawData = fs.readFileSync(path.join(__dirname, 'owid-covid-data.json'));
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

function getLatestData() {
    const dataList = [];
    countryCodes.forEach(country => {
        const countryData = loadCountryData(country.alpha2);
        if (countryData) {
            let lastIndex = false;
            let count = countryData.length - 1;
            while (lastIndex === false && count != -1) {
                if (countryData[count].hasOwnProperty('new_cases') && countryData[count].hasOwnProperty('new_deaths')) {
                    lastIndex = true;
                }
                else {
                    count--;
                }
            }
            if (count === 0) {
                dataList.push({ country: country.alpha2, data1: countryData[count], data2: false });
            }
            else if (count > 0) {
                dataList.push({ country: country.alpha2, data1: countryData[count], data2: countryData[count - 1] });
            }
        }
    });
    console.log("latest data compiled...")
    return dataList;
}

async function parseFetchData() {
    try {
        const rawData = fs.readFileSync(path.join(__dirname, 'LATEST.json'));
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
        console.log("vaccine data compiled...");
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
            console.log("US-states vaccine data compiled...");
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
function getWorldData(alpha2) {
    if (parsedFull.length === 0) { return false; }
    else {
        const data = (parsedFull[alpha2]) ? parsedFull[alpha2].data : false;
        if (data) {
            let payload = [];
            let lastIndex = false;
            let count = data.length - 1;
            while (lastIndex === false && count != -1) {
                if (data[count].hasOwnProperty('new_cases') && data[count].hasOwnProperty('new_deaths')) {
                    lastIndex = true;
                }
                else {
                    count--;
                }
            }
            payload = (count === 0) ? { country: 'world', data1: data[count], data2: false } : (count > 0) ? { country: 'world', data1: data[count], data2: data[count - 1] } : false;
            return payload;
        }
        else {
            return false;
        }
    }
}

function loadCountryData(country) {
    if (parsedFull.length === 0) { return false; }
    else {
        const alpha3 = countryCodes.find(record => record.alpha2.toLowerCase() === country.toLowerCase()).alpha3.toUpperCase();
        if (alpha3) {
            const data = (parsedFull[alpha3]) ? parsedFull[alpha3].data : false;
            return data;
        }
        else {
            return false;
        }
    }
}

function getCountryLatest(country) {
    const record = latestData.find(record => record.country.toLowerCase() === country.toLowerCase());
    const latest = (record) ? record : false;
    return latest;
}

//SOCKET LISTENERS
io.sockets.on('connection', (socket) => {
    socket.on('getCountryCodes', () => {
        socket.emit('getCountryCodes', countryCodes);
    });
    socket.on('getCountryData', country => {
        const data = loadCountryData(country);
        socket.emit('getCountryData', data);
    });
    socket.on('getLatestData', payload => {
        const latest = getCountryLatest(payload.alpha2);
        const newPayload = { latest: latest, country: payload.country };
        socket.emit('getLatestData', newPayload);
    });
    socket.on('getLatestWorldData', alpha2 => {
        const data = getWorldData(alpha2);
        const newPayload = { latest: data, country: 'world' };
        socket.emit('getLatestWorldData', newPayload);
    });
    socket.on('getVaccineData', () => {
        socket.emit('getVaccineData', vaccineData);
    });
    socket.on('getUsData', () => {
        socket.emit('getUsData', usData);
    });
    socket.on('getFetchFromServer', () => {
        socket.emit('getFetchFromServer', fetchData);
    });
});