import { countriesList, dataAPI, dataSVG, dataYest, mode, prop, switchValue, usOn, usSVG, zoomEl, usData, usDataYest } from "./main.js";
import { _, roundVal, createEl, createSVGEl } from "./exports/global.js";
import { pieSwitch, rawTotalSwitch, toggleSwitchCases } from "./exports/switches.js";

export var pathCountries = [];
const rangeLimit = 6;
var worldStats = _('worldStats');

//SVG PATHS
export function parseSVG() {
    return new Promise(resolve => {
        pathCountries = zoomEl.querySelectorAll('path');
        const dataPaths = [];
        for (let i = 0; i < pathCountries.length; i++) {
            if (pathCountries[i].getAttribute('data-id')) {
                const id = pathCountries[i].getAttribute('id').toLowerCase();
                const countryName = pathCountries[i].getAttribute('data-name');
                dataPaths.push({ path: pathCountries[i], id: id, country: countryName });
            }
        }
        resolve(dataPaths);
    });
}

//DATA MANIP
export function getData(data, yestData, dataVacc, svgList) {
    return new Promise(resolve => {
        const results = [];
        svgList.forEach(item => {
            const index = data.findIndex(data => data.country === item.country);
            if (index != -1) {
                data[index].alpha2 = item.id;
                const vaccIndex = dataVacc.findIndex(row => row.country === item.id);
                data[index].totalVaccinations = (vaccIndex != -1) ? Math.round(dataVacc[vaccIndex].totalVaccinations) : 0;
                data[index].peopleVaccinated = (vaccIndex != -1) ? Math.round(dataVacc[vaccIndex].peopleVaccinated) : 0;
                data[index].peopleFullyVaccinated = (vaccIndex != -1) ? Math.round(dataVacc[vaccIndex].peopleFullyVaccinated) : 0;
                data[index].partiallyVaccinated = (vaccIndex != -1) ? Math.round(Math.abs(((dataVacc[vaccIndex].peopleVaccinated || 0) - (dataVacc[vaccIndex].peopleFullyVaccinated || 0)))) : 0;
                data[index].totalBoosters = (vaccIndex != -1) ? Math.round(dataVacc[vaccIndex].totalBoosters) : 0;
                data[index].vaccines = (vaccIndex != -1) ? dataVacc[vaccIndex].vaccines : 'Not Reported';
                const yest = yestData.find(rec => rec.country === item.country);
                if (yest) {
                    data[index].yestCases = (yest.newCases) ? Math.round(yest.newCases) : 0;
                    data[index].yestDeaths = (yest.newDeaths) ? Math.round(yest.newDeaths) : 0;
                }
                results.push(data[index]);
            }
        });
        resolve(results);
    });
}
export function calcData(data) {
    return new Promise(resolve => {
        const results = [];
        const propList = ["totalDeaths", "totalRecovered", "activeCases"];
        var percVar = [];
        data.forEach(item => {
            propList.forEach((value, index) => {
                percVar[index] = (item[value] != null) ? roundVal((item[value] / item.totalCases) * 100, 1) : null;
            });
            const newCases = (item.newCases / item.population) * 100;
            const newDeaths = (item.newDeaths / item.population) * 100;
            const yestCases = (item.yestCases / item.population) * 100;
            const yestDeaths = (item.yestDeaths / item.population) * 100;
            const percVacc = (item.partiallyVaccinated / item.population) * 100;
            const percFullyVacc = (item.peopleFullyVaccinated / item.population) * 100;
            const percBoosted = (item.totalBoosters / item.population) * 100;
            item.newCasesPerMil = roundVal(newCases * 10000, 1);
            item.newDeathsPerMil = roundVal(newDeaths * 10000, 1);
            item.yestCasesPerMil = roundVal(yestCases * 10000, 1);
            item.yestDeathsPerMil = roundVal(yestDeaths * 10000, 1);
            item.percDeaths = percVar[0];
            item.percRecovered = percVar[1];
            item.percActive = percVar[2];
            item.percCritical = (item.seriousCritical === null) ? null : (item.activeCases != null && item.activeCases != 0) ? roundVal((item.seriousCritical / item.activeCases) * 100, 1) : 0;;
            item.percVacc = roundVal(percVacc, 1);
            item.percFullyVacc = roundVal(percFullyVacc, 1);
            item.percBoosted = roundVal(percBoosted, 1);
            results.push(item);
        });
        resolve(results);
    });
}
export function calcUsData(data, yestData) {
    return new Promise(resolve => {
        const rows = [];
        data.forEach(row => {
            row.partiallyVaccinated = Math.round(Math.abs((row.peopleVaccinated || 0) - (row.peopleFullyVaccinated || 0)));
            const yest = yestData.find(rec => rec.country === row.country);
            if (yest) {
                row.yestCases = (yest.newCases) ? Math.round(yest.newCases) : 0;
                row.yestDeaths = (yest.newDeaths) ? Math.round(yest.newDeaths) : 0;
            }
            rows.push(row);
        });
        resolve(rows);
    });
}

//EXECUTE PROP FUNCTIONS
export function getMinMax(data, property) {
    return new Promise(resolve => {
        const list = mapData(data, property);
        var max = Math.max.apply(null, list);
        var min = (Math.min.apply(null, list.filter(Boolean)) > 1) ? 1 : Math.min.apply(null, list.filter(Boolean));
        const minDecimal = min.countDecimals();
        min = (min < 1) ? 1 / Math.pow(10, minDecimal) : min;
        const range = (property === 'percRecovered' || property === 'percActive' || property === 'percCritical' || property === 'percVacc' || property === 'percFullyVacc' || property === 'percBoosted') ? getPercRangeList(max, min) : getRangeList(max, min);
        resolve(range);
    });
}
function mapData(data, property) {
    const list = data.map(item => {
        item[property] = (item[property] < 0) ? 0 : item[property];
        return item[property];
    });
    return list.sort((a, b) => (a < b) ? 1 : -1);//sort by descending;
}
function getPercRangeList(max, min) {
    if (max === 0) { return []; }
    const rangeList = [];
    const factor = (min < 1) ? 5 : 6;
    max = (Math.ceil(max / factor) >= 1) ? Math.ceil(max / factor) : 1;
    let item = min;
    for (let i = 0; i < rangeLimit; i++) {
        rangeList.push(item);
        item = (item < 1) ? 1 : (item === 1 && max >= 2) ? item + (max - 1) : item + max;
    }
    return rangeList;
}
function getRangeList(max, min) {
    const rangeList = [];
    var i = 0, numLength;
    while (i < rangeLimit) {
        numLength = Math.log(max) * Math.LOG10E + 1 | 0;
        max = (numLength <= 3 && i === 1) ? Math.floor(max) : Math.floor((max) / Math.pow(10, numLength - 1)) * Math.pow(10, numLength - 1);
        if (max >= 1) {
            if (i === rangeLimit - 1) {
                max = min;
            }
            rangeList.push(max);
        }
        else {
            if (min < 1) {
                rangeList.push(min);
                i = rangeLimit;
            }
        }
        max = ((numLength <= 5 && i === 0) || prop === 'percDeaths') ? max / 2
            : (max != Math.ceil((max + 1) / Math.pow(10, numLength + 1)) * Math.pow(10, numLength - 1))
                ? Math.ceil((max + 1) / Math.pow(10, numLength + 1)) * Math.pow(10, numLength - 1)
                : max / 10;
        i++;
    }
    return rangeList.reverse();//for legend colors, light to dark
}
export function matchData(data, property, range) {
    for (let i = 0; i < pathCountries.length; i++) {
        const countryData = pathCountries[i].getAttribute('data-name');
        const index = data.findIndex(data => data.country === countryData);
        if (index != -1) {
            const value = data[index][property];
            if (value >= 0 && value != null) { pathCountries[i].style.fill = val2color(value, range); }
            else { pathCountries[i].style.fill = '#9c9c9c'; }//no data
        }
        else { pathCountries[i].style.fill = '#9c9c9c'; }//no data
    }
}
function val2color(value, range) {
    const colors = toggleSwitchCases(switchValue).colors;
    let color = '';
    if (range.length === 0 || value === 0) { return colors[0]; }
    range.forEach((limit, index) => {
        if (index === 0) {
            if (value >= limit && value <= range[index + 1]) { color = colors[index + 1]; }
        }
        else if (index === range.length - 1) {
            if (value > range[range.length - 1]) { color = colors[index + 1]; }
        }
        else {
            if (value > limit && value <= range[index + 1]) { color = colors[index + 1]; }
        }
    });
    return color;
}

//DASHBOARD DATA
function totalOfProp(property) {
    let count = 0;
    countriesList.forEach(country => { count = count + Number(country[property]); });
    return count;
}
export function worldData(data) {
    worldStats.innerHTML = '';
    const query = (!usOn) ? 'World' : 'USA';
    const world = data.find(data => data.country === query);
    const totalPop = (!usOn) ? totalOfProp('population') : world.population;
    const newCasesPerMil = (!usOn) ? roundVal((world.newCases / totalPop) * 1000000, 1) : world.newCasesPerMil;
    const newDeathsPerMil = (!usOn) ? roundVal((world.newDeaths / totalPop) * 1000000, 1) : world.newDeathsPerMil;
    const totalTests = (!usOn) ? totalOfProp('totalTests') : world.totalTests;
    const totalPartialVacc = (!usOn) ? totalOfProp('partiallyVaccinated') : world.partiallyVaccinated;
    const totalPplFlVacc = (!usOn) ? totalOfProp('peopleFullyVaccinated') : world.peopleFullyVaccinated;
    const totalVacc = (!usOn) ? totalOfProp('totalVaccinations') : world.totalVaccinations;
    const totalBoosters = (!usOn) ? totalOfProp('totalBoosters') : world.totalBoosters;
    const percRecovered = Math.min(roundVal((world.totalRecovered / world.totalCases) * 100, 1), 100);
    const percActive = Math.min(roundVal((world.activeCases / world.totalCases) * 100, 1), 100);
    const percDeaths = Math.min(roundVal((world.totalDeaths / world.totalCases) * 100, 1), 100);
    const percCritical = Math.min(roundVal((world.seriousCritical / world.activeCases) * 100, 1), 100);
    const percPartialVacc = Math.min(roundVal((totalPartialVacc / totalPop) * 100, 1), 100);
    const percPplFlVacc = Math.min(roundVal((totalPplFlVacc / totalPop) * 100, 1), 100);
    const percBoosted = Math.min(roundVal((totalBoosters / totalPop) * 100, 1), 100);
    const title = (!usOn) ? 'Global' : 'US';
    switch (switchValue) {
        case 'cases':
            worldStats.append(appendGlobalTitle(title, 'global-cases-title'));
            const propList = ['New Cases/Mill', 'Active Cases', 'Critical Cases', 'Total Recovered'];
            const valueList = [newCasesPerMil.commaSplit(), world.activeCases.commaSplit(), world.seriousCritical.commaSplit(), world.totalRecovered.commaSplit()];
            const pieValues = [percActive, percCritical, percRecovered];
            let count = 0;
            propList.forEach((p, index) => {
                if (index === 0) { return worldStats.append(appendGlobalFlexWrap(valueList[index], propList[index])); }
                worldStats.append(appendGlobalFlexWrap(valueList[index], propList[index], pieValues[count]));
                count++;
            });
            worldStats.append(appendGlobalStat(world.casesPerMil.commaSplit(), 'Cases/Mill'));
            worldStats.append(appendGlobalStat(world.totalCases.commaSplit(), 'Confirmed Cases'));
            break;
        case 'tests':
            worldStats.append(appendGlobalTitle(title, 'global-tests-title'));
            worldStats.append(appendGlobalStat(totalTests.commaSplit(), 'Total Tests'));
            worldStats.append(appendGlobalStat(totalPop.commaSplit(), 'Population'));
            break;
        case 'vaccines':
            worldStats.append(appendGlobalTitle(title, 'global-vacc-title'));
            worldStats.append(appendGlobalFlexWrap(totalPplFlVacc.commaSplit(), 'People Fully Vaccinated', percPplFlVacc));
            worldStats.append(appendGlobalFlexWrap(totalPartialVacc.commaSplit(), 'People Partially Vaccinated', percPartialVacc));
            worldStats.append(appendGlobalFlexWrap(totalBoosters.commaSplit(), 'People Boosted', percBoosted));
            worldStats.append(appendGlobalStat(totalVacc.commaSplit(), 'Total Vaccinations'));
            break;
        case 'deaths':
            worldStats.append(appendGlobalTitle(title, 'global-deaths-title'));
            worldStats.append(appendGlobalFlexWrap(newDeathsPerMil.commaSplit(), 'New Deaths/Mill'));
            worldStats.append(appendGlobalStat(world.deathsPerMil.commaSplit(), 'Deaths/Mill'));
            worldStats.append(appendGlobalFlexWrap(world.totalDeaths.commaSplit(), 'Total Deaths', percDeaths));
    }
}
function appendGlobalTitle(text, titleClass) {
    const title = createEl('h2', `global-title ${titleClass}`);
    title.innerText = `${text} Stats`;
    return title;
}
function appendGlobalStat(stat, title) {
    const div = createEl('div', '');
    const p1 = createEl('p', 'stats white');
    const p2 = createEl('p', 'stats-titles gray');
    p1.innerText = stat;
    p2.innerText = title;
    div.append(p1);
    div.append(p2);
    return div;
}
function appendGlobalFlexWrap(stat, title, perc) {
    const wrapper = createEl('div', 'worldStats-flex');
    wrapper.append(appendGlobalStat(stat, title));
    if (!perc) { wrapper.append(appendGlobalFlex('Percent Daily Change', title)); }
    else { wrapper.append(appendPiePerc(perc, pieSwitch(title), true)); }
    return wrapper;
}
function appendGlobalFlex(title, propTitle) {
    const div = createEl('div', 'flex-stat flex-stat-global');
    div.setAttribute('title', title);
    const country = (usOn) ? 'USA' : 'World';
    const bool = (usOn) ? true : false;
    const yestData = getYestData(country, true, bool);
    const perc = (propTitle === 'New Cases/Mill') ? yestData.perc : yestData.percDeaths;
    div.append(appendPercChange(perc, true));
    return div;
}
export function getYestData(country, world, usa) {
    const dataset = (!usOn || usa) ? countriesList : usData;
    const yestData = (!usOn || usa) ? dataYest : usDataYest;
    const percArray = [];
    const record = (world) ? dataAPI.find(data => data.country === country) : sortList(dataset, 'newCases').find(data => data.country === country);
    const yestRecord = (world) ? yestData.find(data => data.country === country) : sortList(yestData, 'newCases').find(data => data.country === country);
    const propList = ['newCases', 'newDeaths'];
    propList.forEach(p => {
        const factor = (yestRecord[p] > 0) ? yestRecord[p] : 1;
        let value = ((record[p] - (yestRecord[p] || 0)) / factor) * 100;
        value = roundVal(value, 2);
        percArray.push(value);
    });
    return { perc: percArray[0], percDeaths: percArray[1] };
}
export function appendPercChange(perc, onGlobal) {
    var color;
    if (!onGlobal) { color = (Math.sign(perc) === 1) ? (mode === 'dark') ? '#f6584C' : '#B13507' : (mode === 'dark') ? '#6dff71' : '#209222'; }
    else { color = (Math.sign(perc) === 1) ? '#f6584C' : '#6dff71'; }
    const arrow = (Math.sign(perc) === -1) ? '▼' : '▲';
    const plus = (Math.sign(perc) === 1) ? '+' : '';
    const div = createEl('div', 'flex-stat');
    const p1 = createEl('p', 'stats stats-perc');
    const p2 = createEl('p', 'stats-titles');
    p1.setAttribute('style', `color:${color};`);
    p2.setAttribute('style', `color:${color};`);
    p1.innerText = arrow
    p2.innerText = `${plus}${perc}%`;
    div.append(p1);
    div.append(p2);
    return div;
}
export function appendPiePerc(perc, property, global) {
    perc = Math.min(perc, 100);
    const radius = (global) ? 25 : 30;
    const factor = (global) ? 118 : 141;
    const circumference = (global) ? 157 : 188;
    const strokeValue = (perc / 100) * factor;
    const strokeWidth = (global) ? 2 : 5;
    const wrapperClass = (global) ? 'pie-wrapper pie-wrapper-global' : 'pie-wrapper';
    const color1 = (property === 'totalRecovered' || property === 'percRecovered' || property === 'percVacc' || property === 'percFullyVacc' || property === 'percBoosted') ? (mode === 'dark' || global) ? '#f6584C' : '#B13507' : (mode === 'dark' || global) ? '#6dff71' : '#209222';
    const color2 = (color1 === '#f6584C' || color1 === '#B13507') ? (mode === 'dark' || global) ? '#6dff71' : '#209222' : (mode === 'dark' || global) ? '#f6584C' : '#B13507';
    const info = (property === 'percCritical' || property === 'seriousCritical') ? '% of Active' : (property === 'percVacc' || property === 'percFullyVacc' || property === 'percBoosted') ? '% of Pop' : '% of Cases';
    const wrapper = createEl('div', wrapperClass);
    wrapper.setAttribute('title', `${(global) ? info : ''}`);
    const svg = createSVGEl('svg', 'circle');
    const circle1 = createSVGEl('circle', '');
    const circle2 = createSVGEl('circle', '');
    const circles = [circle1, circle2];
    circles.forEach(c => {
        c.setAttribute('r', radius);
        c.setAttribute('cx', '50%');
        c.setAttribute('cy', '50%');
        c.setAttribute('fill', 'none');
        c.setAttribute('stroke-width', strokeWidth);
        c.setAttribute('stroke-linecap', 'round');
    });
    circle1.setAttribute('stroke', color1);
    circle2.setAttribute('stroke', color2);
    circle1.setAttribute('stroke-opacity', '0.2');
    circle1.setAttribute('stroke-dasharray', `${factor}, ${circumference}`);
    circle2.setAttribute('stroke-dasharray', `${strokeValue}, 188`);
    svg.append(circle1);
    svg.append(circle2);
    wrapper.append(svg);
    const div1 = createEl('div', 'circle-info circle-perc');
    div1.setAttribute('style', `color:${color2};`);
    div1.innerText = perc;
    wrapper.append(div1);
    if (!global) {
        const div2 = createEl('div', 'circle-info');
        div2.setAttribute('style', `color:${color2};`);
        div2.innerText = info;
        wrapper.append(div2);
    }
    return wrapper;
}

//DASHBOARD LIST + SORT
export function showSortedList(data) {
    const color = toggleSwitchCases(switchValue).color;
    const title = rawTotalSwitch(prop).title;
    const rankTitle = (!usOn) ? 'Global Ranks' : 'US Ranks';
    const list = _('worldList');
    list.innerHTML = '';
    const svgList = (!usOn) ? dataSVG : usSVG;
    appendListTitle(list, color, rankTitle, title);
    sortList(data).forEach(item => {
        const flagId = svgList.find(row => row.country === item.country).id;
        const flagUrl = (flagId === 'ic') ? `https://worldmapcovid19.b-cdn.net/static/images/ic.png` : (flagId === 'us-dc') ? `https://worldmapcovid19.b-cdn.net/static/images/us-dc.png` : `https://flagcdn.com/60x45/${flagId}.png`;
        list.append(appendListItem(item, flagUrl));
    });
}
function appendListTitle(list, color, rankTitle, title) {
    const h2 = createEl('h2', 'global-title');
    const p = createEl('p', 'ranks-title gray');
    h2.style.color = color;
    h2.innerText = rankTitle;
    p.innerText = title;
    list.append(h2);
    list.append(p);
}
function appendListItem(item, url) {
    const div = createEl('div', 'stats-flex');
    div.setAttribute('data-country', item.country);
    const rank = createEl('p', 'inline-count');
    const flag = createEl('div', 'bckg-img inline-flag');
    const country = createEl('p', 'inline-p');
    const stat = createEl('p', 'inline-stat');
    rank.innerText = item.rank;
    flag.setAttribute('style', `background-image:url(${url});`);
    country.innerText = item.country;
    stat.innerText = item[prop].commaSplit();
    div.append(rank);
    div.append(flag);
    div.append(country);
    div.append(stat);
    return div;
}
export function sortList(data, property) {
    if (!property) { property = prop; }
    const sortedList = [];
    data.forEach(item => {
        if (item[property] != null) {
            item[property] = (item[property] < 0) ? 0 : item[property];
            sortedList.push(item);
        }
    });
    sortedList.sort((a, b) => (a[property] < b[property]) ? 1 : -1);//sort by property
    let count = 0;
    sortedList.forEach((value, index) => {
        count = (index > 0) ? (sortedList[index][property] === sortedList[index - 1][property]) ? count : count + 1 : count + 1;
        value.rank = count;
    });
    return sortedList;
}
export function getSortedRecord(country, property) {
    const dataset = (!usOn) ? countriesList : usData;
    const list = sortList(dataset, property);
    const record = list.find(data => data.country === country);
    if (!record) { return false; }
    return record;
}

export function switchPerc(property, country) {
    const dataset = (!usOn) ? countriesList : usData;
    let perc;
    switch (property) {
        case 'percDeaths':
            perc = dataset.find(data => data.country === country).percDeaths;
            break;
        case 'percRecovered':
            perc = dataset.find(data => data.country === country).percRecovered;
            break;
        case 'percActive':
            perc = dataset.find(data => data.country === country).percActive;
            break;
        case 'percCritical':
            perc = dataset.find(data => data.country === country).percCritical;
            break;
        case 'percVacc':
            perc = dataset.find(data => data.country === country).percVacc;
            break;
        case 'percFullyVacc':
            perc = dataset.find(data => data.country === country).percFullyVacc;
            break;
        case 'percBoosted':
            perc = dataset.find(data => data.country === country).percBoosted;
    }
    return perc;
}