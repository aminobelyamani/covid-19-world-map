//LOAD ENVIORNMENT VARIABLES
require('dotenv').config()
console.log(`MODE: ${process.env.NODE_ENV}`);

//LOAD MODULES
const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const fs = require('fs');
const csv = require('csv-parser');

//EXPRESS ROUTING & MIDDLEWARE
const publicDir = (process.env.NODE_ENV === 'production') ? '/../../public_html/worldmapcovid19' : (process.env.NODE_ENV === 'local-prod') ? 'dist' : 'src';
app.use(express.json());
app.use(express.static(path.join(__dirname, publicDir), {
    extensions: ['html']
}));

//GLOBAL VARIABLES
var countryCodes, usCodes, parsedFull, fetchData, parsedCsv, parsedLocationsCsv, vaccineData, parsedUsCsv, usVaccineData, usData, yestData, yestUsData, usDataHist;

//MODULE EXPORTS
const { parseScrape, parseYesterdayScrape } = require('./exports/scrape');
const { getVaccineData, getUsVaccineData, compileUsData, loadCountryData, getStateData, compileUsDataHist, addNewDataToHist } = require('./exports/data');
const { downloadFile } = require('./exports/download');

//SERVER START
const server = http.createServer(app);
const port = process.env.PORT || 3000;
const ipAddr = (process.env.NODE_ENV === 'production') ? process.env.IP : '0.0.0.0';
const runINITIAL = () => {
    return new Promise(async (resolve, reject) => {
        //COUNTRY & US CODES
        var fileParse = await loadFile('data/ref/world.json');
        if (!fileParse) { return reject(); }
        countryCodes = fileParse;
        fileParse = await loadFile('data/ref/us-states.json');
        if (!fileParse) { return reject(); }
        usCodes = fileParse;
        //WORLD DATA
        fetchData = await parseScrape();
        var parsed = await readCsv('data/owid/vaccinations.csv');
        if (!parsed) { return reject(); }
        parsedCsv = parsed;
        parsed = await readCsv('data/owid/locations.csv');
        if (!parsed) { return reject(); }
        parsedLocationsCsv = parsed;
        parsed = getVaccineData(parsedCsv, parsedLocationsCsv, countryCodes);
        if (!parsed) { return reject(); }
        vaccineData = parsed;
        //US DATA
        parsed = await readCsv('data/owid/us_state_vaccinations.csv');
        if (!parsed) { return; }
        parsedUsCsv = parsed;
        parsed = await getUsVaccineData(parsedUsCsv, usCodes);
        if (!parsed) { return; }
        usVaccineData = parsed;
        const rawUsData = await parseScrape(true);
        usData = compileUsData(rawUsData, usVaccineData);
        console.log('US DATA compiled...');
        //Yest
        yestData = await parseYesterdayScrape();
        yestUsData = await parseYesterdayScrape(true);
        fileParse = await loadFile('data/us-data/us-data-hist.json');
        if (!fileParse) { return reject(); }
        usDataHist = fileParse;
        fileParse = await loadFile('data/owid/owid-covid-data.json');
        if (!fileParse) { return reject(); }
        parsedFull = fileParse;
        //START CRON JOBS
        owidJob.start();
        worldometersJob.start();
        vaccJob.start();
        vaccUsJob.start();
        usJob.start();
        yesterdayJob.start();
        resolve();
    });
};
runINITIAL().then(() => {
    server.listen(port, ipAddr, () => {
        console.log(`Listening on port ${port}...`);
    });
}).catch(() => { console.log("ERROR LOADING INITIAL FILES"); });

//JOB FUNCTIONS
const runCSV = async () => {
    var parsed = await readCsv('data/owid/vaccinations.csv');
    if (!parsed) { return; }
    parsedCsv = parsed;
    parsed = await readCsv('data/owid/locations.csv');
    if (!parsed) { return; }
    parsedLocationsCsv = parsed;
    parsed = getVaccineData(parsedCsv, parsedLocationsCsv, countryCodes);
    if (!parsed) { return; }
    vaccineData = parsed;
};
const runUsVaccHist = async () => {
    var parsed = await readCsv('data/owid/us_state_vaccinations.csv');
    if (!parsed) { return; }
    parsedUsCsv = parsed;
    const rawData = await loadFile('data/us-data/us-data-hist.json');
    if (!rawData) { return; }
    const result = await compileUsDataHist(rawData, parsedUsCsv, usCodes);
    if (result.count > 0) {
        await writeUsHistFile(result.data).then(async () => {
            var fileParse = await loadFile('data/us-data/us-data-hist.json');
            if (!fileParse) { return; }
            usDataHist = fileParse;
            console.log(`US vaccine data compiled AT ${new Date}`);
        }).catch();
    }
};
const runUsCSV = async () => {
    var parsed = await readCsv('data/owid/us_state_vaccinations.csv');
    if (!parsed) { return; }
    parsedUsCsv = parsed;
    parsed = await getUsVaccineData(parsedUsCsv, usCodes);
    if (!parsed) { return; }
    usVaccineData = parsed;
    const rawUsData = await parseScrape(true);
    usData = compileUsData(rawUsData, usVaccineData);
};
const runYest = async () => {
    yestData = await parseYesterdayScrape();
    yestUsData = await parseYesterdayScrape(true);
    const parsedUsData = await loadFile('data/us-data/us-data-hist.json');
    if (!parsedUsData) { return; }
    const parsedUsRawData = await loadFile('data/us-data/us-data-hist-raw.json');
    if (!parsedUsRawData) { return; }
    const addedUsData = await addNewDataToHist(yestUsData, parsedUsData, parsedUsRawData);
    if (addedUsData.count > 0) {
        await writeUsHistFile(addedUsData.parsedData).then(async () => {
            var fileParse = await loadFile('data/us-data/us-data-hist.json');
            if (!fileParse) { return; }
            usDataHist = fileParse;
            const result = await compileUsDataHist(usDataHist, parsedUsCsv, usCodes);
            if (result.count > 0) {
                await writeUsHistFile(result.data).then(async () => {
                    fileParse = await loadFile('data/us-data/us-data-hist.json');
                    if (!fileParse) { return; }
                    usDataHist = fileParse;
                    writeUsHistRawFile(addedUsData.parsedRawData);
                    console.log(`US HISTORY data added and compiled AT ${new Date}`);
                }).catch();
            }
        }).catch();
    }
};

//CRON JOBS
const CronJob = require('cron').CronJob;

const owidJob = new CronJob('52 2 * * *', function () {// 2:52 AM
    const url = 'https://covid.ourworldindata.org/data/owid-covid-data.json';
    downloadFile(url, async (file) => {
        if (file) {
            var fileParse = await loadFile('data/owid/owid-covid-data.json');
            if (!fileParse) { return; }
            parsedFull = fileParse;
            console.log(`DOWNLOADED & PARSED owid data at ${new Date}`);
        }
    });
}, null, true, 'America/New_York');

const worldometersJob = new CronJob('*/5 * * * *', function () {// EVERY 5 MIN
    const url = 'https://www.worldometers.info/coronavirus/';
    downloadFile(url, async (file) => {
        if (file) { fetchData = await parseScrape(); }
    });
}, null, true, 'America/New_York');

const vaccJob = new CronJob('1 */6 * * *', function () {// 4 TIMES A DAY:1 MIN
    const url = 'https://covid.ourworldindata.org/data/vaccinations/vaccinations.csv';
    const url2 = 'https://covid.ourworldindata.org/data/vaccinations/locations.csv';
    downloadFile(url, (file) => {
        if (file) {
            downloadFile(url2, (file) => { if (file) { runCSV(); } });
        }
    });
}, null, true, 'America/New_York');

const vaccUsJob = new CronJob('3 */6 * * *', function () {// 4 TIMES A DAY:3 MIN
    const url = 'https://covid.ourworldindata.org/data/vaccinations/us_state_vaccinations.csv';
    downloadFile(url, (file) => {
        if (file) { runUsVaccHist(); }
    });
}, null, true, 'America/New_York');

const usJob = new CronJob('*/5 * * * *', function () {// EVERY 5 MINUTES  
    const url = 'https://www.worldometers.info/coronavirus/country/us/';
    downloadFile(url, file => {
        if (file) { runUsCSV(); }
    });
}, null, true, 'America/New_York');

const yesterdayJob = new CronJob('33 22 * * *', function () {// 10:33 PM
    downloadYest();
}, null, true, 'America/New_York');

const retryJob = new CronJob('*/5 * * * *', function () {// RETRY EVERY 5 MINUTES
    downloadYest();
}, null, true, 'America/New_York');

function downloadYest() {
    const url = 'https://www.worldometers.info/coronavirus/';
    downloadFile(url, file => {
        if (file) {
            retryJob.stop();
            runYest();
        }
        else { retryJob.start(); }
    });
}
retryJob.stop();

//LOAD DATA FILES
async function loadFile(url) {
    try {
        var parsed;
        const rawData = fs.readFileSync(path.join(__dirname, url));
        parsed = JSON.parse(rawData);
        if (typeof parsed === 'object') { return parsed; }
        return JSON.parse(parsed);
    }
    catch (err) {
        if (err) {
            console.error(`ERROR: ${url} could NOT be parsed at ${new Date}`);
            console.error(err);
            return false;
        }
    }
}
function readCsv(file) {
    return new Promise(resolve => {
        const results = [];
        const filestream = fs.createReadStream(file);
        filestream.pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => { resolve(results); });
        filestream.on('error', (err) => {
            console.error(`ERROR: ${file} could NOT be read at ${new Date}`);
            console.error(err);
            resolve(false);
        });
    });
}

//WRITE JSON FILES
function writeUsHistFile(data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(path.join(__dirname, 'data/us-data/us-data-hist.json'), JSON.stringify(data), (err) => {
            if (err) { console.error(`Error writing to file: us-data-hist.json at ${new Date}`); console.error(err); reject(); }
            else { resolve(); }
        });
    });
}
function writeUsHistRawFile(data) {
    fs.writeFile(path.join(__dirname, 'data/us-data/us-data-hist-raw.json'), JSON.stringify(data), (err) => {
        if (err) { console.error(`Error writing to file: us-data-hist-raw.json at ${new Date}`); console.error(err); }
    });
}

//APP ROUTES
//GET ROUTES
function switchUrl(url) {
    let newUrl = '';
    switch (url) {
        case 'reunion':
            newUrl = 'réunion';
            break;
        case 'curacao':
            newUrl = 'curaçao';
            break;
        case 'timor-leste':
            newUrl = 'timor-leste';
            break;
        case 'guinea-bissau':
            newUrl = 'guinea-bissau';
            break;
        case 's-korea':
            newUrl = 's. korea';
            break;
        case 'st-vincent-grenadines':
            newUrl = 'st. vincent grenadines';
    }
    return newUrl;
}
//ABOUT PAGE
app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, `/${publicDir}/index.html`));//localhost
});
//WORLD COUNTRIES
app.get('/:country', (req, res) => {
    var url = req.params.country;
    url = (url === 'reunion' || url === 'curacao' || url === 'timor-leste' || url === 'guinea-bissau' || url === 's-korea' || url === 'st-vincent-grenadines') ? switchUrl(url) : url.replace(/-/g, ' ');
    const country = countryCodes.find(row => row.country.toLowerCase() === url);
    if (!country) { return res.status(404).sendFile(path.join(__dirname, `/${publicDir}/custom_404x.html`)); }
    res.sendFile(path.join(__dirname, `/${publicDir}/index.html`));//localhost
});
//USA STATES
app.get('/usa/:country', (req, res) => {
    var url = req.params.country;
    url = url.replace(/-/g, ' ');
    const usa = usCodes.find(row => row.state.toLowerCase() === url);
    if (!usa) { return res.status(404).sendFile(path.join(__dirname, `/${publicDir}/custom_404x.html`)); }
    res.sendFile(path.join(__dirname, `/${publicDir}/index.html`));//localhost
});

//POST ROUTES
app.post('/data', (req, res) => {
    if (!fetchData || fetchData.length === 0 || !usData || usData.length === 0 || !vaccineData || vaccineData.length === 0 || !yestData || yestData.length === 0 || !yestUsData || yestUsData.length === 0) { return res.send(false); }
    res.send({ countryCodes, fetchData, usData, vaccineData, yestData, yestUsData });
});
app.post('/chart-data', (req, res) => {
    const body = req.body;
    if (!body) { return res.send(false); }
    if (!parsedFull || parsedFull.length === 0 || !usDataHist || usDataHist.length === 0) { return res.send(false); }
    if (body.usOn) {
        const chartData = getStateData(body.alpha2, usDataHist);
        return res.send(chartData);
    }
    const chartData = loadCountryData(body.alpha2, parsedFull, countryCodes);
    res.send(chartData);
});

//HANDLE ALL 404 ERRORS
app.get('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, `/${publicDir}/custom_404x.html`));
});