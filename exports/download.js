const https = require('https');
const fs = require('fs');

//DOWNLOAD FILES
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
        case 'https://www.worldometers.info/coronavirus/':
            filename = 'data/scrape/world-scrape.html';
            break;
        case 'https://covid.ourworldindata.org/data/owid-covid-data.json':
            filename = 'data/owid/owid-covid-data.json';
    }
    return filename;
}
function downloadFile(url, callback) {
    const filename = switchDir(url);
    const downloadReq = https.get(url, res => {
        if (res.statusCode >= 200 && res.statusCode < 304) {
            const filestream = fs.createWriteStream(filename);
            res.pipe(filestream);
            filestream.on('error', (err) => {
                console.error(`ERROR WRITING STREAM FOR: ${filename} AT ${new Date()}`);
                console.error(err);
                callback(false);
            });
            filestream.on('finish', () => { filestream.close(); });
            filestream.on('close', () => { callback(filename); });
        }
        else {
            console.error(`ERROR DOWNLOADING FILE: Bad status response for: ${filename} AT ${new Date()}`);
            callback(false);
        }
    });
    downloadReq.on('error', (err) => {
        console.error(`ERROR DOWNLOADING FILE: ${filename} AT ${new Date()}`);
        console.error(err);
        callback(false);
    });
}

module.exports = { downloadFile };