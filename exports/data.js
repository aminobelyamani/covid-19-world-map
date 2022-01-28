//VACCINE FUNCTIONS
function mapVaccineData(data, prop) {
    const valList = data.map(item => { return item[prop]; });
    return valList;
}
function getVaccineData(parsed, locations, countryCodes) {
    if (parsed.length === 0 || locations.length === 0) { return false; }
    const dataList = [];
    const propList = ['total_vaccinations', 'people_vaccinated', 'people_fully_vaccinated', 'total_boosters'];
    countryCodes.forEach(country => {
        const list = parsed.filter(row => row.iso_code.toLowerCase() === country.alpha3.toLowerCase());
        if (list.length > 0) {
            const values = [];
            propList.forEach(prop => {
                const mapped = mapVaccineData(list, prop);
                const max = Math.max.apply(null, mapped);
                values.push(max);
            });
            const index = locations.findIndex(row => row.iso_code.toLowerCase() === country.alpha3.toLowerCase());
            const vaccines = (index != -1) ? locations[index].vaccines : 'Not Reported';
            dataList.push({ country: country.alpha2, totalVaccinations: values[0], peopleVaccinated: values[1], peopleFullyVaccinated: values[2], totalBoosters: values[3], vaccines: vaccines });
        }
    });
    //OWID_WRL
    const list = parsed.filter(row => row.iso_code === 'OWID_WRL');
    if (list.length > 0) {
        const values = [];
        propList.forEach(prop => {
            const mapped = mapVaccineData(list, prop);
            const max = Math.max.apply(null, mapped);
            values.push(max);
        });
        dataList.push({ country: 'OWID_WRL', totalVaccinations: values[0], peopleVaccinated: values[1], peopleFullyVaccinated: values[2], totalBoosters: values[3] });
    }
    console.log(`WORLD vaccine data compiled AT ${new Date}`);
    return dataList;
}
function getUsVaccineData(parsed, usCodes) {
    return new Promise(resolve => {
        if (parsed.length === 0) { resolve(false); }
        else {
            const dataList = [];
            const propList = ['total_vaccinations', 'people_vaccinated', 'people_fully_vaccinated', 'people_vaccinated_per_hundred', 'people_fully_vaccinated_per_hundred', 'total_boosters'];
            usCodes.forEach(state => {
                const list = parsed.filter(row => row.location === state.state);
                if (list.length > 0) {
                    const values = [];
                    propList.forEach(prop => {
                        const mapped = mapVaccineData(list, prop);
                        const max = Math.max.apply(null, mapped);
                        values.push(max);
                    });
                    dataList.push({ country: state.state, totalVaccinations: values[0], peopleVaccinated: values[1], peopleFullyVaccinated: values[2], percVacc: values[3], percFullyVacc: values[4], totalBoosters: values[5] });
                }
            });
            resolve(dataList);
        }
    });
}

//COMBINE US WORLDOMETERS DATA AND OWID VACCINE DATA
function compileUsData(data, vaccData) {
    const results = [];
    vaccData.forEach(row => {
        const index = data.findIndex(data => data.country === row.country);
        if (index != -1) {
            data[index].totalVaccinations = row.totalVaccinations;
            data[index].peopleVaccinated = row.peopleVaccinated;
            data[index].peopleFullyVaccinated = row.peopleFullyVaccinated;
            data[index].percVacc = row.percVacc;
            data[index].percFullyVacc = row.percFullyVacc;
            data[index].totalBoosters = row.totalBoosters;
            results.push(data[index]);
        }
    });
    return results;
}

//CHART FUNCTIONS
function loadCountryData(country, parsedData, countryCodes) {
    if (parsedData.length === 0) { return false; }
    const alpha3 = countryCodes.find(record => record.alpha2.toLowerCase() === country.toLowerCase()).alpha3.toUpperCase();
    if (!alpha3) { return false; }
    const raw = (parsedData[alpha3]) ? parsedData[alpha3].data : false;
    if (!raw) { return false; }
    const data = {};
    data.country = country;
    data.data = [];
    const propList = ['new_cases', 'new_deaths', 'new_cases_smoothed', 'new_deaths_smoothed', 'new_tests_smoothed', 'new_vaccinations_smoothed', 'stringency_index', 'icu_patients', 'hosp_patients'];
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

//US DATA HISTORY FUNCTIONS
function compileUsDataHist(data, parsedData, usCodes) {
    return new Promise(resolve => {
        var count = 0;//tracking changes
        usCodes.forEach(state => {
            const parsedStateList = parsedData.filter(row => row.location.toLowerCase() === state.state.toLowerCase());
            const histIndex = data.findIndex(row => row.country.toLowerCase() === state.state.toLowerCase());
            const histList = (histIndex != -1) ? data[histIndex].data : false;
            if (histList) {
                const finalIndex = histList.length - 1;
                if (histList[finalIndex].hasOwnProperty('new_vaccinations_smoothed') === false) {
                    const vaccIndex = parsedStateList.findIndex(row => row.date.toString() === histList[finalIndex].date.toString());
                    if (vaccIndex != -1) {
                        const dailyVacc = parsedStateList[vaccIndex].daily_vaccinations || 0;
                        data[histIndex].data[finalIndex].new_vaccinations_smoothed = Number(dailyVacc);
                        count++;//change has been made
                    }
                }
            }
        });
        resolve({ data, count });
    });
}
function addNewDataToHist(data, parsedData, parsedRawData) {
    return new Promise(resolve => {
        const date = getYestDate();
        var count = 0;//track changes
        data.forEach(row => {
            const record = parsedRawData.find(record => record.country === row.country);
            const rawIndex = parsedRawData.findIndex(record => record.country === row.country);
            const index = parsedData.findIndex(record => record.country === row.country);
            const i = record.data.length - 1;
            if (record && record.data[i].date != date) {
                const rawPayload = {
                    date: date,
                    new_cases: Number(row.newCases),
                    new_deaths: Number(row.newDeaths)
                };
                parsedRawData[rawIndex].data.push(rawPayload);
                let caseSum = row.newCases, deathSum = row.newDeaths;
                for (k = 0; k < 6; k++) {
                    caseSum += record.data[i - k].new_cases;
                    deathSum += record.data[i - k].new_deaths;
                }
                const caseAvg = roundVal((caseSum / 7), 2);
                const deathAvg = roundVal((deathSum / 7), 2);
                const payload = {
                    date: date,
                    new_cases_smoothed: caseAvg,
                    new_deaths_smoothed: deathAvg
                };
                parsedData[index].data.push(payload);
                count++;//change has been made
            }
        });
        resolve({ parsedData, parsedRawData, count });
    });
}
function getYestDate() {
    const today = new Date().toUTCString();//get GMT timezone
    var yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday = yesterday.toISOString().slice(0, 10);
    return yesterday;
}
function roundVal(value, precision) {
    const multiplier = Math.pow(10, precision || 0);
    return Math.ceil(value * multiplier) / multiplier;
}

module.exports = { getVaccineData, getUsVaccineData, compileUsData, loadCountryData, compileUsDataHist, addNewDataToHist };