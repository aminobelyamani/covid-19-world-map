function _(x) {
    return document.getElementById(x);
}
//global variables
var pathCountries = [];
var countryCodes = [];
const dataSVG = [];
var dataAPI = [];
var dataVacc = [];
const countriesList = [];
var globalRangeList = [];
var prop = "casesPerMil";
var currentTitle = "Cases/Million";
const rangeLimit = 6;
var switchValue = "cases";
var mode = "dark";
//global DOM elements
var html = _('html');
var header = _('header');
var headerTitle = _('headerTitle');
var loader = _('loader');
var mobileNav = _('mobileNav');
var hamburger = _('hamburger');
var mapDiv = _('mapDiv');
var worldMap = _('worldMap');
var about = _('about');
var globalInstructions = _('globalInstructions');
var currentDataWrapper = _('currentDataWrapper');
var globalHelpTip = _('globalHelpTip');
var currentData = _('currentData');
var toggleDark = _('toggleDark');
var centerBtn = _('centerBtn');
var keyBtn = _('keyBtn');
var keys = _('keys');
var legendHelpTip = _('legendHelpTip');
var closeKeys = _('closeKeys');
var keyTitle = _('keyTitle');
var legendColors = _('legendColors');
var toggle = _('toggleSideBar');
var closeDash = _('closeDash');
var sideBar = _('sideBar');
var timeStamp = _('timeStamp');
var switchWrapper = _('switchWrapper');
const switchToggle = _('switchSVG');
var switchG = _('switchG');
var switchCircle = _('switchCircle');
var optionsDiv = _('optionsDiv');
var dropDown = _('dropDown');
var dropDownTitle = _('dropDownTitle');
var casesMenu = _('casesMenu');
var testsMenu = _('testsMenu');
var deathsMenu = _('deathsMenu');
var vaccMenu = _('vaccMenu');
var statsWrapper = _('statsWrapper');
var searchWrapper = _('searchWrapper');
var searchIcon = _('searchIcon');
var searchInput = _('searchInput');
var closeSearch = _('closeSearch');
var resultsWrapper = _('resultsWrapper');
var countryPopup = _('countryPopup');
var closePopup = _('closePopup');
var popup = _('popup');
var is_touch_device;
let socket;
var chartOn = false;
function onPageLoad() {
    _('overlay').style.display = "none";
    sideBar.style.visibility = "visible";
    sideBar.className = '';
    toggle.style.opacity = 0;
    currentData.innerText = currentTitle;
    currentDataWrapper.style.visibility = "visible";
    fadeOut(loader);
    is_touch_device = 'ontouchstart' in document.documentElement;
    if (is_touch_device) {
        touchEvents();
        addZoomTapListeners();
        removeHover();
    }
    else {
        addZoomTapListeners();
    }
    openLegend();
    addPopupListeners();
    showGlInstructions();
    globalHelpTipHandler();
    legendHelpTipHandler();
}
function showGlInstructions() {
    if (is_touch_device) {
        globalInstructions.classList.remove('transform-y-220');
        const p = globalInstructions.querySelector('p');
        globalInstructions.style.display = "block";
        p.innerText = 'Tap country for info, press and hold for full country profile.';
    }
}
function onDOMLoaded() {
    socket = io();
    socketListeners(socket);
    parseSVG();
    pathStrokeHandler();
    fetch('https://api.apify.com/v2/key-value-stores/SmuuI0oebnTWjRTUh/records/LATEST?disableRedirect=true')
        .then(response => {
            if (response.ok) {
                return response.json();
            }
        })
        .then(data => {
            if (data) {
                dataAPI = data.regionData;
                socket.emit('getCountryCodes');
                socket.emit('getVaccineData');
                timeStamp.innerText = `Updated at ${formatTime()} EST`;
                onPageLoad();
            }
            else {
                //displayFetchError();
                socket.emit('getFetchFromServer');
                onPageLoad();
            }
        });
    setInterval(() => {
        fetchAPI();
    }, 300000);
}
function socketListeners(socket) {
    socket.on('getFetchFromServer', data => {
        dataAPI = data.regionData;
        getData(dataAPI);
        timeStamp.innerText = `Updated at ${formatTime()} EST`;
    });
    socket.on('getCountryCodes', data => {
        countryCodes = data;
    });
    socket.on('getCountryData', data => {
        if (data) {
            const chart = _('chart');
            fadeOut(_('chartLoader'));
            chart.style.minHeight = '350px';
            chart.style.height = '70vh';
            dataHist = data;
            propArr = ['new_cases_smoothed'];
            currentProp = 'new_cases_smoothed';
            propTitle = ['Daily Cases'];
            chartArray = createChartArray(dataHist, currentProp);
            if (chartOn) { removeChartListeners(); removeGlobalChartListeners(); }
            makeChartDiv();
            addGlobalChartListeners();
            if (chartArray.length > 1) {
                makeChart();
                addChartListeners();
                chartOn = true;
            }
            else {
                chartOn = false;
            }
        }
        else {
            chartOn = false;
            const chart = _('chart');
            fadeOut(_('chartLoader'));
            chart.innerHTML = "<h2 class='chart-no-data yellow-test'>NO CHART DATA</h2>";
        }
    });
    socket.on('getLatestData', payload => {
        if (payload.latest) {
            const percObj = getLatestData(payload);
            const perc = percObj.perc;
            const percDeaths = percObj.percDeaths;
            if (perc && perc != 0) {
                addPercNew(perc);
            }
            if (percDeaths && percDeaths != 0) {
                addPercNew(percDeaths, true);
            }
        }
    });
    socket.on('getLatestWorldData', data => {
        if (data.latest) {
            //console.log(data);
            const percObj = getLatestData(data, true);
            const perc = percObj.perc;
            const percDeaths = percObj.percDeaths;
            if (switchValue === 'cases') {
                if (perc && perc != 0) {
                    addPercNewWorld(perc);
                }
            }
            else {
                if (percDeaths && percDeaths != 0) {
                    addPercNewWorld(percDeaths, true);
                }
            }
        }
    });
    socket.on('getVaccineData', data => {
        //console.log(data);
        dataVacc = data;
        getData(dataAPI);
    });
}
function parseSVG() {
    pathCountries = document.querySelectorAll('path');
    for (let i = 0; i < pathCountries.length; i++) {
        if (pathCountries[i].getAttribute('data-id')) {
            let id = pathCountries[i].getAttribute('data-id').toLowerCase();
            let countryName = pathCountries[i].getAttribute('data-name');
            dataSVG.push({ path: pathCountries[i], id: id, country: countryName });
        }
    }
}
function fetchAPI() {
    fetch('https://api.apify.com/v2/key-value-stores/SmuuI0oebnTWjRTUh/records/LATEST?disableRedirect=true')
        .then(response => {
            if (response.ok) {
                return response.json();
            }
        })
        .then(data => {
            if (data) {
                dataAPI = data.regionData;
                getData(dataAPI);
                timeStamp.innerText = `Updated at ${formatTime()} EST`;
            }
            else {
                //displayFetchError();
                socket.emit('getFetchFromServer');
            }
        });
}
function displayFetchError() {
    fadeOut(loader);
    _('overlayMsg').innerText = "Failed to fetch data";
}
//DATA MANIP
function getData(data) {
    countriesList.length = 0;//reinitialize array
    dataSVG.forEach(item => {
        const index = data.findIndex(data => data.country === item.country);
        if (index != -1) {
            data[index].alpha2 = item.id;
            const vaccIndex = dataVacc.findIndex(row => row.country === item.id);
            data[index].totalVaccinations = (vaccIndex != -1) ? dataVacc[vaccIndex].totalVaccinations : 0;
            data[index].peopleVaccinated = (vaccIndex != -1) ? dataVacc[vaccIndex].peopleVaccinated : 0;
            data[index].peopleFullyVaccinated = (vaccIndex != -1) ? dataVacc[vaccIndex].peopleFullyVaccinated : 0;
            data[index].vaccines = (vaccIndex != -1) ? dataVacc[vaccIndex].vaccines : 'Not Reported';
            countriesList.push(data[index]);
        }
    });
    calcData(countriesList);
    buttonsHandler(prop);
    worldData(dataAPI);
}
function calcData(data) {
    const propList = ["totalDeaths", "totalRecovered", "activeCases"];
    var percVar = [];
    data.forEach(item => {
        propList.forEach((value, index) => {
            percVar[index] = (item[value] != null) ? roundVal((item[value] / item.totalCases) * 100, 1) : null;
        });
        const newCases = (item.newCases / item.population) * 100;
        const newDeaths = (item.newDeaths / item.population) * 100;
        const percVacc = (item.peopleVaccinated / item.population) * 100;
        const percFullyVacc = (item.peopleFullyVaccinated / item.population) * 100;
        item.newCasesPerMil = roundVal(newCases * 10000, 2);
        item.newDeathsPerMil = roundVal(newDeaths * 10000, 2);
        item.percDeaths = percVar[0];
        item.percRecovered = percVar[1];
        item.percActive = percVar[2];
        item.percCritical = (item.activeCases != null && item.activeCases != 0) ? roundVal((item.seriousCritical / item.activeCases) * 100, 1) : 0;
        item.percVacc = roundVal(percVacc, 2);
        item.percFullyVacc = roundVal(percFullyVacc, 2);
    });
}
function totalOfProp(property) {
    let count = 0;
    countriesList.forEach(country => {
        count = count + country[property];
    });
    return count;
}
function worldData(data) {
    const world = data.find(data => data.country === "World");
    const totalTests = totalOfProp('totalTests');
    const totalPop = totalOfProp('population');
    const totalPplVacc = totalOfProp('peopleVaccinated');
    const totalPplFlVacc = totalOfProp('peopleFullyVaccinated');
    const totalVacc = totalOfProp('totalVaccinations');
    world.totalTests = totalTests;
    world.totalPop = totalPop;
    world.totalPplVacc = totalPplVacc;
    world.totalPplFlVacc = totalPplFlVacc;
    world.totalVacc = totalVacc;
    const percRecovered = roundVal((world.totalRecovered / world.totalCases) * 100, 1);
    const percActive = roundVal((world.activeCases / world.totalCases) * 100, 1);
    const percDeaths = roundVal((world.totalDeaths / world.totalCases) * 100, 1);
    const percCritical = roundVal((world.seriousCritical / world.activeCases) * 100, 1);
    const percPplVacc = roundVal((world.totalPplVacc / world.totalPop) * 100, 1);
    const percPplFlVacc = roundVal((world.totalPplFlVacc / world.totalPop) * 100, 1);
    let worldStats = _('worldStats');
    const alpha2 = 'OWID_WRL';
    if (switchValue === "cases") {
        worldStats.innerHTML = `
            <h2 class='global-cases-title'>Global Stats</h2>
            <p class='stats white'>${world.totalCases.commaSplit()}</p>
            <p class='stats-titles gray'>Confirmed Cases</p>
            <p class='stats white'>${world.casesPerMil.commaSplit()}</p>
            <p class='stats-titles gray'>Cases/Million</p>
            <div class='worldStats-flex'>
                <div>
                    <p class='stats white'>${world.newCases.commaSplit()}</p>
                    <p class='stats-titles gray'>New Cases</p>
                </div>
                <div class='flex-stat' style='width:60px; height:70px;margin:0;' title='Percent Daily Change'></div>
            </div>
            <div class='worldStats-flex'>
                <div>
                    <p class='stats white'>${world.totalRecovered.commaSplit()}</p>
                    <p class='stats-titles gray'>Total Recovered</p>
                </div>
                ${getPiePerc(percRecovered, 'totalRecovered', true)}
            </div>
            <div class='worldStats-flex'>
                <div>
                    <p class='stats white'>${world.activeCases.commaSplit()}</p>
                    <p class='stats-titles gray'>Active Cases</p>
                </div>
                ${getPiePerc(percActive, 'activeCases', true)}
            </div>
            <div class='worldStats-flex'>
                <div>
                    <p class='stats white'>${world.seriousCritical.commaSplit()}</p>
                    <p class='stats-titles gray'>Critical Cases</p>
                </div>
                ${getPiePerc(percCritical, 'seriousCritical', true)}
            </div>`;
        socket.emit('getLatestWorldData', alpha2);
    }
    else if (switchValue === 'tests') {
        worldStats.innerHTML = `
            <h2 class='global-tests-title'>Global Stats</h2>
            <p class='stats white'>${world.totalTests.commaSplit()}</p>
            <p class='stats-titles gray'>Total Tests</p>
            <p class='stats white'>${world.totalPop.commaSplit()}</p>
            <p class='stats-titles gray'>Population</p>`;
    }
    else if (switchValue === 'vaccines') {
        worldStats.innerHTML = `
            <h2 class='global-vacc-title'>Global Stats</h2>
            <div class='worldStats-flex'>
                <div>
                    <p class='stats white'>${world.totalPplVacc.commaSplit()}</p>
                    <p class='stats-titles gray'>People Vaccinated</p>
                </div>
                ${getPiePerc(percPplVacc, 'percVacc', true)}
            </div>
            <div class='worldStats-flex'>
                <div>
                    <p class='stats white'>${world.totalPplFlVacc.commaSplit()}</p>
                    <p class='stats-titles gray'>People Fully Vaccinated</p>
                </div>
                ${getPiePerc(percPplFlVacc, 'percFullyVacc', true)}
            </div>
            <p class='stats white'>${world.totalVacc.commaSplit()}</p>
            <p class='stats-titles gray'>Total Vaccinations</p>`;
    }
    else {
        worldStats.innerHTML = `
            <h2 class='global-deaths-title'>Global Stats</h2>
            <div class='worldStats-flex'>
                <div>
                    <p class='stats white'>${world.totalDeaths.commaSplit()}</p>
                    <p class='stats-titles gray'>Total Deaths</p>
                </div>
                ${getPiePerc(percDeaths, 'totalDeaths', true)}
            </div>
            <div class='worldStats-flex'>
                <div>
                    <p class='stats white'>${world.newDeaths.commaSplit()}</p>
                    <p class='stats-titles gray'>New Deaths</p>
                </div>
                <div class='flex-stat' style='width:60px; height:70px;margin:0;' title='Percent Daily Change'></div>
            </div>
            <p class='stats white'>${world.deathsPerMil.commaSplit()}</p>
            <p class='stats-titles gray'>Deaths/Million</p>`;
        socket.emit('getLatestWorldData', alpha2);
    }
}
function buttonsHandler(property) {
    const btnsQuery = toggleSwitchCases(switchValue).btns;
    const btns = document.querySelectorAll(btnsQuery);
    const catColor = toggleSwitchCases(switchValue).color;
    for (let i = 0; i < btns.length; i++) {
        if (btns[i].dataset.prop === property) {
            btns[i].style.backgroundColor = catColor;
            btns[i].style.color = '#000';
        }
        else {
            btns[i].style.backgroundColor = bckColorLDM;
            btns[i].style.color = colorLDM;
        }
    }
    currentData.innerText = dropDownTitle.innerText = currentTitle;
    keyTitle.innerText = rawTotalSwitch(property).title;
    getMinMax(countriesList, property);
}
function getMinMax(data, property) {
    const list = mapData(data, property);
    var max = (property != 'casesPerMil') ? Math.max.apply(null, list) : list[1];//andorra is highest cases/mil
    var min = (Math.min.apply(null, list.filter(Boolean)) > 1) ? 1 : Math.min.apply(null, list.filter(Boolean));
    const minDecimal = min.countDecimals();
    min = (min < 1) ? 1 / Math.pow(10, minDecimal) : min;
    globalRangeList = (property === 'percRecovered' || property === 'percActive' || property === 'percCritical' || property === 'percVacc' || property === 'percFullyVacc') ? getPercRangeList(max, min) : globalRangeList = getRangeList(max, min);
    makeLegend(globalRangeList);
    matchData(countriesList, property, globalRangeList);
    showSortedList(countriesList);
}
function mapData(data, property) {
    const list = data.map(item => {
        item[property] = (item[property] < 0) ? 0 : item[property];
        return item[property];
    });
    return list.sort((a, b) => (a < b) ? 1 : -1);//sort by descending;
}
function getPercRangeList(max, min) {
    const rangeList = [];
    const factor = (min < 1) ? 5 : 6;
    max = (Math.floor(max / factor) >= 1) ? Math.floor(max / factor) : 1;
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
    rangeList.reverse();//for legend colors, light to dark
    return rangeList;
}
function changeLegendColors(cat) {
    const colors = legendColors.querySelectorAll('.color');
    const color = toggleSwitchCases(cat).colors.reverse();
    for (let i = 0; i < colors.length - 1; i++) {
        colors[i].style.backgroundColor = color[i];
    }
}
function makeLegend(rangeList) {
    const rangeElems = keys.querySelectorAll('.data-range');
    const colorElems = legendColors.querySelectorAll('.color');
    for (let i = 0; i < rangeElems.length; i++) {
        rangeElems[i].classList.add('no-display');
    }
    for (let i = 0; i < colorElems.length; i++) {
        colorElems[i].classList.add('no-display');
        colorElems[i].style.borderTopRightRadius = '0px';
        colorElems[i].style.borderTopLeftRadius = '0px';
        colorElems[i].style.borderBottomRightRadius = '0px';
    }
    for (let i = 1; i < 3; i++) {
        rangeElems[rangeElems.length - i].classList.remove('no-display');
        colorElems[colorElems.length - i].classList.remove('no-display');
    }
    onLegendResize(rangeList);
}
function onLegendResize(rangeList) {
    const rangeElems = keys.querySelectorAll('.data-range');
    const colorElems = legendColors.querySelectorAll('.color');
    rangeElems[rangeElems.length - 1].innerText = (window.innerWidth <= 768) ? 'No Data' : 'No Reported Data';
    if (rangeList.length === 0) {
        colorElems[colorElems.length - 2].style.borderTopRightRadius = '3px';
        if (window.innerWidth <= 768) {
            colorElems[colorElems.length - 2].style.borderBottomRightRadius = '3px';
        }
        else {
            colorElems[colorElems.length - 2].style.borderTopLeftRadius = '3px';
        }
    }
    for (let count = 0; count < rangeList.length; count++) {
        const index = rangeElems.length - (3 + count);
        const decCount = rangeList[count].countDecimals();
        const rangeMin = (rangeList[count] <= 1) ? 0 : (prop === 'percRecovered' || prop === 'percActive' || prop === 'percCritical' || prop === 'percDeaths' || prop === 'percVacc' || prop === 'percFullyVacc') ? 0.1 : 1;
        const rangeMax = (rangeList[count] < 1 && rangeList[count + 1] === 1) ? 1 / Math.pow(10, decCount) : 0;
        rangeElems[index].classList.remove('no-display');
        colorElems[index].classList.remove('no-display');
        if (count == rangeList.length - 1) {
            colorElems[index].style.borderTopRightRadius = '3px';
            rangeElems[index].firstElementChild.innerText = `> ${rangeList[count].commaSplit()}`;
            if (window.innerWidth <= 768) {
                colorElems[index].style.borderBottomRightRadius = '3px';
            }
            else {
                colorElems[index].style.borderTopLeftRadius = '3px';
            }
        }
        else {
            rangeElems[index].firstElementChild.innerText = (window.innerWidth <= 768) ? `${(rangeList[count]).commaSplit()}` : `${(rangeList[count] + rangeMin).commaSplit()} – ${(rangeList[count + 1] - rangeMax).commaSplit()}`;
        }
    }
    const width = colorElems[colorElems.length - 2].getBoundingClientRect().width;
    const x = (window.innerWidth <= 768) ? -((width / 2) + .5) + 'px' : 0 + 'px';
    for (let i = 0; i < rangeElems.length; i++) {
        rangeElems[i].style.width = (window.innerWidth <= 768) ? `${width}px` : 'auto';
        if (i != rangeElems.length - 1) {
            rangeElems[i].style.setProperty('--trans', x);
        }
    }
}
function matchData(data, property, range) {
    for (let i = 0; i < pathCountries.length; i++) {
        if (pathCountries[i].getAttribute('data-name')) {//avoid including centerBtn SVG in loop
            let countryData = pathCountries[i].getAttribute('data-name');
            const index = data.findIndex(data => data.country === countryData);
            if (index != -1) {
                const value = data[index][property];
                if (value >= 0 && value != null) {
                    pathCountries[i].style.fill = (switchValue === 'deaths') ? val2color(value, range, true) : val2color(value, range);
                }
                else {
                    pathCountries[i].style.fill = '#9c9c9c';//no data
                }
            }
            else {
                pathCountries[i].style.fill = '#9c9c9c';//no data
            }
        }
    }
}
function val2color(value, range, deaths) {
    const colors = toggleSwitchCases(switchValue).colors;
    let color = '';
    for (let count = 0; count < range.length - 1; count++) {
        if (value === 0) {
            color = colors[0];
        }
        if (count === 0) {
            if (value >= (range[count]) && value <= (range[count + 1])) {
                color = colors[count + 1];
            }
        }
        else {
            if (value > (range[count]) && value <= (range[count + 1])) {
                color = colors[count + 1];
            }
            else if (value > (range[range.length - 1])) {
                color = colors[count + 2];
            }
        }
    }
    return color;
}
function sortList(data, property) {
    if (!property) {
        property = prop;
    }
    var sortedList = [];
    data.forEach(item => {
        if (item[property] != null) {
            item[property] = (item[property] < 0) ? 0 : item[property];
            sortedList.push(item);
        }
    });
    sortedList.sort((a, b) => (a[property] < b[property]) ? 1 : -1);//sort by property
    let perc = 0;
    let count = 0;
    sortedList.forEach((value, index) => {
        if (index > 0) {
            if (sortedList[index][property] === sortedList[index - 1][property]) {
                count = count;
            }
            else {
                count++;
            }
        }
        else {
            count++
        }
        if (property != "casesPerMil" && property != "testsPerMil" && property != "deathsPerMil" && property != "population" && property != "percDeaths") {
            perc = (value[property] / value.population) * 100;
            if (perc >= 0.1) {
                value.perc = roundVal(perc, 2);;
                value.perMill = null;
            }
            else {
                value.perMill = roundVal(perc * 10000, 2);
                value.perc = null;
            }
        }
        else {
            value.perc = null;
            value.perMill = null;
        }
        value.rank = count;
        if (index === sortedList.length - 1) {
            value.rankMax = count;
        }
    });
    return sortedList;
}
function showSortedList(data) {
    const color = toggleSwitchCases(switchValue).color;
    const worldList = _('worldList');
    let html = "";
    sortList(data).forEach(item => {
        let flagId = dataSVG.find(dataSVG => dataSVG.country === item.country);
        html += `
            <div class='stats-flex' data-country='${item.country}'>
                <p class='inline-count'>${item.rank}</p>
                <div class='bckg-img inline-flag' style='background-image:url(https://flagcdn.com/60x45/${flagId.id}.png);'></div>
                <p class='inline-p'>${item.country}</p>
                <p class='inline-stat'>${item[prop].commaSplit()}</p>
            </div> `;
    });
    const title = rawTotalSwitch(prop).title;
    worldList.innerHTML = `
        <h2 id='rankTitle' class='global-cases-title' style='color:${color};'>Global Ranks</h2>
        <p class='ranks-title gray'>${title}</p>
        ${html}`;
}
//EVENT LISTENERS
worldList.addEventListener('mouseup', function (e) {
    if (e.target.parentNode.className === 'stats-flex') {
        let country = e.target.parentNode.dataset.country;
        clearPage();
        clearHighlights();
        const path = dataSVG.find(path => path.path.getAttribute('data-name') === country);
        zoomToCountryNoAnim(path.path);
    }
});
//POPUP
function addPopupListeners(country) {
    countryAnim = false;
    for (let i = 0; i < pathCountries.length; i++) {
        if (pathCountries[i].getAttribute('data-name')) {//avoid including centerBtn SVG in loop
            if (country) {
                if (pathCountries[i].getAttribute('data-name') === country) {
                    pathCountries[i].classList.remove('light-path');
                }
                else {
                    pathCountries[i].classList.remove('dark-path');
                }
            }
            if (!is_touch_device) {
                pathCountries[i].addEventListener('mouseover', pathHover, false);
            }
        }
    }
    if (!is_touch_device) {
        document.addEventListener('mousemove', pathMove, false);
    }
}
function removePopupListeners() {
    countryAnim = true;
    for (let i = 0; i < pathCountries.length; i++) {
        if (pathCountries[i].getAttribute('data-name')) {//avoid including centerBtn SVG in loop
            if (!is_touch_device) {
                pathCountries[i].removeEventListener('mouseover', pathHover);
            }
        }
    }
    if (!is_touch_device) {
        document.removeEventListener('mousemove', pathMove);
    }
    popup.style.display = "none";
}
function onPathClick(e) {
    if (!mouseMove) {
        cancelAnimationFrame(fadeZoom);
        let country = this.getAttribute('data-name');
        if (countriesList.find(data => data.country === country)) {
            goToCountry(this);
        }
    }
}
function pathHover(e) {
    this.addEventListener('mouseup', onPathClick, false);
    this.addEventListener('mouseout', pathNoHover, false);
    if (countriesList.length != 0 && prop != "") {
        let country = this.getAttribute('data-name');
        getPopupInfo(country);
    }
}
function rawTotalSwitch(property) {
    let totalProp, title, colorClass;
    switch (property) {
        case 'casesPerMil':
            totalProp = 'totalCases';
            title = 'Cases/Million';
            colorClass = '';//for countryPopup prop-title
            break;
        case 'newCasesPerMil':
            totalProp = 'newCases';
            title = 'New Cases/Million';
            colorClass = '';
            break;
        case 'percRecovered':
            totalProp = 'totalRecovered';
            title = '% Recovered';
            colorClass = '';
            break;
        case 'percActive':
            totalProp = 'activeCases';
            title = '% Active';
            colorClass = '';
            break;
        case 'percCritical':
            totalProp = 'seriousCritical';
            title = '% Critical';
            colorClass = '';
            break;
        case 'deathsPerMil':
            totalProp = 'totalDeaths';
            title = 'Deaths/Million';
            colorClass = '';
            break;
        case 'newDeathsPerMil':
            totalProp = 'newDeaths';
            title = 'New Deaths/Million';
            colorClass = 'red';
            break;
        case 'percDeaths':
            totalProp = 'totalDeaths';
            title = 'Case Fatality Rate';
            colorClass = 'red';
            break;
        case 'testsPerMil':
            totalProp = 'totalTests';
            title = 'Tests/Million';
            colorClass = 'yellow-test';
            break;
        case 'totalTests':
            totalProp = 'totalTests';
            title = 'Total Tests';
            colorClass = '';
            break;
        case 'population':
            totalProp = 'population';
            title = 'population';
            colorClass = '';
            break;
        case 'totalVaccinations':
            totalProp = 'totalVaccinations';
            title = 'Total Vaccinations';
            colorClass = 'green';
            break;
        case 'percVacc':
            totalProp = 'peopleVaccinated';
            title = '% Vaccinated';
            colorClass = 'green';
            break;
        case 'percFullyVacc':
            totalProp = 'peopleFullyVaccinated';
            title = '% Fully Vaccinated';
            colorClass = 'green';
    }
    return { totalProp: totalProp, title: title, colorClass: colorClass };
}
function getPopupInfo(country) {
    let statText = "";
    let rankText = "";
    let rawTotalText = "";
    const flagId = dataSVG.find(data => data.country === country);
    const flagUrl = (flagId.id === 'ic') ? `images/ic.png` : `https://flagcdn.com/h40/${flagId.id}.png`;
    const record = sortList(countriesList).find(data => data.country === country);
    if (record) {
        const rank = record.rank;
        //const list = sortList(countriesList);
        //const rankMax = list[list.length - 1].rankMax;
        const stat = record[prop].commaSplit();
        const totalProp = rawTotalSwitch(prop).totalProp;
        const title = rawTotalSwitch(prop).title;
        const rawTotal = record[totalProp].commaSplit();
        statText = `<p class='popup-big white'><strong>${stat}</strong></p><p class='popup-small gray'>${title}</p><br>`;
        rankText = `<p class='popup-big white'><strong>${rank}</strong></p><p class='popup-small gray'>Rank</p><br>`;
        rawTotalText = (prop === 'testsPerMil' || prop === 'totalTests' || prop === 'population' || prop === 'totalVaccinations') ? '' : `<p class='popup-big white'><strong>${rawTotal}</strong></p><p class='popup-small gray'>Raw Total</p>`;
    }
    else {
        statText = "<p class='popup-small yellow'>No Reported Data</p><br>";
    }
    popup.innerHTML = `
        <div class='flag bckg-img' style='background-image:url(${flagUrl});'></div>
        <p class='popup country white'>${country}</p><br>
        ${statText}
        ${rankText}
        ${rawTotalText}`;
}
function pathMove(e) {
    if (mouseMove) {
        popup.style.display = "none";
        return;
    }
    var eventDoc, doc, body;
    e = e || window.e; // IE-ism
    if (is_touch_device) {
        e.pageX = e.center.x;
        e.pageY = e.center.y;
    }
    else {
        if (e.pageX == null && e.clientX != null) {
            eventDoc = (e.target && e.target.ownerDocument) || document;
            doc = eventDoc.documentElement;
            body = eventDoc.body;

            e.pageX = e.clientX +
                (doc && doc.scrollLeft || body && body.scrollLeft || 0) -
                (doc && doc.clientLeft || body && body.clientLeft || 0);
            e.pageY = e.clientY +
                (doc && doc.scrollTop || body && body.scrollTop || 0) -
                (doc && doc.clientTop || body && body.clientTop || 0);
        }
    }
    if (e.target.parentNode === zoomEl || e.target === popup) {
        popup.style.display = "block";
        const xLimit = e.pageX + popup.offsetWidth + 10;
        const yLimit = e.pageY + popup.offsetHeight;
        const x = (xLimit > window.innerWidth) ? `${Math.max(e.pageX - popup.offsetWidth - 5, 0)}px` : `${e.pageX + 5}px`;
        const y = (yLimit > window.innerHeight) ? `${Math.max(e.pageY - popup.offsetHeight - 5, 0)}px` : `${e.pageY + 5}px`;
        popup.style.msTransform = `translate(${x}, ${y})`;
        popup.style.webkitTransform = `translate(${x}, ${y})`;
        popup.style.MozTransform = `translate(${x}, ${y})`;
        popup.style.OTransform = `translate(${x}, ${y})`;
        popup.style.transform = `translate(${x}, ${y})`;
    }
    else {
        popup.style.display = "none";
    }
}
function pathNoHover(e) {
    this.removeEventListener('mouseup', onPathClick);
    this.removeEventListener('mouseout', pathNoHover);
}
//COUNTRY POPUP
function resultsTransform() {
    resultsWrapper.style.width = `${getOffsets(searchWrapper).width}px`;
    resultsWrapper.style.msTransform = `translateX(${getOffsets(searchWrapper).left}px)`;
    resultsWrapper.style.webkitTransform = `translateX(${getOffsets(searchWrapper).left}px)`;
    resultsWrapper.style.MozTransform = `translateX(${getOffsets(searchWrapper).left}px)`;
    resultsWrapper.style.OTransform = `translateX(${getOffsets(searchWrapper).left}px)`;
    resultsWrapper.style.transform = `translateX(${getOffsets(searchWrapper).left}px)`;
}
function showCountryPopup(country, alpha2) {
    countryPopup.scrollTo(0, 0);
    countryPopup.classList.remove('transform');
    closePopup.style.marginLeft = "-5px";
    closePopup.setAttribute('data-country', country);
    setTimeout(() => {
        resultsTransform();
    }, 300);
    const propList = ["newCasesPerMil", "newDeathsPerMil", "percDeaths", "percRecovered", "percActive", "percCritical", "testsPerMil", "percVacc", "percFullyVacc", "totalVaccinations"];
    const propTitles = ["Daily New Cases", "Daily New Deaths", "Case Fatality Rate", "Recovered", "Active", "Critical", "Tests", "Vaccinated", "Fully Vaccinated", "Vaccinations"];
    const flagId = dataSVG.find(dataSVG => dataSVG.country === country);
    const wrapperProplist = ['casesPerMil', 'deathsPerMil', 'population'];
    let record, rank = [];
    wrapperProplist.forEach(p => {
        const list = sortList(countriesList, p);
        record = list.find(data => data.country === country);
        rank.push(record.rank);
        //rankMax.push(list[list.length - 1].rankMax);
    });
    var html = "";
    propList.forEach((item, index) => {
        const title = rawTotalSwitch(item).title;
        const totalProp = rawTotalSwitch(item).totalProp;
        const colorClass = rawTotalSwitch(item).colorClass;
        const flexClass = (item === 'totalVaccinations') ? 'stats-column-flex-100' : '';
        html += `
            <div class='stats-column-flex ${flexClass}'>
                <p class='prop-title ${colorClass}'>${propTitles[index]}</p>
                ${getRecord(record.country, item, title, totalProp)}
            </div>`;
    });
    countryPopup.innerHTML = `
            <div id='countryWrapper'>
                <div class='country-container'>
                    <div class='flag-big bckg-img' style='background-image:url(https://flagcdn.com/h240/${flagId.id}.png);'></div>
                    <p class='country-big'>${record.country}</p>
                    <p class='stats'>${record.population.commaSplit()}</p>
                    <p class='stats-titles dark-gray'>Population</p>
                </div>
                <div class='stats-column'>
                    <p class='prop-title blue'>Cases</p>
                    <p class='stats blue'>${record.casesPerMil.commaSplit()}</p>
                    <p class='stats-titles white'>Cases/Million</p>
                    <p class='stats blue'>${rank[0]}</p>
                    <p class='stats-titles white'>Rank</p>
                    <p class='stats dark-gray'>${record.totalCases.commaSplit()}</p>
                    <p class='stats-titles dark-gray'>Raw Total</p>
                </div>
                <div class='stats-column'>
                    <p class='prop-title red'>Deaths</p>
                    <p class='stats red'>${record.deathsPerMil.commaSplit()}</p>
                    <p class='stats-titles white'>Deaths/Million</p>
                    <p class='stats red'>${rank[1]}</p>
                    <p class='stats-titles white'>Rank</p>
                    <p class='stats dark-gray'>${record.totalDeaths.commaSplit()}</p>
                    <p class='stats-titles dark-gray'>Raw Total</p>
                </div>
            </div>
            <div class='flex-stats-container'>
                ${html}
                <div id="chart"><svg id='chartLoader' xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0" width="64px" height="64px" viewBox="0 0 128 128" xml:space="preserve"><g><path d="M122.5 69.25H96.47a33.1 33.1 0 0 0 0-10.5h26.05a5.25 5.25 0 0 1 0 10.5z" fill="#000000" fill-opacity="1"/><path d="M112.04 97.83L89.47 84.8a33.1 33.1 0 0 0 5.25-9.1l22.57 13.03a5.25 5.25 0 0 1-5.28 9.1z" fill="#b2b2b2" fill-opacity="0.3"/><path d="M88.68 117.35L75.65 94.78a33.1 33.1 0 0 0 9.1-5.25l13.02 22.57a5.25 5.25 0 1 1-9.1 5.25z" fill="#b2b2b2" fill-opacity="0.3"/><path d="M58.7 122.57V96.5a33.1 33.1 0 0 0 10.5 0v26.07a5.25 5.25 0 0 1-10.5 0z" fill="#b2b2b2" fill-opacity="0.3"/><path d="M30.1 112.1l13.04-22.57a33.1 33.1 0 0 0 9.1 5.25L39.2 117.35a5.25 5.25 0 1 1-9.1-5.25z" fill="#b2b2b2" fill-opacity="0.3"/><path d="M10.6 88.74L33.16 75.7a33.1 33.1 0 0 0 5.25 9.1L15.88 97.83a5.25 5.25 0 1 1-5.25-9.1z" fill="#b2b2b2" fill-opacity="0.3"/><path d="M5.37 58.75h26.06a33.1 33.1 0 0 0 0 10.5H5.37a5.25 5.25 0 0 1 0-10.5z" fill="#999999" fill-opacity="0.4"/><path d="M15.85 30.17L38.4 43.2a33.1 33.1 0 0 0-5.24 9.1L10.6 39.25a5.25 5.25 0 1 1 5.25-9.1z" fill="#7f7f7f" fill-opacity="0.5"/><path d="M39.2 10.65l13.03 22.57a33.1 33.1 0 0 0-9.1 5.25l-13-22.57a5.25 5.25 0 1 1 9.1-5.25z" fill="#666666" fill-opacity="0.6"/><path d="M69.2 5.43V31.5a33.1 33.1 0 0 0-10.5 0V5.42a5.25 5.25 0 1 1 10.5 0z" fill="#4c4c4c" fill-opacity="0.7"/><path d="M97.77 15.9L84.75 38.47a33.1 33.1 0 0 0-9.1-5.25l13.03-22.57a5.25 5.25 0 1 1 9.1 5.25z" fill="#333333" fill-opacity="0.8"/><path d="M117.3 39.26L94.7 52.3a33.1 33.1 0 0 0-5.25-9.1l22.57-13.03a5.25 5.25 0 0 1 5.25 9.1z" fill="#191919" fill-opacity="0.9"/><animateTransform attributeName="transform" type="rotate" values="0 64 64;30 64 64;60 64 64;90 64 64;120 64 64;150 64 64;180 64 64;210 64 64;240 64 64;270 64 64;300 64 64;330 64 64" calcMode="discrete" dur="1080ms" repeatCount="indefinite"></animateTransform></g></svg></div>
            </div>`;
    //CHART
    const payload = { alpha2: alpha2, country: country };
    fadeIn(_('chartLoader'));
    socket.emit('getCountryData', alpha2);
    socket.emit('getLatestData', payload);
    setTimeout(() => { addHeader(); }, 300);
    countryPopup.addEventListener('scroll', onCountryPopupScroll, false);
}
function onCountryPopupScroll() {
    if (window.innerWidth <= 768) {
        addHeader();
    }
}
function getLatestData(payload, world) {
    console.log(payload);
    let perc, percDeaths;
    const record = (world) ? dataAPI.find(data => data.country === "World") : sortList(countriesList, 'newCases').find(data => data.country === payload.country);
    let date = (payload.latest.data1.new_cases != record.newCases && payload.latest.data1.new_cases != 0) ? 'data1' : (payload.latest.data2 && payload.latest.data2.new_cases != record.newCases && payload.latest.data2.new_cases != 0) ? 'data2' : false;
    if (date) {
        const factor1 = (payload.latest[date].new_cases > 0) ? payload.latest[date].new_cases : 1;
        perc = ((record.newCases - (payload.latest[date].new_cases || 0)) / factor1) * 100;
        perc = roundVal(perc, 2);
    }
    else { perc = false; }
    date = (payload.latest.data1.new_deaths != record.newDeaths && payload.latest.data1.new_deaths != 0) ? 'data1' : (payload.latest.data2 && payload.latest.data2.new_deaths != record.newDeaths && payload.latest.data2.new_deaths != 0) ? 'data2' : false;
    if (date) {
        const factor2 = (payload.latest[date].new_deaths > 0) ? payload.latest[date].new_deaths : 1;
        percDeaths = ((record.newDeaths - (payload.latest[date].new_deaths || 0)) / factor2) * 100;
        percDeaths = roundVal(percDeaths, 2);
    }
    else { percDeaths = false; }
    return { perc: perc, percDeaths: percDeaths };
}
function addPercNew(perc, deaths) {
    const childNum = (deaths) ? 2 : 1;
    const cases = countryPopup.querySelector(`.flex-stats-container .stats-column-flex:nth-child(${childNum})`);
    const div = document.createElement('div');
    div.setAttribute('class', 'flex-stat');
    div.setAttribute('style', 'opacity:0;');
    const color = (Math.sign(perc) === 1) ? (mode === 'dark') ? '#f6584C' : '#B13507' : (mode === 'dark') ? '#6dff71' : '#209222';
    const arrow = (Math.sign(perc) === -1) ? '▼' : '▲';
    const plus = (Math.sign(perc) === 1) ? '+' : '';
    let html = `
        <p class='stats' style='color: ${color};font-size:1em;'>${arrow}</p>
        <p class='stats-titles' style='color: ${color};'>${plus + perc}%</p>`;
    div.innerHTML = html;
    cases.appendChild(div);
    fadeIn(div, true);
}
function addPercNewWorld(perc, deaths) {
    const childNum = (deaths) ? 1 : 0;
    const wrapper = worldStats.querySelectorAll(`.worldStats-flex`)[childNum];
    const div = wrapper.querySelector('.flex-stat');
    div.style.opacity = 0;
    const color = (Math.sign(perc) === 1) ? '#f6584C' : '#6dff71';
    const arrow = (Math.sign(perc) === -1) ? '▼' : '▲';
    const plus = (Math.sign(perc) === 1) ? '+' : '';
    let html = `
        <p class='stats' style='color: ${color}; font-size:1em;'>${arrow}</p>
        <p class='stats-titles' style='color: ${color};'>${plus + perc}%</p>`;
    div.innerHTML = html;
    fadeIn(div, true);
}
function getPiePerc(perc, property, world) {
    const radius = (world) ? 25 : 30;
    const factor = (world) ? 118 : 141;
    const circumference = (world) ? 157 : 188;
    const strokeValue = (perc / 100) * factor;
    const strokeWidth = (world) ? 2 : 5;
    const style = (world) ? 'width:60px; height:70px; margin-top:0;' : '';
    const color1 = (property === 'totalRecovered' || property === 'percRecovered' || property === 'percVacc' || property === 'percFullyVacc') ? (mode === 'dark' || world) ? '#f6584C' : '#B13507' : (mode === 'dark' || world) ? '#6dff71' : '#209222';
    const color2 = (color1 === '#f6584C' || color1 === '#B13507') ? (mode === 'dark' || world) ? '#6dff71' : '#209222' : (mode === 'dark' || world) ? '#f6584C' : '#B13507';
    const info = (property === 'percCritical' || property === 'seriousCritical') ? '% of Active' : (property === 'percVacc' || property === 'percFullyVacc') ? '% of Pop' : '% of Cases';
    const infoDisplay = (world) ? 'none' : 'block';
    let html = `
    <div class="pie-wrapper" style='${style}' title='${(world) ? info : ''}'>
        <svg class="circle">
            <circle r="${radius}" cx="50%" cy="50%" stroke="${color1}" fill="none" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-dasharray="${factor}, ${circumference}" stroke-opacity="0.2"></circle>
            <circle r="${radius}" cx="50%" cy="50%" stroke="${color2}" fill="none" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-dasharray="${strokeValue}, 188"></circle>
        </svg>
        <div class="circle-info circle-perc" style="color:${color2};">${perc}</div>
        <div class="circle-info" style="color:${color2}; display:${infoDisplay};">${info}</div>
    </div>`;
    return html;
}
function getRecord(country, property, propTitle, totalProp) {
    const list = sortList(countriesList, property);
    const record = list.find(data => data.country === country);
    //const rankMax = list[list.length - 1].rankMax;
    let html = "";
    let rankText = "";
    let totalText = "";
    let pie = "";
    if (record) {
        rankText = `
            <p class='stats'>${record.rank}</p>
            <p class='stats-titles dark-gray'>Rank</p>`;
        if (property != 'totalVaccinations') {
            totalText = `
            <div class='flex-stat'>
                <p class='stats'>${record[totalProp].commaSplit()}</p>
                <p class='stats-titles dark-gray text-center'>Raw Total</p>
            </div> `;
        }
        else {
            totalText = `
            <div class='flex-stat'>
                <p class='stats text-center font-vw'>${record.vaccines}</p>
                <p class='stats-titles dark-gray text-center'>Vaccines</p>
            </div> `;
        }
        let perc;
        switch (property) {
            case 'percDeaths':
                perc = countriesList.find(data => data.country === country).percDeaths;
                break;
            case 'percRecovered':
                perc = countriesList.find(data => data.country === country).percRecovered;
                break;
            case 'percActive':
                perc = countriesList.find(data => data.country === country).percActive;
                break;
            case 'percCritical':
                perc = countriesList.find(data => data.country === country).percCritical;
                break;
            case 'percVacc':
                perc = countriesList.find(data => data.country === country).percVacc;
                break;
            case 'percFullyVacc':
                perc = countriesList.find(data => data.country === country).percFullyVacc;
        }
        pie = (perc >= 0 && perc != null) ? getPiePerc(perc, property) :
            `<div class='flex-stat'>
                <p class='stats'>${record[property].commaSplit()}</p>
                <p class='stats-titles dark-gray'>${propTitle}</p>
            </div>`;
        html = `
            ${pie} 
            <div class='flex-stat'>
                ${rankText}
            </div>
            ${totalText}       
        `;
        return html;
    }
    else {
        html = `<p class='stats yellow-test text-center'>No Reported Data</p>`;
        return html;
    }
}
function onClosePopup(e) {
    onCloseSearch();
    clearPopup();
    setPrevMapState();
    showPage();
    addPopupListeners(this.dataset.country);
    addZoomTapListeners();
    if (chartOn) { removeChartListeners(); removeGlobalChartListeners(); chartOn = false; }
}
//GLOBAL LISTENERS
function addZoomTapListeners() {
    if (!is_touch_device) {
        svgEl.addEventListener('mousedown', onMouseDown, false);
        svgEl.addEventListener('dblclick', tapZoomHandler, false);
        svgEl.addEventListener('onwheel' in document ? 'wheel' : 'onmousewheel' in document ? 'mousewheel' : 'DOMMouseScroll', zoomHandler, false);
    }
    if (is_touch_device) {
        taptime.on('tap', onDocTap);
        hammertime.on('pinch', onPinchZoom);
        hammertime.on('tap', onTapZoom);
        presstime.on('tap', onTapPopup);
        hammertime.on('press', onPress);
        hammertime.on('pan', onPan);
        hammertime.on('panend', onPanEnd);
        currentData.addEventListener('touchend', addRemoveHeader, false);
    }
    addLegendListeners();
    centerBtn.addEventListener('click', centerMap, false);
}
function removeZoomTapListeners() {
    if (!is_touch_device) {
        svgEl.removeEventListener('mousedown', onMouseDown);
        svgEl.removeEventListener('dblclick', tapZoomHandler);
        svgEl.removeEventListener('onwheel' in document ? 'wheel' : 'onmousewheel' in document ? 'mousewheel' : 'DOMMouseScroll', zoomHandler);
    }
    if (is_touch_device) {
        taptime.off('tap', onDocTap);
        hammertime.off('pinch', onPinchZoom);
        hammertime.off('tap', onTapZoom);
        presstime.off('tap', onTapPopup);
        hammertime.off('press', onPress);
        hammertime.off('pan', onPan);
        hammertime.off('panend', onPanEnd);
        currentData.removeEventListener('touchend', addRemoveHeader);
    }
    removeLegendListeners();
    centerBtn.removeEventListener('click', centerMap);
}
//LEGEND HOVER LISTENERS
function addLegendListeners() {
    const colors = legendColors.querySelectorAll('.color');
    const keyRanges = keys.querySelectorAll('.data-range');
    for (let i = 0; i < colors.length; i++) {
        if (!is_touch_device) {
            colors[i].addEventListener('mouseover', onColorOver, false);
        }
        else {
            colors[i].addEventListener('touchend', onColorTouch, false);
        }
    }
    for (let i = 0; i < keyRanges.length; i++) {
        if (!is_touch_device) {
            keyRanges[i].addEventListener('mouseover', onColorOver, false);
        }
        else {
            keyRanges[i].addEventListener('touchend', onColorTouch, false);
        }
    }
}
function removeLegendListeners() {
    const keyRanges = keys.querySelectorAll('.data-range');
    const colors = legendColors.querySelectorAll('.color');
    for (let i = 0; i < colors.length; i++) {
        if (!is_touch_device) {
            colors[i].removeEventListener('mouseover', onColorOver);
        }
        else {
            colors[i].removeEventListener('touchend', onColorTouch);
        }
    }
    for (let i = 0; i < keyRanges.length; i++) {
        if (!is_touch_device) {
            keyRanges[i].removeEventListener('mouseover', onColorOver);
        }
        else {
            keyRanges[i].removeEventListener('touchend', onColorTouch);
        }
    }
}
function clearLegendHover() {
    const colors = legendColors.querySelectorAll('.color');
    const keyRanges = keys.querySelectorAll('.data-range');
    for (let i = 0; i < colors.length; i++) {
        colors[i].classList.remove('on-color-hover');
    }
    for (let i = 0; i < keyRanges.length; i++) {
        keyRanges[i].style.opacity = 1;
    }
    clearHighlights();
}
function onColorTouch(e) {
    clearLegendHover();
    const elem = (e.target.className === 'color') ? this : getLegendTarget(this).elem;
    const keyRanges = keys.querySelectorAll('.data-range');
    for (let i = 0; i < keyRanges.length; i++) {
        keyRanges[i].style.opacity = (i === getLegendTarget(this).index) ? 1 : 0.3;
    }
    elem.classList.add('on-color-hover');
    highlightRangeCountries(elem.style.backgroundColor);
}
function onColorOver(e) {
    this.addEventListener('mouseout', onColorOut, false);
    const elem = (e.target.className === 'color') ? this : getLegendTarget(this).elem;
    const keyRanges = keys.querySelectorAll('.data-range');
    for (let i = 0; i < keyRanges.length; i++) {
        keyRanges[i].style.opacity = (i === getLegendTarget(this).index) ? 1 : 0.3;
    }
    elem.classList.add('on-color-hover');
    highlightRangeCountries(elem.style.backgroundColor);
}
function getLegendTarget(e) {
    const parent = e.parentNode;
    const index = Array.prototype.indexOf.call(parent.children, e);
    return { elem: legendColors.querySelectorAll('.color')[index], index: index };
}
function highlightRangeCountries(color) {
    for (let i = 0; i < pathCountries.length; i++) {
        if (pathCountries[i].getAttribute('data-name')) {//avoid including centerBtn SVG in loop
            if (pathCountries[i].style.fill != color) {
                pathCountries[i].classList.add('dark-path');
            }
        }
    }
}
function onColorOut(e) {
    const elem = (e.target.className === 'color') ? this : getLegendTarget(this).elem;
    const keyRanges = keys.querySelectorAll('.data-range');
    for (let i = 0; i < keyRanges.length; i++) {
        keyRanges[i].style.opacity = 1;
    }
    elem.classList.remove('on-color-hover');
    clearHighlights();
    this.removeEventListener('mouseout', onColorOut);
}
//CHART LISTENERS
function addChartListeners() {
    const chart = _('svgChart');
    const hoverG = chart.querySelector('.plot-lines');
    const labels = chart.querySelectorAll('.chart-label');
    for (let i = 0; i < labels.length; i++) {
        labels[i].addEventListener('mouseover', onChartLabelHover, false);
    }
    hoverG.addEventListener('mouseover', onChartHover, false);
    document.addEventListener('mousemove', onChartMove, false);
    window.addEventListener("resize", onChartResize, false);
}
function removeChartListeners() {
    const chart = _('svgChart');
    const hoverG = chart.querySelector('.plot-lines');
    const labels = chart.querySelectorAll('.chart-label');
    for (let i = 0; i < labels.length; i++) {
        labels[i].removeEventListener('mouseover', onChartLabelHover);
    }
    hoverG.removeEventListener('mouseover', onChartHover);
    document.removeEventListener('mousemove', onChartMove);
    window.removeEventListener("resize", onChartResize);
}
function addGlobalChartListeners() {
    const chartWrapper = _('chart');
    const btns = chartWrapper.querySelectorAll('.chart-btns');
    for (let i = 0; i < btns.length; i++) {
        btns[i].addEventListener('mouseup', onChartOptClick, false);
    }
    const checkBox = _('testsCheckBox');
    checkBox.addEventListener('change', onChartCheckBox, false);
    const menu = _('chartDropDown');
    menu.addEventListener('mouseup', onChartDropDown, false);
}
function removeGlobalChartListeners() {
    const chartWrapper = _('chart');
    const btns = chartWrapper.querySelectorAll('.chart-btns');
    for (let i = 0; i < btns.length; i++) {
        btns[i].removeEventListener('mouseup', onChartOptClick);
    }
    const checkBox = _('testsCheckBox');
    checkBox.removeEventListener('change', onChartCheckBox);
    const menu = _('chartDropDown');
    menu.removeEventListener('mouseup', onChartDropDown);
}
//SEARCH
function getOffsets(e) {
    const offsets = { width: e.offsetWidth, left: e.offsetLeft };
    return offsets;
}
function getSearchResults(search) {
    let result = [];
    const filtered = countryCodes.filter(row => row.name.toLowerCase().includes(search) || row.country.toLowerCase().includes(search) || row.alpha2.toLowerCase().includes(search) || row.alpha3.toLowerCase().includes(search));
    filtered.forEach(row => {
        const record = countriesList.find(country => country.country.toLowerCase() === row.country.toLowerCase());
        if (record) {
            result.push(record);
        }
    });
    return result;
}
function handleKeysOnSearch(e) {
    switch (e.key) {
        case 'ArrowDown':
            onArrowsEnterSearch();
            break;
        case 'ArrowUp':
            onArrowsEnterSearch(true);
            break;
        case 'Enter':
            onArrowsEnterSearch(false, true);
    }
}
function removeResultFocus() {
    const rows = resultsWrapper.querySelectorAll('.results-flex');
    for (let i = 0; i < rows.length; i++) {
        rows[i].classList.remove('results-flex-focus');
    }
}
function onArrowsEnterSearch(onUp, onEnter) {
    const rows = resultsWrapper.querySelectorAll('.results-flex');
    let newIndex = 0;
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].classList.length > 1) {
            rows[i].classList.remove('results-flex-focus');
            if (!onEnter) {
                newIndex = (!onUp) ? (i === rows.length - 1) ? rows.length - 1 : i + 1 : (i === 0) ? 0 : i - 1;
            }
            else {
                onResultClick(rows[i]);
                newIndex = i;
            }
        }
    }
    const topPos = rows[newIndex].offsetTop;
    resultsWrapper.scrollTop = topPos;
    rows[newIndex].classList.add('results-flex-focus');
}
function onResultClick(e) {
    e = (e.pageX) ? this : e;
    removeResultFocus();
    e.classList.add('results-flex-focus');
    let country = e.dataset.country;
    clearPage();
    clearHighlights();
    const path = dataSVG.find(path => path.path.getAttribute('data-name') === country);
    zoomToCountryNoAnim(path.path, true);
}
searchInput.addEventListener('keyup', function (e) {
    e.preventDefault();
    if (e.key != 'ArrowDown' && e.key != 'ArrowUp' && e.key != 'Enter' && e.key != 'ArrowLeft' && e.key != 'ArrowRight') {
        resultsWrapper.innerHTML = "";
        if (countriesList.length != 0) {
            let search = this.value.toLowerCase().trim();
            search = search.replace(/[^a-zA-Z ]/g, "");//remove all non-letter characters
            if (search != "") {
                const result = getSearchResults(search);
                closeSearch.style.visibility = "visible";
                closeSearch.addEventListener('mouseup', onCloseSearch, false);
                if (result.length != 0) {
                    resultsWrapper.style.visibility = "visible";
                    let html = "";
                    result.forEach(record => {
                        let flagId = dataSVG.find(dataSVG => dataSVG.country === record.country);
                        html += `
                            <div class='results-flex' data-country='${record.country}'>
                                <div class='bckg-img inline-flag' style='background-image:url(https://flagcdn.com/h40/${flagId.id}.png);'></div>
                                <p class='inline-p'>${record.country}</p>
                            </div>`;
                    });
                    resultsTransform();
                    resultsWrapper.innerHTML = html;
                    const rows = resultsWrapper.querySelectorAll('.results-flex');
                    for (let i = 0; i < rows.length; i++) {
                        rows[i].addEventListener('mouseup', onResultClick, false);
                    }
                }
                else {
                    resultsWrapper.style.visibility = "hidden";
                    resultsWrapper.innerHTML = "";
                }
            }
            else {
                onCloseSearch();
            }
        }
    }
    else {
        const rows = resultsWrapper.querySelectorAll('.results-flex');
        if (rows.length > 0) {
            handleKeysOnSearch(e);
        }
    }
});
function onCloseSearch() {
    resultsWrapper.style.visibility = "hidden";
    resultsWrapper.innerHTML = "";
    searchInput.value = "";
    closeSearch.style.visibility = "hidden";
    closeSearch.removeEventListener('mouseup', onCloseSearch);
}
//TOUCH EVENT LISTENERS
var hammertime;
var presstime;
var prevScale = 0;
var prevP = worldMap.createSVGPoint();
var touchTrail = worldMap.createSVGPoint();
touchTrail.x = touchTrail.y = prevP.x = prevP.y = 0;
function getTouchPoint(e) {
    const p = svgEl.createSVGPoint();
    p.x = e.center.x;
    p.y = e.center.y;
    return p;
}
function onPinchZoom(e) {
    popup.style.display = "none";
    const p = getTouchPoint(e);
    const scale = (prevScale === 0) ? e.scale - prevScale : (e.scale - prevScale) + 1;
    prevScale = e.scale;
    const matrix = setMatrix(p, scale);
    setCTM(zoomEl.getScreenCTM().multiply(matrix));
    const currentMat = zoomEl.transform.baseVal.getItem(0).matrix;
    if ((currentMat.a - initialScale) < 0.1) {
        if (window.innerWidth <= 768) {
            addHeader();
        }
        globalInstructions.classList.remove('transform-y-220');
        globalHelpTip.style.top = (globalInstructions.classList.length > 1) ? "50px" : "70px";
    }
    else {
        if (window.innerWidth <= 768) {
            removeHeader();
        }
        globalInstructions.classList.add('transform-y-220');
    }
}
function onTapZoom(e) {
    if (e.tapCount === 2 && !countryAnim) {
        if (window.innerWidth <= 768) {
            removeHeader();
        }
        globalInstructions.classList.add('transform-y-220');
        tapP = getTouchPoint(e);
        maxScale = zoomEl.transform.baseVal.getItem(0).matrix.a * 2;
        maxScale = (maxScale > maxZoom) ? maxZoom : maxScale;
        fadeZoom();
        popup.style.display = "none";
    }
}
function onTapPopup(e) {
    if (e.tapCount === 1) {
        let country = e.target.getAttribute('data-name');
        getPopupInfo(country);
        pathMove(e);
    }
}
function onPan(e) {
    const initialMat = zoomEl.transform.baseVal.getItem(0).matrix;
    let p = svgEl.createSVGPoint();
    p.x = (e.deltaX - prevP.x) / initialMat.a;
    p.y = (e.deltaY - prevP.y) / initialMat.d;
    prevP.x = e.deltaX;
    prevP.y = e.deltaY;
    touchTrail.x = p.x;
    touchTrail.y = p.y;
    const matrix = setPanMatrix(p);
    setCTM(zoomEl.getScreenCTM().multiply(matrix));
}
function onPanEnd(e) {
    if (e.maxPointers > 1) {
        touchTrail.x = touchTrail.y = prevP.x = prevP.y = 0;
        return;
    }
    fadeTouchPan();
}
function fadeTouchPan() {
    const rate = 0.06;//rate of decay
    touchTrail.x = touchTrail.x * (1 - rate);
    touchTrail.y = touchTrail.y * (1 - rate);
    if (Math.floor(Math.abs(touchTrail.x)) != 0 || Math.floor(Math.abs(touchTrail.y)) != 0) {
        const matrix = setPanMatrix(touchTrail);
        setCTM(zoomEl.getScreenCTM().multiply(matrix));
        requestAnimationFrame(fadeTouchPan);
    }
    else {
        cancelAnimationFrame;
        touchTrail.x = touchTrail.y = prevP.x = prevP.y = 0;
    }
}
function onPress(e) {
    let country = e.target.getAttribute('data-name');
    if (countriesList.find(data => data.country === country)) {
        popup.style.display = "none";
        clearLegendHover();
        cancelAnimationFrame(fadeTouchPan);
        zoomToCountry(e.target);
    }
}
function onDocTap(e) {
    if (e.tapCount >= 1) {
        clearLegendHover();
    }
}
function touchEvents() {
    //GLOBAL
    taptime = new Hammer(document);
    /*  document.addEventListener("touchmove", function(e){
         e.preventDefault();
         },{passive: false}); */
    //ZOOM
    hammertime = new Hammer(svgEl);
    hammertime.get('pinch').set({ enable: true });
    hammertime.on('pinchend', function (e) {
        prevScale = 0;
    });
    //PAN
    hammertime.on('panstart', function (e) {
        popup.style.display = "none";
        touchTrail.x = touchTrail.y = prevP.x = prevP.y = 0;
        cancelAnimationFrame(fadeTouchPan);
    });
    //PRESS FOR COUNTRY POPUP
    presstime = new Hammer(zoomEl);
    popuptime = new Hammer(popup);
    popuptime.on('tap', function (e) {
        popup.style.display = "none";
    });
    if (window.innerWidth <= 768) {
        closeSideBar();
    }
}
//DOM MANIP
function addRemoveHeader() {
    if (window.innerWidth <= 768) {
        if (header.classList.length === 1) {
            removeHeader();
        }
        else {
            addHeader();
        }
    }
}
function addHeader() {
    const elements = [header, currentData, globalHelpTip, toggle, toggleDark, keyBtn, centerBtn];
    elements.forEach(e => {
        e.classList.remove('transform-y-50');
    });
}
function removeHeader() {
    const elements = [header, currentData, globalHelpTip, toggle, toggleDark, keyBtn, centerBtn];
    elements.forEach(e => {
        e.classList.add('transform-y-50');
    });
    globalInstructions.classList.add('transform-y-220');
    globalHelpTip.style.top = "50px";
    if (mobileNav.classList.length === 0) {
        mobileNav.classList.add('transform-y-220');
        hamburger.classList.toggle('change');
    }
    if (window.innerWidth <= 768) {
        onCloseSearch();
    }
}
function removeHover() {
    closeKeys.classList.add('no-hover');
    closeDash.classList.add('white');
}
function clearHighlights() {
    for (let i = 0; i < pathCountries.length; i++) {
        if (pathCountries[i].getAttribute('data-name')) {//avoid including centerBtn SVG in loop
            pathCountries[i].classList.remove('light-path');
            pathCountries[i].classList.remove('dark-path');
        }
    }
}
//SIDEBAR
function closeSideBar() {
    sideBar.className = 'transform';
    toggle.style.opacity = 1;
}
function toggleSideBar() {
    if (sideBar.classList.length === 0) {
        sideBar.className = 'transform';
        toggle.style.opacity = 1;
    }
    else {
        sideBar.className = '';
        toggle.style.opacity = 0;
        popup.style.display = "none";
    }
}
toggle.addEventListener('mouseup', toggleSideBar, false);
closeDash.addEventListener('mouseup', closeSideBar, false);
//SWITCH TOGGLE
function onToggleSVGResize() {
    let testsTitle = _('testsTitle');
    let deathsTitle = _('deathsTitle');
    let vaccTittle = _('vaccTitle');
    const width = switchWrapper.offsetWidth;
    const posX = (window.innerWidth <= 768) ? (width - 64) / 2 : 118;
    const matrix = `matrix(1, 0, 0, 1, ${posX}, 42)`;
    switchG.setAttributeNS(null, 'transform', matrix);
    const x = width / 2;
    testsTitle.setAttribute('x', x);
    deathsTitle.setAttribute('x', width - 12);
    vaccTittle.setAttribute('x', x);
}
function toggleSwitchCases(cat) {
    let cx, cy, color, menu, property, title, height, btns, colors;
    switch (cat) {
        case 'cases':
            cx = 10;
            cy = 32;
            color = '#54cbf2';
            menu = casesMenu;
            property = 'casesPerMil';
            title = 'Cases/Million';
            height = '240px';//40 * 7 (number of menu options)
            btns = '.cases-btns';
            colors = ['#d6f5ff', '#96dcf4', '#54cbf2', '#04abe3', '#038ebc', '#035e79', '#013544'];
            break;
        case 'tests':
            cx = 32;
            cy = 10;
            color = '#f4bc68';
            menu = testsMenu;
            property = 'testsPerMil';
            title = 'Tests/Million';
            height = '160px';
            btns = '.tests-btns';
            colors = ['#fbebd1', '#f9d7a4', '#f4bc68', '#f9ad3b', '#ff9700', '#c57603', '#844f01'];
            break;
        case 'deaths':
            cx = 54;
            cy = 32;
            color = '#f6584c';
            menu = deathsMenu;
            property = 'deathsPerMil';
            title = 'Deaths/Million';
            height = '160px';
            btns = '.deaths-btns';
            colors = ['#ffe9e7', '#fcd2cd', '#ffada6', '#fd8177', '#f6584c', '#bd4137', '#9e251b'];
            break;
        case 'vaccines':
            cx = 32;
            cy = 54;
            color = '#4cf6af';
            menu = vaccMenu;
            property = 'percVacc';
            title = 'Vaccinated';
            height = '160px';
            btns = '.vacc-btns';
            colors = ['#e2fdf1', '#bafbdf', '#89f9ca', '#4cf6af', '#33a976', '#1f6949', '#0e2f20'];
    }
    return { cx: cx, cy: cy, color: color, menu: menu, property: property, title: title, height: height, btns: btns, colors: colors };
}
switchToggle.addEventListener('mouseup', function (e) {
    if (e.target.className.baseVal === 'switch-titles' || e.target.className.baseVal === 'switch-target-circles') {
        const cat = e.target.getAttribute('data-cat');
        if (switchValue != cat) {
            switchValue = cat;
            const color = toggleSwitchCases(cat).color;
            switchG.setAttribute('fill', color);
            const cx = toggleSwitchCases(cat).cx;
            const cy = toggleSwitchCases(cat).cy;
            const x = parseInt(switchCircle.getAttribute('cx'));
            const y = parseInt(switchCircle.getAttribute('cy'));
            switchCircle.setAttribute('cx', 32);
            switchCircle.setAttribute('cy', 32);
            if (x === cx || y === cy) {
                switchCircle.setAttribute('cx', cx);
                switchCircle.setAttribute('cy', cy);
            }
            else {
                setTimeout(() => {
                    switchCircle.setAttribute('cx', cx);
                    switchCircle.setAttribute('cy', cy);
                }, 200);
            }
            const titles = switchToggle.querySelectorAll('.switch-titles');
            for (let i = 0; i < titles.length; i++) {
                titles[i].style.opacity = (titles[i].getAttribute('data-cat') === cat) ? 1 : 0.4;
            }
            const menu = toggleSwitchCases(cat).menu;
            handleOptionsMenu(menu);
            currentData.style.backgroundColor = color;
            prop = toggleSwitchCases(cat).property;
            currentTitle = toggleSwitchCases(cat).title;
            changeLegendColors(cat);
            buttonsHandler(prop);
            worldData(dataAPI);
            removeLegendListeners();
            addLegendListeners();
            const height = toggleSwitchCases(cat).height;
            if (optionsDiv.offsetHeight > 40) {
                optionsDiv.style.height = height;
            }
            globalHelpTipHandler();
        }
    }
});
function handleOptionsMenu(e) {
    const menus = [casesMenu, testsMenu, deathsMenu, vaccMenu];
    for (let i = 0; i < menus.length; i++) {
        menus[i].style.display = (menus[i] === e) ? 'block' : 'none';
    }
}
//DROPDOWN
function openDropDown() {
    const height = toggleSwitchCases(switchValue).height;
    const toggle = _('dropDownArrow');
    optionsDiv.style.overflowY = "scroll";
    optionsDiv.style.height = height;
    toggle.classList.add('transform-rotate');
    sideBar.style.height = "100%";
}
function closeDropDown() {
    const toggle = _('dropDownArrow');
    optionsDiv.scrollTo(0, 0);
    optionsDiv.style.height = "40px";
    optionsDiv.style.overflowY = "hidden";
    toggle.classList.remove('transform-rotate');
}
dropDown.addEventListener('click', (e) => {
    if (optionsDiv.style.height === "40px" || optionsDiv.style.height === "") {
        statsWrapper.removeEventListener('scroll', onStatsScroll);
        openDropDown();
    }
    else {
        statsWrapper.addEventListener('scroll', onStatsScroll, false);
        closeDropDown();
    }
    sideBar.className = '';
});
function dropDownSwitch(property) {
    let p = '';
    switch (property) {
        case 'casesPerMil':
            p = 'This is the reported total cumulative count of detected and laboratory cases (and sometimes, depending on the country reporting them and the criteria adopted at the time, also clinical cases). Depending on the country reporting standards, this number can also include presumptive, suspect, or probable cases of detected infection.';
            break;
        case 'newCasesPerMil':
            p = 'Every country reports their daily new cases at different times in the day. The daily data by all reporting countries resets every day after midnight GMT.';
            break;
        case 'percRecovered':
            p = 'This is the percent of cases that have recovered from the disease. This statistic is highly imperfect, because reporting can be missing, incomplete, incorrect, based on different definitions, or dated (or a combination of all of these) for many governments, both at the local and national level, sometimes with differences between states within the same country or counties within the same state. ';
            break;
        case 'percActive':
            p = 'This figure represents the current number of people detected and confirmed to be infected with the virus. This figure can increase or decrease, and represents an important metric for Public Health and Emergency response authorities when assessing hospitalization needs versus capacity.';
            break;
        case 'percCritical':
            p = `This is the percent of current active cases that are in critical condition. This statistic is imperfect, for many reasons. When 99% of the cases were in China, the figure pretty much corresponded to the Chinese NHC's reported number of "severe" cases. Today, it represents for the most part the number of patients currently being treated in Intensive Care Unit (ICU), if and when this figure is reported.`;
            break;
        case 'testsPerMil':
        case 'totalTests':
            p = `This statistic is imperfect, because some countries report tests performed, while others report the individuals tested.`;
            break;
        case 'deathsPerMil':
            p = 'This is the reported total cumulative count of deaths caused by COVID-19. Due to limited testing, challenges in the attribution of the cause of death, and varying methods of reporting in some countries, this is an imperfect statistic. ';
            break;
        case 'newDeathsPerMil':
            p = 'Every country reports their daily new deaths at different times in the day. The daily data by all reporting countries resets every day after midnight GMT.';
            break;
        case 'percDeaths':
            p = `The Case Fatality rate (CFR) represents the proportion of cases who eventually die from the disease. This statistic for each country is imperfect, since it is based on both the total number of reported cases and deaths, both of which depend on the respective countries' reporting criteria. Globally, the WHO has estimated the coronavirus' CFR at 2%. For comparison, the CFR for SARS was 10%, and for MERS 34%.`;
            break;
        case 'percVacc':
            p = 'This is the percent of population that received at lease one vaccine dose.';
            break;
        case 'percFullyVacc':
            p = 'This is the percent of population that received all doses prescribed by the vaccination protocol.';
            break;
        case 'totalVaccinations':
            p = 'This figure represents the total number of doses administered, it does <strong>NOT</strong> represent the total number of people vaccinated.';
    }
    return p;
}
function globalHelpTipHandler() {
    const pText = dropDownSwitch(prop);
    if (pText != '') {
        globalHelpTip.style.display = 'block';
        const p = globalHelpTip.querySelector('p');
        p.innerHTML = pText;
    }
    else {
        globalHelpTip.style.display = 'none';
    }
    if (is_touch_device && window.innerWidth <= 768) {
        globalHelpTip.style.top = (globalInstructions.classList.length > 1) ? "50px" : "70px";
    }
}
function legendHelpTipHandler() {
    let text = (is_touch_device) ? 'Tap color to isolate countries in specific range.' : 'Hover mouse over color to isolate countries in specific range.';
    const p = legendHelpTip.querySelector('p');
    p.innerText = text;
}
//DROPDOWN PROPERTIES
var bckColorLDM = "#3d3c3a";
var colorLDM = "#faebd7";
const buttons = document.querySelectorAll('button');
for (let i = 0; i < buttons.length; i++) {
    if (buttons[i].dataset.prop) {
        buttons[i].addEventListener('mouseup', function (e) {
            if (countriesList.length != 0) {//wait for countriesList to fill with data
                prop = this.dataset.prop;
                currentTitle = this.innerText;
                const btnQuery = toggleSwitchCases(switchValue).btns;
                const btns = document.querySelectorAll(btnQuery);
                for (let k = 0; k < btns.length; k++) {
                    btns[k].style.backgroundColor = bckColorLDM;
                    btns[k].style.color = colorLDM;
                }
                this.style.backgroundColor = toggleSwitchCases(switchValue).color;
                this.style.color = "#000";
                globalHelpTipHandler();
                currentData.innerText = dropDownTitle.innerText = currentTitle;
                keyTitle.innerText = rawTotalSwitch(prop).title;
                getMinMax(countriesList, prop, rangeLimit);
                if (window.innerWidth <= 768) {
                    closeSideBar();
                }
            }
        });
    }
}
//STATS DASHBOARD SCROLL
var lastScrollTop = 0;
statsWrapper.addEventListener('scroll', onStatsScroll, false);
function onStatsScroll(e) {
    var st = this.scrollTop;
    if (st <= 0) {
        sideBar.className = "";
        if (st > lastScrollTop){// downscroll code
            sideBar.style.height = '100%';     
         }
         else{
            setTimeout(() => {//avoid wheel action on svg map
                sideBar.style.height = '100%';
            }, 300);
         }    
    }
    else {
        if (st > 500) {
            sideBar.className = 'transform-y-178';
            if (st > lastScrollTop){// downscroll code
                sideBar.style.height = window.innerHeight + 178 + "px";//30(header) + 148(switchWrapper)
            }
            else{
                setTimeout(() => {
                    sideBar.style.height = window.innerHeight + 178 + "px";//30(header) + 148(switchWrapper)
                }, 300);   
            }   
        }
        else {
            sideBar.className = 'transform-y-30';    
            if (st > lastScrollTop){// downscroll code
                sideBar.style.height = window.innerHeight + 30 + "px";//30
            }
            else{
                setTimeout(() => {
                    sideBar.style.height = window.innerHeight + 30 + "px";//30
                }, 300);
            }          
        }
    }
    lastScrollTop = st <= 0 ? 0 : st; // For Mobile or negative scrolling
}
//DARK/LIGHT MODE
function changeNavColor() {
    const mapColor = (mode === 'dark') ? '#54cbf2' : '#9c9c9c';
    const aboutColor = (mode === 'dark') ? '#faebd7' : '#000';
    _('mapBtn').style.color = mapColor;
    _('aboutBtn').style.color = aboutColor;
    _('mapBtnMobile').style.color = mapColor;
    _('aboutBtnMobile').style.color = aboutColor;
}
function onToggleDark(e) {
    if (mode === "dark") {//LIGHT
        mode = "light";
        this.setAttribute('title', 'Toggle Dark Mode');
        bckColorLDM = "#fff";
        colorLDM = "#000";
        html.classList.add('light');
        if (searchWrapper.classList.length === 2) {
            searchWrapper.style.backgroundColor = '#e6e6e6';
        }
        buttonsHandler(prop);
    }
    else {//DARK
        mode = "dark";
        this.setAttribute('title', 'Toggle Light Mode');
        bckColorLDM = "#3d3c3a";
        colorLDM = "#faebd7";
        html.classList.remove('light');
        if (searchWrapper.classList.length === 2) {
            searchWrapper.style.backgroundColor = '#282828';
        }
        buttonsHandler(prop);
    }
    changeNavColor();
}
toggleDark.addEventListener('mouseup', onToggleDark, false);
//LEGEND BOX
function toggleLegend() {
    if (keys.style.visibility === 'visible' || keys.style.maxHeight === "550px") {
        closeLegend();
    }
    else {
        openLegend();
    }
}
function openLegend() {
    keys.style.visibility = "visible";
    keys.style.maxHeight = "550px";
}
function closeLegend() {
    keys.style.maxHeight = "0px";
    keys.style.visibility = "hidden";
}
keyBtn.addEventListener('click', toggleLegend, false);
closeKeys.addEventListener('click', closeLegend, false);
//HAMBURGER
hamburger.addEventListener('mouseup', (e) => {
    if (mobileNav.classList.length === 1) {
        mobileNav.classList.remove('transform-y-220');
    }
    else {
        mobileNav.classList.add('transform-y-220');
    }
    hamburger.classList.toggle('change');
    popup.style.display = "none";
});
//MOBILE SEARCH WRAPPER
function showSearch() {
    const color = (mode === 'dark') ? '#282828' : '#e6e6e6';
    if (window.innerWidth <= 768) {
        if (searchWrapper.classList.length === 1) {
            searchWrapper.classList.add('flex-1');
            closeSearch.style.display = "block";
            searchInput.style.visibility = "visible";
            searchWrapper.style.backgroundColor = color;
            searchWrapper.style.marginRight = "45px";
            headerTitle.style.display = "none";
        }
        else {
            searchWrapper.classList.remove('flex-1');
            closeSearch.style.display = "none";
            searchInput.style.visibility = "hidden";
            searchWrapper.style.backgroundColor = "transparent";
            searchWrapper.style.marginRight = "30px";
            setTimeout(() => {
                headerTitle.style.display = "block";
            }, 300);
        }
    }
    else {
        searchInput.focus();
    }
}
searchIcon.addEventListener('mouseup', showSearch, false);
//MAIN PAGE
function clearPage() {
    toggle.style.display = "none";
    toggleDark.style.display = "none";
    sideBar.style.display = "none";
    currentDataWrapper.style.display = "none";
    centerBtn.style.display = "none";
    keyBtn.style.display = "none";
    keys.style.display = "none";
    globalInstructions.style.display = "none";
    if (about.style.display === "block") {
        changeNavColor();
        about.style.display = "none";
    }
}
function showPage() {
    const dispValue = ['-webkit-box', '-ms-flexbox', 'flex'];
    for (let i = 0; i < dispValue.length; i++) {
        sideBar.style.display = dispValue[i];
        currentDataWrapper.style.display = dispValue[i];
    }
    toggle.style.display = "block";
    toggleDark.style.display = "block";
    centerBtn.style.display = "block";
    keyBtn.style.display = "block";
    keys.style.display = "block";
    if (is_touch_device) {
        if (window.innerWidth <= 768) {
            globalHelpTip.style.top = (globalInstructions.classList.length > 1) ? "50px" : "70px";
        }
        globalInstructions.style.display = "block";
    }
    onToggleSVGResize();
}
//CLEAR COUNTRY POPUP
function clearPopup() {
    countryPopup.style.overflow = 'hidden';//block touch scroll momentum before animation
    countryPopup.scrollTo(0, 0);
    countryPopup.removeEventListener('scroll', onCountryPopupScroll);
    closePopup.removeEventListener('mouseup', onClosePopup);
    setTimeout(() => {
        countryPopup.classList.add('transform');
        closePopup.style.marginLeft = "-30px";
        countryPopup.style.overflow = '';
    }, 10);
    setTimeout(() => {
        resultsTransform();
    }, 500);
}
function setPrevMapState() {
    const transform = `matrix(${prevMatrix.scale}, 0, 0, ${prevMatrix.scale}, ${prevMatrix.x}, ${prevMatrix.y})`;
    zoomEl.setAttributeNS(null, 'transform', transform);
    pathStrokeHandler();
}
//PAGE SWITCHING
document.querySelectorAll('.menu-btns').forEach(btn => {
    btn.addEventListener('mouseup', function (e) {
        mobileNav.classList.add('transform-y-220');
        hamburger.classList.remove('change');
        let attr = this.dataset.link;
        const thisColor = (mode === 'dark') ? '#54cbf2' : '#9c9c9c';
        const otherColor = (mode === 'dark') ? '#faebd7' : '#000';
        document.querySelectorAll('.menu-btns').forEach(item => {
            item.style.color = otherColor;
        });
        this.style.color = thisColor;
        if (attr === "about") {
            removeZoomTapListeners();
            clearPage();
            clearPopup();
            about.style.display = "block";
        }
        else {
            removeZoomTapListeners();
            addZoomTapListeners();
            clearPopup();
            showPage();
            if (window.innerWidth <= 768) {
                closeSideBar();
            }
            about.style.display = "none";
        }
        if (closePopup.dataset.country) {
            let country = closePopup.dataset.country;
            removePopupListeners();
            addPopupListeners(country);
            if (chartOn) { removeChartListeners(); removeGlobalChartListeners(); chartOn = false; }
        }
        else {
            removePopupListeners();
            addPopupListeners();
        }
        onResize();
        popup.style.display = "none";
    });
});
//LOADER FADE
function fadeOut(e) {
    e.style.opacity = 1;
    (function fade(x) {
        (e.style.opacity -= .1) < 0 ? e.style.display = "none" : setTimeout(fade, 40);
    })();
}
function fadeIn(e, flex) {
    if (!flex) {
        e.style.display = 'block';
    }
    let opacity = 0;
    var interval = setInterval(() => {
        if (opacity < 1) {
            opacity += 0.1;
            e.style.opacity = opacity;
        }
        else {
            clearInterval(interval);
        }
    }, 40);
}
//CURRENT DATE
function formatTime() {//for update timestamp
    var todayTime = new Date();
    var hours = todayTime.getHours().toString().length == 1 ? '0' + todayTime.getHours() : todayTime.getHours();
    var minutes = todayTime.getMinutes().toString().length == 1 ? '0' + todayTime.getMinutes() : todayTime.getMinutes();
    var seconds = todayTime.getSeconds().toString().length == 1 ? '0' + todayTime.getSeconds() : todayTime.getSeconds();
    return hours + ":" + minutes + ":" + seconds;
}
function formatDate(date, short) {//for daily dates on charts
    date = date.split('-');
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return (!short) ? months[date[1] - 1] + ' ' + Number(date[2]) + ', ' + date[0] : months[date[1] - 1] + ' ' + Number(date[2]);
}
//ADD COMMAS TO NUMBER
String.prototype.commaSplit = function () {
    return this.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};
Number.prototype.commaSplit = String.prototype.commaSplit;
//COUNT DECIMAL PLACES IN NUMBER
Number.prototype.countDecimals = function () {
    if (Math.floor(this.valueOf()) === this.valueOf()) return 0;
    return this.toString().split(".")[1].length || 0;
};