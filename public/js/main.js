function _(x) {
    return document.getElementById(x);
}
//global variables
var pathCountries = [];
var countryCodes = [];
var dataSVG = [];
var usSVG = [];
var dataAPI = [];
var dataVacc = [];
var countriesList = [];
var usData = [];
var globalRangeList = [];
var prop = "casesPerMil";
var currentTitle = "Cases/Million";
const rangeLimit = 6;
var switchValue = "cases";
var mode = "dark";
var dropDownOn = false,
    chartOn = false,
    usOn = false;
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
var onLoad = true;
function onPageLoad() {
    statsWrapper.scrollTop = 0;
    _('overlay').style.display = "none";
    sideBar.style.visibility = "visible";
    sideBar.className = '';
    toggle.style.opacity = 0;
    currentData.innerText = currentTitle;
    currentDataWrapper.style.visibility = "visible";
    fadeOut(loader);
    fadeOut(_('overlayMsg'));
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
        globalInstructions.classList.remove('transform-y-260');
        const p = globalInstructions.querySelector('p');
        globalInstructions.style.display = "block";
        p.innerText = 'Tap country for info, press and hold for full country profile.';
    }
}
function onDOMLoaded() {
    socket = io();
    socketListeners(socket);
    socket.emit('getCountryCodes');
    dataSVG = parseSVG();
    pathStrokeHandler();
    fetch('https://api.apify.com/v2/key-value-stores/SmuuI0oebnTWjRTUh/records/LATEST?disableRedirect=true')
        .then(response => {
            if (response.ok) {
                return response.json();
            }
        })
        .then(async data => {
            if (data) {
                dataAPI = data.regionData;
                countriesList = await getData(dataAPI);
                countriesList = await calcData(countriesList);
                timeStamp.innerText = `Updated at ${formatTime()} EST`;
                execProp();
                socket.emit('getVaccineData');
                socket.emit('getUsData');
                onPageLoad();
            }
            else {
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
        socket.emit('getVaccineData');
        socket.emit('getUsData');
    });
    socket.on('getCountryCodes', data => {
        countryCodes = data;
    });
    socket.on('getCountryData', data => {
        if (data) {
            if (closePopup.getAttribute('data-alpha2').toLowerCase() === data.country.toLowerCase()) {//in case they left page before socket response
                if (data.data) {
                    const chart = _('chart');
                    if (_('chartLoader')) { fadeOut(_('chartLoader')); }
                    chart.style.minHeight = '350px';
                    chart.style.height = '70vh';
                    dataHist = data.data;
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
                        onNoChartData();
                    }
                }
                else {
                    chartOn = false;
                    const chart = _('chart');
                    if (_('chartLoader')) { fadeOut(_('chartLoader')); }
                    chart.innerHTML = "<h2 class='chart-no-data yellow-test'>NO CHART DATA</h2>";
                }
            }
        }
        else {
            chartOn = false;
            const chart = _('chart');
            if (_('chartLoader')) { fadeOut(_('chartLoader')); }
            chart.innerHTML = "<h2 class='chart-no-data yellow-test'>NO CHART DATA</h2>";
        }

    });
    socket.on('getLatestData', payload => {
        if (payload.latest && closePopup.getAttribute('data-country') === payload.country) {
            const percObj = getYestData(payload);
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
    socket.on('getLatestWorldData', payload => {
        if (payload.latest) {
            const world = (payload.country === 'World') ? true : false;
            const usa = (payload.country === 'USA') ? true : false;
            const percObj = getYestData(payload, world, usa);
            const perc = percObj.perc;
            const percDeaths = percObj.percDeaths;
            if (switchValue === 'cases') {
                if (perc && perc != 0) {
                    addPercNewWorld(perc);
                }
            }
            else if (switchValue === 'deaths') {
                if (percDeaths && percDeaths != 0) {
                    addPercNewWorld(percDeaths);
                }
            }
        }
    });
    socket.on('getVaccineData', async data => {
        if (data) {
            dataVacc = data;
            countriesList = await getData(dataAPI);
            countriesList = await calcData(countriesList);
            timeStamp.innerText = `Updated at ${formatTime()} EST`;
            execProp();
        }
    });
    socket.on('getUsData', async data => {
        if (data) {
            if (onLoad) {
                fadeOut(_('mapLoader'));
                mapDiv.removeChild(_('mapLoader'));
                onLoad = false;
            }
            usData = await calcUsData(data);
            usData = await calcData(usData);
            execProp();
        }
    });
}
async function execProp() {
    const dataset = (!usOn) ? countriesList : usData;
    buttonsHandler(prop);
    worldData(dataAPI);
    globalRangeList = await getMinMax(dataset, prop);
    makeLegend(globalRangeList);
    matchData(dataset, prop, globalRangeList);
    showSortedList(dataset);
}
function calcUsData(data) {
    return new Promise(resolve => {
        const rows = [];
        data.forEach(row => {
            row.partiallyVaccinated = Math.abs((row.peopleVaccinated || 0) - (row.peopleFullyVaccinated || 0));
            rows.push(row);
        });
        resolve(rows);
    });
}
function reassignProp() {
    execProp();
    statsWrapper.scrollTop = 0;
    globalHelpTipHandler();
    const placeholder = (!usOn) ? 'Search by Country' : 'Search by State';
    searchInput.setAttribute('placeholder', placeholder);
}
function parseSVG() {
    pathCountries = zoomEl.querySelectorAll('path');
    const dataPaths = [];
    for (let i = 0; i < pathCountries.length; i++) {
        if (pathCountries[i].getAttribute('data-id')) {
            let id = pathCountries[i].getAttribute('id').toLowerCase();
            let countryName = pathCountries[i].getAttribute('data-name');
            dataPaths.push({ path: pathCountries[i], id: id, country: countryName });
        }
    }
    return dataPaths;
}
function fetchAPI() {
    fetch('https://api.apify.com/v2/key-value-stores/SmuuI0oebnTWjRTUh/records/LATEST?disableRedirect=true')
        .then(response => {
            if (response.ok) {
                return response.json();
            }
        })
        .then(async data => {
            if (data) {
                dataAPI = data.regionData;
                socket.emit('getVaccineData');
                socket.emit('getUsData');
            }
            else {
                socket.emit('getFetchFromServer');
            }
        });
}
//DATA MANIP
function getData(data, us) {
    return new Promise(resolve => {
        const results = [];
        const svgList = (!us) ? dataSVG : usSVG;
        svgList.forEach(item => {
            const index = data.findIndex(data => data.country === item.country);
            if (index != -1) {
                data[index].alpha2 = item.id;
                const vaccIndex = dataVacc.findIndex(row => row.country === item.id);
                data[index].totalVaccinations = (vaccIndex != -1) ? dataVacc[vaccIndex].totalVaccinations : 0;
                data[index].peopleVaccinated = (vaccIndex != -1) ? dataVacc[vaccIndex].peopleVaccinated : 0;
                data[index].peopleFullyVaccinated = (vaccIndex != -1) ? dataVacc[vaccIndex].peopleFullyVaccinated : 0;
                data[index].partiallyVaccinated = (vaccIndex != -1) ? Math.abs(((dataVacc[vaccIndex].peopleVaccinated || 0) - (dataVacc[vaccIndex].peopleFullyVaccinated || 0))) : 0;
                data[index].vaccines = (vaccIndex != -1) ? dataVacc[vaccIndex].vaccines : 'Not Reported';
                results.push(data[index]);
            }
        });
        resolve(results);
    });
}
function calcData(data) {
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
            const percVacc = (item.partiallyVaccinated / item.population) * 100;
            const percFullyVacc = (item.peopleFullyVaccinated / item.population) * 100;
            item.newCasesPerMil = roundVal(newCases * 10000, 2);
            item.newDeathsPerMil = roundVal(newDeaths * 10000, 2);
            item.percDeaths = percVar[0];
            item.percRecovered = percVar[1];
            item.percActive = percVar[2];
            item.percCritical = (item.seriousCritical === null) ? null : (item.activeCases != null && item.activeCases != 0) ? roundVal((item.seriousCritical / item.activeCases) * 100, 1) : 0;;
            item.percVacc = roundVal(percVacc, 2);
            item.percFullyVacc = roundVal(percFullyVacc, 2);
            results.push(item);
        });
        resolve(results);
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
    const query = (!usOn) ? 'World' : 'USA';
    const world = data.find(data => data.country === query);
    const totalPop = (!usOn) ? totalOfProp('population') : world.population;
    const newCasesPerMil = (!usOn) ? roundVal((world.newCases / totalPop) * 1000000, 2) : world.newCasesPerMil;
    const newDeathsPerMil = (!usOn) ? roundVal((world.newDeaths / totalPop) * 1000000, 2) : world.newDeathsPerMil;
    const totalTests = (!usOn) ? totalOfProp('totalTests') : world.totalTests;
    const totalPartialVacc = (!usOn) ? totalOfProp('partiallyVaccinated') : world.partiallyVaccinated;
    const totalPplFlVacc = (!usOn) ? totalOfProp('peopleFullyVaccinated') : world.peopleFullyVaccinated;
    const totalVacc = (!usOn) ? totalOfProp('totalVaccinations') : world.totalVaccinations;
    world.totalTests = totalTests;
    world.totalPop = totalPop;
    world.totalPartialVacc = totalPartialVacc;
    world.totalPplFlVacc = totalPplFlVacc;
    world.totalVacc = totalVacc;
    const percRecovered = roundVal((world.totalRecovered / world.totalCases) * 100, 1);
    const percActive = roundVal((world.activeCases / world.totalCases) * 100, 1);
    const percDeaths = roundVal((world.totalDeaths / world.totalCases) * 100, 1);
    const percCritical = roundVal((world.seriousCritical / world.activeCases) * 100, 1);
    const percPartialVacc = roundVal((world.totalPartialVacc / world.totalPop) * 100, 1);
    const percPplFlVacc = roundVal((world.totalPplFlVacc / world.totalPop) * 100, 1);
    let worldStats = _('worldStats');
    const alpha2 = (!usOn) ? 'World' : 'USA';
    const title = (!usOn) ? 'Global' : 'US';
    if (switchValue === "cases") {
        worldStats.innerHTML = `
            <h2 class='global-cases-title'>${title} Stats</h2>
            <p class='stats white'>${world.casesPerMil.commaSplit()}</p>
            <p class='stats-titles gray'>Cases/Million</p>
            <div class='worldStats-flex'>
                <div>
                    <p class='stats white'>${newCasesPerMil.commaSplit()}</p>
                    <p class='stats-titles gray'>New Cases/Million</p>
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
            </div>
            <p class='stats white'>${world.totalCases.commaSplit()}</p>
            <p class='stats-titles gray'>Confirmed Cases</p>`;
        socket.emit('getLatestWorldData', alpha2);
    }
    else if (switchValue === 'tests') {
        worldStats.innerHTML = `
            <h2 class='global-tests-title'>${title} Stats</h2>
            <p class='stats white'>${world.totalTests.commaSplit()}</p>
            <p class='stats-titles gray'>Total Tests</p>
            <p class='stats white'>${world.totalPop.commaSplit()}</p>
            <p class='stats-titles gray'>Population</p>`;
    }
    else if (switchValue === 'vaccines') {
        worldStats.innerHTML = `
            <h2 class='global-vacc-title'>${title} Stats</h2>
            <div class='worldStats-flex'>
                <div>
                    <p class='stats white'>${world.totalPartialVacc.commaSplit()}</p>
                    <p class='stats-titles gray'>People Partially Vaccinated</p>
                </div>
                ${getPiePerc(percPartialVacc, 'percVacc', true)}
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
            <h2 class='global-deaths-title'>${title} Stats</h2>
            <p class='stats white'>${world.deathsPerMil.commaSplit()}</p>
            <p class='stats-titles gray'>Deaths/Million</p>
            <div class='worldStats-flex'>
                <div>
                    <p class='stats white'>${newDeathsPerMil.commaSplit()}</p>
                    <p class='stats-titles gray'>New Deaths/Million</p>
                </div>
                <div class='flex-stat' style='width:60px; height:70px;margin:0;' title='Percent Daily Change'></div>
            </div>
            <div class='worldStats-flex'>
                <div>
                    <p class='stats white'>${world.totalDeaths.commaSplit()}</p>
                    <p class='stats-titles gray'>Total Deaths</p>
                </div>
                ${getPiePerc(percDeaths, 'totalDeaths', true)}
            </div>`;
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
}
function getMinMax(data, property) {
    return new Promise(resolve => {
        const list = mapData(data, property);
        var max = (property != 'casesPerMil') ? Math.max.apply(null, list) : list[1];//andorra is highest cases/mil
        var min = (Math.min.apply(null, list.filter(Boolean)) > 1) ? 1 : Math.min.apply(null, list.filter(Boolean));
        const minDecimal = min.countDecimals();
        min = (min < 1) ? 1 / Math.pow(10, minDecimal) : min;
        const range = (property === 'percRecovered' || property === 'percActive' || property === 'percCritical' || property === 'percVacc' || property === 'percFullyVacc') ? getPercRangeList(max, min) : getRangeList(max, min);
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
                    pathCountries[i].style.fill = val2color(value, range);
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
function val2color(value, range) {
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
        /* if (index === sortedList.length - 1) {
            value.rankMax = count;
        } */
    });
    return sortedList;
}
function showSortedList(data) {
    const color = toggleSwitchCases(switchValue).color;
    const list = _('worldList');
    let html = "";
    const svgList = (!usOn) ? dataSVG : usSVG;
    sortList(data).forEach(item => {
        const flagId = svgList.find(row => row.country === item.country).id;
        const flagUrl = (flagId === 'ic') ? `images/ic.png` : (flagId === 'us-dc') ? `images/us-dc.png` : `https://flagcdn.com/60x45/${flagId}.png`;
        html += `
            <div class='stats-flex' data-country='${item.country}'>
                <p class='inline-count'>${item.rank}</p>
                <div class='bckg-img inline-flag' style='background-image:url(${flagUrl});'></div>
                <p class='inline-p'>${item.country}</p>
                <p class='inline-stat'>${item[prop].commaSplit()}</p>
            </div> `;
    });
    const title = rawTotalSwitch(prop).title;
    const rankTitle = (!usOn) ? 'Global Ranks' : 'US Ranks';
    list.innerHTML = `
        <h2 id='rankTitle' class='global-cases-title' style='color:${color};'>${rankTitle}</h2>
        <p class='ranks-title gray'>${title}</p>
        ${html}`;
}
//EVENT LISTENERS
worldList.addEventListener('mouseup', function (e) {
    if (e.target.parentNode.className === 'stats-flex') {
        let country = e.target.parentNode.dataset.country;
        clearPage();
        clearHighlights();
        const svgList = (!usOn) ? dataSVG : usSVG;
        const path = svgList.find(path => path.path.getAttribute('data-name') === country);
        zoomToCountryNoAnim(path.path);
    }
});
//POPUP
function addPopupListeners() {
    countryAnim = false;
    for (let i = 0; i < pathCountries.length; i++) {
        if (pathCountries[i].getAttribute('data-name')) {//avoid including centerBtn SVG in loop
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
        const dataset = (!usOn) ? countriesList : usData;
        if (dataset.find(data => data.country === country)) {
            goToCountry(this);
        }
    }
}
function pathHover(e) {
    const dataset = (!usOn) ? countriesList : usData;
    this.addEventListener('mouseup', onPathClick, false);
    this.addEventListener('mouseout', pathNoHover, false);
    if (dataset.length != 0 && prop != "") {
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
            title = 'Population';
            colorClass = '';
            break;
        case 'totalVaccinations':
            totalProp = 'totalVaccinations';
            title = 'Total Vaccinations';
            colorClass = 'green';
            break;
        case 'percVacc':
            totalProp = 'partiallyVaccinated';
            title = '% Partially Vaccinated';
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
    const svgList = (!usOn) ? dataSVG : usSVG;
    const flagId = svgList.find(path => path.country === country).id;
    const flagUrl = (flagId === 'ic') ? `images/ic.png` : (flagId === 'us-dc') ? `images/us-dc.png` : `https://flagcdn.com/h40/${flagId}.png`;
    const data = (!usOn) ? countriesList : usData;
    const record = sortList(data).find(data => data.country === country);
    if (record) {
        const rank = record.rank;
        //const list = sortList(countriesList);
        //const rankMax = list[list.length - 1].rankMax;
        const stat = record[prop].commaSplit();
        const totalProp = rawTotalSwitch(prop).totalProp;
        const title = rawTotalSwitch(prop).title;
        const rawTotal = record[totalProp].commaSplit();
        statText = `
            <div class='popup-flex'>
                <p class='popup-small gray'>${title}</p><p class='popup-big white'>${stat}</p>
            </div>`;
        rankText = `
            <div class='popup-flex'>
                <p class='popup-small gray'>Rank</p><p class='popup-big white'>${rank}</p>
            </div>`;
        rawTotalText = (prop === 'testsPerMil' || prop === 'totalTests' || prop === 'population' || prop === 'totalVaccinations') ? '' : `
            <div class='popup-flex'>
                <p class='popup-small gray'>Raw Total</p><p class='popup-big white'>${rawTotal}</p>
            </div>`;
    }
    else {
        statText = "<p class='popup-small yellow'>No Reported Data</p>";
    }
    popup.innerHTML = `
        <div class='flag bckg-img' style='background-image:url(${flagUrl});'></div>
        <p class='popup country white'>${country}</p>
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
    if (e.target.parentNode === zoomEl) {
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
    let usBtn = (alpha2.toLowerCase() === 'us') ? '<span class="us-btn" onMouseUp="onMenuBtn();">USA MAP</span>' : '';
    countryPopup.scrollTo(0, 0);
    countryPopup.classList.remove('transform');
    closePopup.style.visibility = 'visible';
    closePopup.style.marginLeft = "-5px";
    closePopup.setAttribute('data-alpha2', alpha2);
    closePopup.setAttribute('data-country', country);
    setTimeout(() => {
        resultsTransform();
    }, 300);
    const propList = (!usOn) ? ["newCasesPerMil", "newDeathsPerMil", "percDeaths", "percRecovered", "percActive", "percCritical", "testsPerMil", "percVacc", "percFullyVacc", "totalVaccinations"] : ["newCasesPerMil", "newDeathsPerMil", "percDeaths", "percRecovered", "percActive", "testsPerMil", "percVacc", "percFullyVacc", "totalVaccinations"];
    const propTitles = (!usOn) ? ["Daily New Cases", "Daily New Deaths", "Case Fatality Rate", "Recovered", "Active", "Critical", "Tests", "Partially Vaccinated", "Fully Vaccinated", "Vaccinations"] : ["Daily New Cases", "Daily New Deaths", "Case Fatality Rate", "Recovered", "Active", "Tests", "Partially Vaccinated", "Fully Vaccinated", "Vaccinations"] ;
    const svgList = (!usOn) ? dataSVG : usSVG;
    const flagId = svgList.find(path => path.country === country).id;
    const flagUrl = (flagId === 'ic') ? `images/ic.png` : (flagId === 'us-dc') ? `images/us-dc.png` : `https://flagcdn.com/h240/${flagId}.png`;
    const wrapperProplist = ['casesPerMil', 'deathsPerMil', 'population'];
    let record, rank = [];
    const dataset = (!usOn) ? countriesList : usData;
    wrapperProplist.forEach(p => {
        const list = sortList(dataset, p);
        record = list.find(data => data.country === country);
        rank.push(record.rank);
        //rankMax.push(list[list.length - 1].rankMax);
    });
    var html = "";
    propList.forEach((item, index) => {
        const title = rawTotalSwitch(item).title;
        const totalProp = rawTotalSwitch(item).totalProp;
        const colorClass = rawTotalSwitch(item).colorClass;
        const flexClass = (item === 'totalVaccinations' && !usOn) ? 'stats-column-flex-100' : '';
        const helpText = dropDownSwitch(item);
        html += `
            <div class='stats-column-flex ${flexClass}'>
                <div class="help-tip-stats help-tip"><p>${helpText}</p></div>
                <p class='prop-title ${colorClass}'>${propTitles[index]}</p>
                ${getRecord(record.country, item, title, totalProp)}
            </div>`;
    });
    countryPopup.innerHTML = `
            <div id='countryWrapper'>
                <div class='country-container'>
                    ${usBtn}
                    <div class='flag-big bckg-img' style='background-image:url(${flagUrl})'></div>
                    <p class='country-big'>${record.country}</p>
                    <p class='stats'>${record.population.commaSplit()}</p>
                    <p class='stats-titles dark-gray'>Population</p>
                </div>
                <div class='stats-column'>
                    <p class='prop-title-main blue'>Cases</p>
                    <p class='stats blue'>${record.casesPerMil.commaSplit()}</p>
                    <p class='stats-titles white'>Cases/Million</p>
                    <p class='stats blue'>${rank[0]}</p>
                    <p class='stats-titles white'>Rank</p>
                    <p class='stats dark-gray'>${record.totalCases.commaSplit()}</p>
                    <p class='stats-titles dark-gray'>Raw Total</p>
                </div>
                <div class='stats-column'>
                    <p class='prop-title-main red'>Deaths</p>
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
                <div id="chart"></div>
            </div>`;
    //CHART
    const loader = dynLoader('chartLoader');
    _('chart').appendChild(loader);
    const payload = { alpha2: alpha2, country: country, usOn: usOn };
    socket.emit('getLatestData', payload);
    if (!usOn) { fadeIn(_('chartLoader')); socket.emit('getCountryData', alpha2); }
    setTimeout(() => { addHeader(); }, 300);
    countryPopup.addEventListener('scroll', onCountryPopupScroll, false);
}
function onCountryPopupScroll() {
    if (window.innerWidth <= 768) {
        addHeader();
    }
}
function getYestData(payload, world, usa) {
    const dataset = (!usOn || usa) ? countriesList : usData;
    const percArray = [];
    const record = (world) ? dataAPI.find(data => data.country === "World") : sortList(dataset, 'newCases').find(data => data.country === payload.country);
    const propList = ['newCases', 'newDeaths'];
    propList.forEach(p => {
        const factor = (payload.latest[p] > 0) ? payload.latest[p] : 1;
        let value = ((record[p] - (payload.latest[p] || 0)) / factor) * 100;
        value = roundVal(value, 2);
        percArray.push(value);
    });
    return { perc: percArray[0], percDeaths: percArray[1] };
}
function addPercNew(perc, deaths) {
    const childNum = (deaths) ? 2 : 1;
    const cases = countryPopup.querySelector(`.flex-stats-container .stats-column-flex:nth-child(${childNum})`);
    if (cases.childElementCount === 5) {
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
}
function addPercNewWorld(perc) {
    const childNum = 0;
    const wrapper = worldStats.querySelectorAll(`.worldStats-flex`)[childNum];
    if (wrapper) {
        const div = wrapper.querySelector('.flex-stat');
        if (div) {
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
    }
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
    const dataset = (!usOn) ? countriesList : usData;
    const list = sortList(dataset, property);
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
            totalText = (!usOn) ? `
            <div class='flex-stat'>
                <p class='stats text-center font-vw'>${record.vaccines}</p>
                <p class='stats-titles dark-gray text-center'>Vaccines</p>
            </div> ` : '';
        }
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
    addPopupListeners();
    addZoomTapListeners();
    if (chartOn) { removeChartListeners(); removeGlobalChartListeners(); chartOn = false; }
    clearHighlights();
}
//US STATES COUNTRY POPUP
function declareUsZoomElems() {
    svgEl = _('usMap');
    zoomEl = _('gUsMap');
    VBWidth = 1362;
    VBHeight = 817;//767 + 50
    usSVG = parseSVG();
    fadeIn(svgEl);
    onResize();
    prevP = svgEl.createSVGPoint();
    touchTrail = svgEl.createSVGPoint();
    touchTrail.x = touchTrail.y = prevP.x = prevP.y = 0;
    if (is_touch_device) { touchEvents(true); }
}
function declareWorldZoomElems() {
    svgEl = _('worldMap');
    zoomEl = _('gOuter');
    VBWidth = 2000;
    VBHeight = 1051;//1001 + 50
    dataSVG = parseSVG();
    onResize();
    prevP = svgEl.createSVGPoint();
    touchTrail = svgEl.createSVGPoint();
    touchTrail.x = touchTrail.y = prevP.x = prevP.y = 0;
    if (is_touch_device) { touchEvents(true); }
}
function showUsMap() {
    usOn = true;
    appendUsStates();
}
function appendUsStates() {
    mapDiv.innerHTML = ``;
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "us.svg", false);
    // Following line is just to be on the safe side;
    // not needed if your server delivers SVG with correct MIME type
    xhr.overrideMimeType("image/svg+xml");
    xhr.onload = function (e) {
        // You might also want to check for xhr.readyState/xhr.status here
        if (onLoad) {
            mapDiv.appendChild(dynLoader('mapLoader'));
            fadeIn(_('mapLoader'));
        }
        mapDiv.appendChild(xhr.responseXML.documentElement);
        //console.log("US Map Loaded...");
        declareUsZoomElems();
    }
    xhr.send('');
}
function showWorldMap() {
    appendWorld();
}
function appendWorld() {
    mapDiv.innerHTML = ``;
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "world.svg", false);
    // Following line is just to be on the safe side;
    // not needed if your server delivers SVG with correct MIME type
    xhr.overrideMimeType("image/svg+xml");
    xhr.onload = function (e) {
        // You might also want to check for xhr.readyState/xhr.status here
        if (onLoad) {
            mapDiv.appendChild(dynLoader('mapLoader'));
        }
        mapDiv.appendChild(xhr.responseXML.documentElement);
        //console.log("World Map Loaded...");
        declareWorldZoomElems();
    }
    xhr.send('');
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
        hammertime.on('pinchend', onPinchEnd);
        hammertime.on('tap', onTapZoom);
        presstime.on('tap', onTapPopup);
        hammertime.on('press', onPress);
        hammertime.on('panstart', onPanStart);
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
        hammertime.off('pinchend', onPinchEnd);
        hammertime.off('tap', onTapZoom);
        presstime.off('tap', onTapPopup);
        hammertime.off('press', onPress);
        hammertime.off('panstart', onPanStart);
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
    const dataSet = (!usOn) ? countriesList : usData;
    const filtered = (!usOn) ? countryCodes.filter(row => row.name.toLowerCase().includes(search) || row.country.toLowerCase().includes(search) || row.alpha2.toLowerCase().includes(search) || row.alpha3.toLowerCase().includes(search)) : usSVG.filter(row => row.country.toLowerCase().includes(search));
    filtered.forEach(row => {
        const record = dataSet.find(country => country.country.toLowerCase() === row.country.toLowerCase());
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
    const svgList = (!usOn) ? dataSVG : usSVG;
    const path = svgList.find(path => path.path.getAttribute('data-name') === country);
    zoomToCountryNoAnim(path.path, true);
}
searchInput.addEventListener('keyup', function (e) {
    e.preventDefault();
    if (e.key != 'ArrowDown' && e.key != 'ArrowUp' && e.key != 'Enter' && e.key != 'ArrowLeft' && e.key != 'ArrowRight') {
        resultsWrapper.innerHTML = "";
        const dataset = (!usOn) ? countriesList : usData;
        if (dataset.length != 0) {
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
                        const svgList = (!usOn) ? dataSVG : usSVG;
                        const flagId = svgList.find(path => path.country === record.country).id;
                        const flagUrl = (flagId === 'ic') ? `images/ic.png` : (flagId === 'us-dc') ? `images/us-dc.png` : `https://flagcdn.com/h40/${flagId}.png`;
                        html += `
                            <div class='results-flex' data-country='${record.country}'>
                                <div class='bckg-img inline-flag' style='background-image:url(${flagUrl});'></div>
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
        globalInstructions.classList.remove('transform-y-260');
        globalHelpTip.style.top = (globalInstructions.classList.length > 1) ? "50px" : "70px";
    }
    else {
        if (window.innerWidth <= 768) {
            removeHeader();
        }
        globalInstructions.classList.add('transform-y-260');
    }
}
function onPinchEnd(e) {
    prevScale = 0;
}
function onTapZoom(e) {
    if (e.tapCount === 2 && !countryAnim) {
        if (window.innerWidth <= 768) {
            removeHeader();
        }
        globalInstructions.classList.add('transform-y-260');
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
function onPanStart(e) {
    popup.style.display = "none";
    touchTrail.x = touchTrail.y = prevP.x = prevP.y = 0;
    cancelAnimationFrame(fadeTouchPan);
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
    const dataset = (!usOn) ? countriesList : usData;
    if (dataset.find(data => data.country === country)) {
        popup.style.display = "none";
        clearLegendHover();
        cancelAnimationFrame(fadeTouchPan);
        zoomToCountry(e.target);
    }
}
function onDocTap(e) {
    if (e.tapCount >= 1) {
        if (e.target.parentNode != _('legendColors')) {
            clearLegendHover();
        }
        else if (e.target.parentNode != zoomEl) {
            popup.style.display = "none";
        }
    }
}
function touchEvents(newHammer) {
    //GLOBAL
    if (newHammer) { hammertime.off('doubletap').destroy(); presstime.off('doubletap').destroy(); }
    taptime = new Hammer(document);
    /*  document.addEventListener("touchmove", function(e){
         e.preventDefault();
         },{passive: false}); */
    //ZOOM
    hammertime = new Hammer(svgEl);
    hammertime.get('pinch').set({ enable: true });
    //PAN
    //PRESS FOR COUNTRY POPUP
    presstime = new Hammer(zoomEl);
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
    globalInstructions.classList.add('transform-y-260');
    globalHelpTip.style.top = "50px";
    if (mobileNav.classList.length === 0) {
        mobileNav.classList.add('transform-y-260');
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
        closeSideBar();
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
            height = '240px';//40 * 6 (number of menu options)
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
            title = 'Partially Vaccinated';
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
            const x = parseInt(switchCircle.getAttribute('cx'));
            const y = parseInt(switchCircle.getAttribute('cy'));
            const animCX = _('animateCX');
            const animCY = _('animateCY');
            animCX.setAttribute('from', x);
            animCX.setAttribute('to', 32);
            animCY.setAttribute('from', y);
            animCY.setAttribute('to', 32);
            animCX.beginElement();
            animCY.beginElement();
            animCX.addEventListener('endEvent', onAnimCXMid, false);
            animCY.addEventListener('endEvent', onAnimCYMid, false);
            const titles = switchToggle.querySelectorAll('.switch-titles');
            for (let i = 0; i < titles.length; i++) {
                titles[i].style.opacity = (titles[i].getAttribute('data-cat') === cat) ? 1 : 0.4;
            }
            currentData.style.backgroundColor = color;
            prop = toggleSwitchCases(cat).property;
            currentTitle = toggleSwitchCases(cat).title;
        }
    }
});
function onAnimCXMid(e) {
    this.removeEventListener('endEvent', onAnimCXMid);
    const cx = toggleSwitchCases(switchValue).cx;
    this.setAttribute('from', 32);
    this.setAttribute('to', cx);
    this.beginElement();
    this.addEventListener('endEvent', onAnimCXEnd);
}
function onAnimCYMid(e) {
    this.removeEventListener('endEvent', onAnimCYMid);
    const cy = toggleSwitchCases(switchValue).cy;
    this.setAttribute('from', 32);
    this.setAttribute('to', cy);
    this.beginElement();
    this.addEventListener('endEvent', onAnimCYEnd);
}
function onAnimCXEnd(e) {
    this.removeEventListener('endEvent', onAnimCXEnd);
    const cx = toggleSwitchCases(switchValue).cx;
    switchCircle.setAttribute('cx', cx);
}
function onAnimCYEnd(e) {
    this.removeEventListener('endEvent', onAnimCYEnd);
    const cy = toggleSwitchCases(switchValue).cy;
    switchCircle.setAttribute('cy', cy);
    const menu = toggleSwitchCases(switchValue).menu;
    removeLegendListeners();
    changeLegendColors(switchValue);
    handleOptionsMenu(menu);
    execProp();
    addLegendListeners();
    globalHelpTipHandler();
    if (dropDownOn) {
        const height = toggleSwitchCases(switchValue).height;
        optionsDiv.style.height = height;
    }
    statsWrapper.scrollTop = 0;
}
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
    dropDownOn = true;
}
function closeDropDown() {
    const toggle = _('dropDownArrow');
    optionsDiv.scrollTo(0, 0);
    optionsDiv.style.height = "39px";
    optionsDiv.style.overflowY = "hidden";
    toggle.classList.remove('transform-rotate');
    dropDownOn = false;
}
dropDown.addEventListener('click', (e) => {
    statsWrapper.style.overflowY = 'hidden';
    statsWrapper.removeEventListener('scroll', onStatsScroll);
    if (optionsDiv.style.height === "39px" || optionsDiv.style.height === "") {
        openDropDown();
    }
    else {
        closeDropDown();
    }
    setTimeout(() => {
        statsWrapper.style.overflowY = 'scroll';
        statsWrapper.addEventListener('scroll', onStatsScroll, false);
    }, 400);
    sideBar.className = '';
});
function dropDownSwitch(property) {
    let p = '';
    switch (property) {
        case 'casesPerMil':
            p = 'This is the reported total cumulative count of detected, laboratory, and sometimes (depending on the country reporting them and the criteria adopted at the time) also clinical cases. Depending on the country reporting standards, this number can also include presumptive, suspect, or probable cases of detected infection.';
            break;
        case 'newCasesPerMil':
            p = 'Every country reports their daily new cases at different times in the day. The daily data by all reporting countries resets every day after midnight GMT.';
            break;
        case 'percRecovered':
            p = 'This is the percent of cases that have recovered from the disease. This statistic is highly imperfect, because reporting can be missing, incomplete, incorrect, based on different definitions, or dated (or a combination of all of these) for many governments, both at the local and national level, sometimes with differences between states within the same country or counties within the same state. ';
            break;
        case 'percActive':
            p = 'This figure represents the current number of people detected and confirmed to be infected with the virus. This figure can increase or decrease, and represents an important metric for public health and emergency response authorities when assessing hospitalization needs versus capacity.';
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
            p = `The Case Fatality rate (CFR) represents the proportion of cases who eventually die from the disease. This statistic for each country is imperfect, since it is based on both the total number of reported cases and deaths, both of which depend on the respective countries' reporting criteria. Globally, the WHO has estimated the coronavirus' CFR at <strong>2%</strong>. For comparison, the CFR for SARS was <strong>10%</strong>, and for MERS <strong>34%</strong>.`;
            break;
        case 'percVacc':
            p = 'This is the percent of population that received at least one vaccine dose, but has <strong>NOT</strong> received all doses presribed by the vaccination protocol. This metric is not being made available by all reporting countries, so a 0 result does <strong>NOT</strong> necessarily mean there are no people vaccinated in the respective country.';
            break;
        case 'percFullyVacc':
            p = 'This is the percent of population that received <strong>ALL</strong> doses prescribed by the vaccination protocol. This metric is not being made available by all reporting countries, so a 0 result does <strong>NOT</strong> necessarily mean there are no people vaccinated in the respective country.';
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
    p.style.width = (is_touch_device) ? '300px' : '370px';
}
//DROPDOWN PROPERTIES
var bckColorLDM = "#3d3c3a";
var colorLDM = "#faebd7";
const buttons = document.querySelectorAll('button');
for (let i = 0; i < buttons.length; i++) {
    if (buttons[i].dataset.prop) {
        buttons[i].addEventListener('mouseup', function (e) {
            const dataset = (!usOn) ? countriesList : usData;
            if (dataset.length != 0) {//wait for countriesList to fill with data
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
                execProp();
                if (window.innerWidth <= 768) {
                    if (sideBar.classList.length > 0) {// handle when dropdown is open and fixed to top
                        statsWrapper.style.overflowY = 'hidden';
                        statsWrapper.removeEventListener('scroll', onStatsScroll);
                        sideBar.className = '';
                        setTimeout(() => {
                            closeSideBar();
                            statsWrapper.style.overflowY = 'scroll';
                            statsWrapper.addEventListener('scroll', onStatsScroll, false);
                        }, 400);
                    }
                    else { closeSideBar(); }
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
    if (st === lastScrollTop) { return; }//firefox bug firing scroll when height changes
    if (st <= 0) {
        sideBar.className = "";
        if (st > lastScrollTop) {// downscroll code
            sideBar.style.height = '100%';
        }
        else {
            setTimeout(() => {//avoid wheel action on svg map
                sideBar.style.height = '100%';
            }, 300);
        }
    }
    else {
        if (st > 500) {
            sideBar.className = 'transform-y-178';
            if (st > lastScrollTop) {// downscroll code
                sideBar.style.height = window.innerHeight + 178 + "px";//30(header) + 148(switchWrapper)
            }
            else {
                setTimeout(() => {
                    sideBar.style.height = window.innerHeight + 178 + "px";//30(header) + 148(switchWrapper)
                }, 300);
            }
        }
        else {
            sideBar.className = 'transform-y-30';
            if (st > lastScrollTop) {// downscroll code
                sideBar.style.height = window.innerHeight + 30 + "px";//30
            }
            else {
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
    const otherColor = (mode === 'dark') ? '#faebd7' : '#000';
    _('worldBtn').style.color = (!usOn) ? mapColor : otherColor;
    _('usBtn').style.color = (usOn) ? mapColor : otherColor;
    _('aboutBtn').style.color = otherColor;
    _('worldBtnMobile').style.color = (!usOn) ? mapColor : otherColor;
    _('usBtnMobile').style.color = (usOn) ? mapColor : otherColor;
    _('aboutBtnMobile').style.color = otherColor;
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
        mobileNav.classList.remove('transform-y-260');
    }
    else {
        mobileNav.classList.add('transform-y-260');
    }
    hamburger.classList.toggle('change');
    popup.style.display = "none";
});
//MOBILE SEARCH WRAPPER
function showSearch() {
    if (window.innerWidth <= 768) {
        if (searchWrapper.classList.length === 1) { expandSearch(); }
        else { collapseSearch(); onCloseSearch(); }
    }
    else { searchInput.focus(); }
}
function expandSearch() {
    const color = (mode === 'dark') ? '#282828' : '#e6e6e6';
    searchWrapper.classList.add('flex-1');
    closeSearch.style.display = "block";
    searchInput.style.visibility = "visible";
    searchWrapper.style.backgroundColor = color;
    searchWrapper.style.marginRight = "45px";
    headerTitle.style.display = "none";
}
function collapseSearch() {
    searchWrapper.classList.remove('flex-1');
    closeSearch.style.display = "none";
    searchInput.style.visibility = "hidden";
    searchWrapper.style.backgroundColor = "transparent";
    searchWrapper.style.marginRight = "30px";
    setTimeout(() => {
        headerTitle.style.display = "block";
    }, 300);
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
    closePopup.setAttribute('data-alpha2', '');
    closePopup.setAttribute('data-country', '');
    setTimeout(() => {
        countryPopup.classList.add('transform');
        closePopup.style.marginLeft = "-30px";
        countryPopup.style.overflow = '';
        countryPopup.innerHTML = '';
    }, 10);
    setTimeout(() => {
        closePopup.style.visibility = 'hidden';
        resultsTransform();
    }, 500);
}
function setPrevMapState() {
    const transform = `matrix(${prevMatrix.scale}, 0, 0, ${prevMatrix.scale}, ${prevMatrix.x}, ${prevMatrix.y})`;
    zoomEl.setAttributeNS(null, 'transform', transform);
    pathStrokeHandler();
}
//PAGE SWITCHING
function onWorldPage() {
    if (chartOn) { removeChartListeners(); removeGlobalChartListeners(); chartOn = false; }
    removeZoomTapListeners();
    removePopupListeners();
    clearPopup();
    showWorldMap();
    addZoomTapListeners();
    addPopupListeners();
    showPage();
    if (usOn) { usOn = false; }
    reassignProp();
}
function onUsPage() {
    if (chartOn) { removeChartListeners(); removeGlobalChartListeners(); chartOn = false; }
    removeZoomTapListeners();
    removePopupListeners();
    clearPopup();
    showUsMap();
    addZoomTapListeners();
    addPopupListeners();
    showPage();
    reassignProp();
}
document.querySelectorAll('.menu-btns').forEach(btn => {
    btn.addEventListener('mouseup', onMenuBtn, false);
});
function onMenuBtn(e) {
    e = (e) ? this : (window.innerWidth <= 768) ? _('usBtnMobile') : _('usBtn');
    mobileNav.classList.add('transform-y-260');
    hamburger.classList.remove('change');
    let attr = e.dataset.link;
    const thisColor = (mode === 'dark') ? '#54cbf2' : '#9c9c9c';
    const otherColor = (mode === 'dark') ? '#faebd7' : '#000';
    document.querySelectorAll('.menu-btns').forEach(item => {
        item.style.color = otherColor;
    });
    e.style.color = thisColor;
    if (attr === "about") {
        if (chartOn) { removeChartListeners(); removeGlobalChartListeners(); chartOn = false; }
        removeZoomTapListeners();
        removePopupListeners();
        clearPopup();
        onResize();
        clearPage();
        about.style.display = "block";
    }
    else if (attr === 'us') {
        onUsPage();
        about.style.display = "none";
    }
    else {
        onWorldPage();
        about.style.display = "none";
    }
    clearHighlights();
    onCloseSearch();
    popup.style.display = "none";
}
//LOADER
function dynLoader(id) {
    var loader;
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "loader.svg", false);
    xhr.overrideMimeType("image/svg+xml");
    xhr.onload = function (e) {
        loader = xhr.responseXML.documentElement;
        loader.setAttribute('id', id);
    }
    xhr.send('');
    return loader;
}
//FADE IN/FADE OUT
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