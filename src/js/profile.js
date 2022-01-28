import { appendChartLoader, createEl, _ } from "./exports/global.js";
import { appendPercChange, appendPiePerc, getSortedRecord, getYestData, pathCountries, switchPerc } from "./data.js";
import { countryPopup, clearPage, zoomEl, svgEl, usOn, dataSVG, usSVG, onShowPopup, onMenuBtn, addHeader } from "./main.js";
import { fadePan, getPrevMatrix, maxZoom, pathStrokeHandler, setMatrix } from "./panzoom.js";
import { dropDownSwitch, rawTotalSwitch } from "./exports/switches.js";
import { onCloseSearch } from "./search.js";
import { chartOn, fetchChartData, removeChartListeners, removeGlobalChartListeners, setChartOn } from "./chart.js";

//PAN & ZOOM TO COUNTRY ANIMATION
export function goToCountry(e) {
    cancelAnimationFrame(fadePan);
    popup.classList.add('no-display');
    clearPage();
    zoomToCountry(e);
}
function zoomToCountry(e) {
    onCloseSearch();
    getPrevMatrix();
    const pathBox = e.getBBox();
    const country = e.getAttribute('data-name');
    const alpha2 = e.getAttribute('data-id');
    highlightCountry(country);
    const windowHeight = window.innerHeight + 50;
    const initialMat = zoomEl.transform.baseVal.getItem(0).matrix;
    const initialLimit = Math.min(window.innerWidth - (initialMat.a * pathBox.width), windowHeight - (initialMat.a * pathBox.height));
    const limitSign = Math.sign(initialLimit);
    initialMat.e = -((pathBox.x * initialMat.a) - (window.innerWidth - (pathBox.width * initialMat.a)) / 2);//centerBoundX
    initialMat.f = -((pathBox.y * initialMat.a) - (windowHeight - (pathBox.height * initialMat.a)) / 2);//centerBoundY
    const finalScale = Math.min(Math.min(((window.innerHeight - 170) / pathBox.height), ((window.innerWidth - 20) / pathBox.width)), maxZoom);//120 for 60px extra padding on top/bottom + 50px header
    panToCountry(initialMat, pathBox, limitSign, finalScale, country, alpha2);
}
function highlightCountry(country) {
    for (let i = 0; i < pathCountries.length; i++) {
        if (pathCountries[i].getAttribute('data-name') === country) { pathCountries[i].classList.add('light-path'); }
        else { pathCountries[i].classList.add('dark-path'); }
    }
}
function transformSVG(m) {
    const transform = `matrix(${m.a},${m.b},${m.c},${m.d},${m.e},${m.f})`;
    zoomEl.setAttributeNS(null, 'transform', transform);
}
function panToCountry(m, pathBox, limitSign, finalScale, country, alpha2) {
    zoomEl.classList.add('ease-out');
    transformSVG(m);
    setTimeout(() => { zoomLoop(pathBox, limitSign, finalScale, country, alpha2); }, 200);
}
function zoomLoop(pathBox, limitSign, finalScale, country, alpha2) {
    const scale = (limitSign === -1) ? 0.85 : 1.15;
    zoomEl.classList.remove('ease-out');
    function zoomAnim() {
        const prevMat = zoomEl.transform.baseVal.getItem(0).matrix;
        const p = svgEl.createSVGPoint();
        p.x = (pathBox.x + pathBox.width / 2) * prevMat.a + prevMat.e;
        p.y = (pathBox.y + pathBox.height / 2) * prevMat.d + prevMat.f;
        const matrix = zoomEl.getScreenCTM().multiply(setMatrix(p, scale));
        if (limitSign === -1) {
            if (matrix.a >= finalScale) {
                transformSVG(matrix);
                requestAnimationFrame(zoomAnim);
            }
            else { cancelAnimationFrame; onZoomAnimEnd(country, alpha2); }
        }
        else {
            if (matrix.a <= finalScale) {
                transformSVG(matrix);
                requestAnimationFrame(zoomAnim);
            }
            else { cancelAnimationFrame; onZoomAnimEnd(country, alpha2); }
        }
    }
    zoomAnim();
}
function onZoomAnimEnd(country, alpha2, state) {
    pathStrokeHandler();
    showCountryPopup(country, alpha2, state);
    const target = (usOn) ? country : alpha2;
    fetchChartData(target);
}
export function zoomToCountryNoAnim(e, noPrevMat, state) {
    if (chartOn) { removeChartListeners(); removeGlobalChartListeners(); setChartOn(false); }
    cancelAnimationFrame(fadePan);
    if (!noPrevMat) { getPrevMatrix(); }
    const pathBox = e.getBBox();
    const country = e.getAttribute('data-name');
    const alpha2 = e.getAttribute('data-id');
    highlightCountry(country);
    const windowHeight = window.innerHeight + 50;
    const matrix = {};
    matrix.b = matrix.c = 0;
    matrix.a = matrix.d = Math.min(Math.min(((window.innerHeight - 170) / pathBox.height), ((window.innerWidth - 20) / pathBox.width)), maxZoom);//120 for 60px header
    matrix.e = -((pathBox.x * matrix.a) - (window.innerWidth - (pathBox.width * matrix.a)) / 2);//centerBoundX
    matrix.f = -((pathBox.y * matrix.a) - (windowHeight - (pathBox.height * matrix.a)) / 2);//centerBoundY
    transformSVG(matrix);
    onZoomAnimEnd(country, alpha2, state);
}

//COUNTRY PROFILE
function cleanUrl(url) {
    if (url != 'Réunion' && url != 'Curaçao') {
        url = url.replace(/\s/g, '-').toLowerCase();//replace all white space with dash
        url = url.replace(/[^a-zA-Z/-]/g, "").toLowerCase();//remove all non-letter characters except '-' for timor-leste
        return url;
    }
    else {
        if (url === 'Réunion') { return 'reunion'; }
        else if (url === 'Curaçao') { return 'curacao'; }
    }
}
function replaceURL(country) {
    const pageTitle = `${country} | COVID-19 World Map`;
    const url = cleanUrl(country);
    const newUrl = (!usOn) ? `/${url}` : `/usa/${url}`;
    const state = { country, usOn };
    window.history.pushState(state, pageTitle, newUrl);
    document.title = pageTitle;
}
function showCountryPopup(country, alpha2, state) {
    if (!state) { replaceURL(country); }
    onShowPopup(country, alpha2);
    const propList = (!usOn) ? ["newCasesPerMil", "yestCasesPerMil", "newDeathsPerMil", "yestDeathsPerMil", "percDeaths", "percActive", "percCritical", "percRecovered", "testsPerMil", "percFullyVacc", "percVacc", "percBoosted", "totalVaccinations"] : ["newCasesPerMil", "yestCasesPerMil", "newDeathsPerMil", "yestDeathsPerMil", "percDeaths", "percActive", "percRecovered", "testsPerMil", "percFullyVacc", "percVacc", "percBoosted", "totalVaccinations"];
    const propTitles = (!usOn) ? ["Today's Cases", "Yesterday's Cases", "Today's Deaths", "Yesterday's Deaths", "Case Fatality Rate", "Active", "Critical", "Recovered", "Tests", "Fully Vaccinated", "Partially Vaccinated", "Boosted", "Vaccinations"] : ["Today's Cases", "Yesterday's Cases", "Today's Deaths", "Yesterday's Deaths", "Case Fatality Rate", "Active", "Recovered", "Tests", "Fully Vaccinated", "Partially Vaccinated", "Boosted", "Vaccinations"];
    const svgList = (!usOn) ? dataSVG : usSVG;
    const flagId = svgList.find(path => path.country === country).id;
    const flagUrl = (flagId === 'ic') ? `https://worldmapcovid19.b-cdn.net/static/images/ic.png` : (flagId === 'us-dc') ? `https://worldmapcovid19.b-cdn.net/static/images/us-dc.png` : `https://flagcdn.com/h240/${flagId}.png`;
    countryPopup.innerHTML = '';
    const onUsBtn = (alpha2.toLowerCase() === 'us') ? true : false;
    countryPopup.append(appendProfileHeader(country, flagUrl, onUsBtn));
    const statsWrapper = appendStatsWrapper();
    statsWrapper.append(appendChartDiv());
    propList.forEach((item, index) => {
        const title = rawTotalSwitch(item).title;
        const totalProp = rawTotalSwitch(item).totalProp;
        const colorClass = rawTotalSwitch(item).colorClass;
        const flexClass = (item === 'totalVaccinations' && !usOn) ? 'stats-column-flex-100' : '';
        const helpText = dropDownSwitch(item);
        const statContainer = appendStatContainer(flexClass, helpText, colorClass, propTitles[index]);
        const record = getSortedRecord(country, item);
        if (!record) { statContainer.append(appendNoData()); return statsWrapper.append(statContainer); }
        const perc = switchPerc(item, country);
        const pie = (perc >= 0 && perc != null) ? appendPiePerc(perc, item) : appendFlexStat('stats', 'stats-titles dark-gray', record[item].commaSplit(), title);
        statContainer.append(pie);
        statContainer.append(appendFlexStat('stats', 'stats-titles dark-gray', record.rank, 'Rank'));
        if (item != 'totalVaccinations') { statContainer.append(appendFlexStat('stats', 'stats-titles dark-gray text-center', record[totalProp].commaSplit(), 'Raw Total')); }
        else {
            if (!usOn) { statContainer.append(appendFlexStat('stats text-center font-vw', 'stats-titles dark-gray text-center', record.vaccines, 'Vaccines')); }
        }
        if (item === 'newCasesPerMil' || item === 'newDeathsPerMil') {
            const yestData = getYestData(country);
            const percChange = (item === 'newCasesPerMil') ? yestData.perc : yestData.percDeaths;
            statContainer.append(appendPercChange(percChange));
        }
        statsWrapper.append(statContainer);
    });
    countryPopup.append(statsWrapper);
    if (alpha2.toLowerCase() === 'us') { countryPopup.querySelector('.us-btn').addEventListener('click', function (e) { onMenuBtn('us'); }); }
    setTimeout(() => { addHeader(); }, 300);
}

//PROFILE HEADER
function appendProfileHeader(country, url, onUsBtn) {
    const wrapper = createEl('div', 'country-wrapper');
    wrapper.append(appendProfileCountry(getSortedRecord(country, 'casesPerMil'), url, onUsBtn));
    wrapper.append(appendHeaderStat(getSortedRecord(country, 'casesPerMil')));
    wrapper.append(appendHeaderStat(getSortedRecord(country, 'deathsPerMil'), true));
    return wrapper;
}
function appendProfileCountry(record, url, onUsBtn) {
    const div = createEl('div', 'country-container');
    if (onUsBtn) {
        const usBtn = createEl('button', 'us-btn ease-out');
        usBtn.innerText = '50 STATE MAP';
        div.append(usBtn);
    }
    const flag = createEl('div', 'flag-big bckg-img');
    flag.setAttribute('style', `background-image:url(${url});`);
    div.append(flag);
    div.append(appendStat('country-big', record.country));
    div.append(appendStat('stats', record.population.commaSplit()));
    div.append(appendStat('stats-titles dark-gray', 'Population'));
    return div;
}
function appendHeaderStat(record, onDeaths) {
    const color = (onDeaths) ? 'red' : 'blue';
    const div = createEl('div', 'stats-column');
    div.append(appendStat(`prop-title-main ${color}`, `${(onDeaths) ? 'Deaths' : 'Cases'}`));
    div.append(appendStat(`stats ${color}`, `${(onDeaths) ? record.deathsPerMil.commaSplit() : record.casesPerMil.commaSplit()}`));
    div.append(appendStat(`stats-titles white`, `${(onDeaths) ? 'Deaths/Mill' : 'Cases/Mill'}`));
    div.append(appendStat(`stats ${color}`, record.rank));
    div.append(appendStat(`stats-titles white`, 'Rank'));
    div.append(appendStat(`stats dark-gray`, `${(onDeaths) ? record.totalDeaths.commaSplit() : record.totalCases.commaSplit()}`));
    div.append(appendStat(`stats-titles dark-gray`, 'Raw Total'));
    return div;
}
function appendStat(classes, val) {
    const p = createEl('p', classes);
    p.innerText = val;
    return p;
}

//PROFILE STATS
function appendStatsWrapper() {
    const wrapper = createEl('div', 'flex-stats-container');
    return wrapper;
}
function appendStatContainer(flexClass, helpText, colorClass, propTitle) {
    const div = createEl('div', `stats-column-flex ${flexClass}`);
    const tip = createEl('button', 'help-tip-stats help-tip');
    const pTip = createEl('p', '');
    const title = createEl('p', `prop-title ${colorClass}`);
    pTip.innerHTML = helpText;
    tip.append(pTip);
    title.innerHTML = propTitle;
    div.append(tip);
    div.append(title);
    return div;
}
function appendFlexStat(statClasses, titleClasses, record, title) {
    const div = createEl('div', 'flex-stat');
    div.append(appendStat(statClasses, record));
    div.append(appendStat(titleClasses, title));
    return div;
}
function appendNoData() {
    const p = createEl('p', 'stats yellow-test text-center');
    p.innerText = 'No Reported Data';
    return p;
}

//CHART DIV
function appendChartDiv() {
    const div = createEl('div', '');
    div.setAttribute('id', 'chart');
    div.append(appendChartLoader());
    return div;
}