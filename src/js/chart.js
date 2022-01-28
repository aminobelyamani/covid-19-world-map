import { _, fadeOut, createEl, fadeIn, createSVGEl, floorVal, formatDate, roundVal } from "./exports/global.js";
import { chartInfoSwitch, chartPropSwitch } from "./exports/switches.js";
import { closePopup, countryPopup, is_touch_device, usOn } from "./main.js";
import { sidebartime } from "./panzoom.js";

var ratio = 1,
    yListLength = 1,
    headerHeight = 0,
    firstXTextWidth = 0,
    lastXTextWidth = 0,
    xTextPadding = 20,
    initialX = 0,
    dataHist = [],
    chartArray = [],
    propArr = [],
    propTitle = [],
    xyPlots = [],
    currentProp;

export var chartOn = false;

export function setChartOn(val) {
    chartOn = val;
}

export function fetchChartData(alpha2) {
    fetch(`/chart-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alpha2, usOn })
    })
        .then(function (result) { return result.json() })
        .then(function (data) {
            if (!data) { return onNoFetchData(); }
            if (closePopup.getAttribute('data-alpha2').toLowerCase() === data.country.toLowerCase() || closePopup.getAttribute('data-country').toLowerCase() === data.country.toLowerCase()) { onChartData(data); }//in case they left page before fetch response
        });
}
function onChartData(data) {
    removeLoader();
    var chart = _('chart');
    chart.className = 'chart-change';
    initChart(data);
}
function onNoFetchData() {
    chartOn = false;
    const chartWrapper = _('chart');
    if (_('chartLoader')) { fadeOut(_('chartLoader')); }
    chartWrapper.innerHTML = "<h2 class='chart-no-data yellow-test'>NO CHART DATA</h2>";
}
function removeLoader() {
    var loader = _('chartLoader');
    if (!loader) { return; }
    loader.classList.add('no-display');
}

//INITIALIZE
async function initChart(data) {
    if (chartOn) { removeChartListeners(); removeGlobalChartListeners(); }
    dataHist = data.data;
    propArr = ['new_cases_smoothed'];
    currentProp = 'new_cases_smoothed';
    propTitle = ['Daily Cases'];
    chartArray = await createChartArray(dataHist, currentProp);
    makeChartDiv();
    addGlobalChartListeners();
    if (chartArray.length === 0) { return onNoChartData(); }
    makeChart(chartArray, propArr, propTitle);
    addChartListeners();
    chartOn = true;
}
function createChartArray(data, property) {
    return new Promise(resolve => {
        const list = [];
        let payload;
        data.forEach(d => {
            if (d.hasOwnProperty(property)) {
                payload = { date: d.date, [property]: d[property] };
                list.push(payload);
            }
        });
        if (getMax(list, property) === 0) { list.length = 0; }
        resolve(list);
    });
}
function getMax(data, property) {
    const list = getDataList(data, property);
    return Math.max.apply(null, list);
}
function getDataList(data, property) {
    const list = data.map(item => {
        item[property] = (item[property] >= 0) ? item[property] : null;
        return item[property];
    });
    return list;
}

//CREATE CHART WRAPPER
function makeChartDiv() {
    var chart = _('chart');
    const header = createEl('div', 'chart-header');
    const h2 = createEl('h2', '');
    const helpTip = createEl('button', 'help-tip-chart help-tip-stats help-tip');
    const tip = createEl('p', '');
    helpTip.append(tip);
    const chartInfo = createEl('div', 'chart-info');
    const infoP = createEl('p', '');
    chartInfo.append(infoP);
    header.append(h2);
    header.append(helpTip);
    header.append(chartInfo);
    header.append(appendOptions());
    chart.append(header);
    chart.append(appendSVGChart());
}
function appendOptions() {
    const wrapper = createEl('div', 'chart-options-wrapper ease-out');
    wrapper.append(appendDropDown());
    wrapper.append(appendDropDownOptions());
    return wrapper;
}
function appendDropDown() {
    const dropDown = createEl('div', 'chart-dropdown');
    const span1 = createEl('span', 'flex-span chart-option-title');
    const span2 = createEl('span', 'flex-span bckg-sprite dropDown-arrow chart-option-arrow');
    span1.innerText = 'Daily Cases';
    dropDown.append(span1);
    dropDown.append(span2);
    return dropDown;
}
function appendDropDownOptions() {
    const globalTitles = (!usOn) ? ['Daily Cases', 'ICU Patients', 'Daily Deaths', 'Vaccinations', 'Stringency Index'] : ['Daily Cases', 'Daily Deaths', 'Vaccinations'];
    const globalProps = (!usOn) ? ['new_cases_smoothed', 'icu_patients', 'new_deaths_smoothed', 'new_vaccinations_smoothed', 'stringency_index'] : ['new_cases_smoothed', 'new_deaths_smoothed', 'new_vaccinations_smoothed'];
    const options = createEl('div', 'chart-menu');
    globalProps.forEach((p, index) => {
        if (p === 'stringency_index' && usOn) { return; }
        const button = createEl('button', 'chart-btns');
        button.setAttribute('type', 'button');
        button.setAttribute('data-chartprop', p);
        button.innerText = globalTitles[index];
        options.append(button);
    });
    return options;
}
function appendSVGChart() {
    const svg = createSVGEl('svg', '');
    svg.setAttribute('id', 'svgChart');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    return svg;
}

//RENDER CHART
async function makeChart(data, props, titles) {
    const newObj = makePropList(data, props, titles);
    propArr = newObj.props;
    propTitle = newObj.titles;
    updateChartInfo(propArr, propTitle);
    const bounds = await getXYAxisBounds(data);
    await makeXYAxis(bounds);
    plotData(data);
    appendHoverG();
}
function makePropList(data, props, titles) {
    const nullProps = props.filter(prop => getMax(data, prop) === 0);
    nullProps.forEach(p => {
        const index = props.findIndex(prop => prop === p);
        props.splice(index, 1);
        titles.splice(index, 1);
    });
    return { props, titles };
}
function updateChartInfo(props, titles) {
    var chart = _('chart');
    const helpTip = chart.querySelector('.chart-header .help-tip');
    const h2 = chart.querySelector('h2');
    const chartInfo = chart.querySelector('.chart-info')
    const info = chartInfo.querySelector('p');
    const text = (props.length === 0) ? 'NO DATA' : titles[0];
    const infoTexts = chartInfoSwitch(props[0]);
    const infoText = infoTexts.infoText;
    const helpText = infoTexts.helpTip;
    if (props.length > 0 && (currentProp === 'stringency_index' || currentProp === 'new_vaccinations_smoothed')) {
        helpTip.innerHTML = helpText;
        if (helpTip.classList.contains('no-display')) { fadeIn(helpTip); }
    }
    else {
        helpTip.classList.add('no-display');
        helpTip.style.opacity = 0;
    }
    info.innerText = (props.length > 0) ? infoText : '';
    const color = chartPropSwitch(currentProp);
    h2.style.color = color;
    h2.innerText = `CHART: ${text}`;
    adjustChartHeight();
}
function adjustChartHeight() {
    var chart = _('chart');
    const svg = _('svgChart');
    const header = chart.querySelector('.chart-header');
    const menu = header.querySelector('.chart-options-wrapper');
    const height = (!usOn) ? 180 : 120;
    headerHeight = (menu.style.height === `${height}px`) ? header.offsetHeight - (height - 30) : header.offsetHeight;//subtract 30 less than menu height (30 is dropdown height) when dropdown menu is open to avoid negative yBound values
    svg.setAttribute('style', `height:calc(100% - ${headerHeight}px)`);
    svg.style.top = headerHeight + 'px';
}
function getXYAxisBounds(data) {
    return new Promise(resolve => {
        const yList = getYList(data);
        yListLength = yList.length;
        const xList = getXList(data);
        const firstLast = getFirstLastXWidth(xList.xList[0], xList.xList[xList.xList.length - 1]);
        firstXTextWidth = getMaxTextWidth(yList[yList.length - 1], firstLast.firstX);
        lastXTextWidth = firstLast.lastX;
        initialX = firstXTextWidth + 10;
        const bounds = getBoundValues();
        resolve({ xList, yList, bounds });
    });
}
function getYList(data) {
    const yList = [];
    const maxList = [];
    for (let i = 0; i < propArr.length; i++) {
        maxList.push(getMax(data, propArr[i]));
    }
    let max = Math.max.apply(null, maxList);
    let numLength = Math.log(max) * Math.LOG10E + 1 | 0;;
    max = (numLength > 0) ? floorVal(max, -(numLength - 2)) : 1;
    ratio = max / 5;
    max = Math.max(max, 1);//avoid 0 or negative number
    numLength = Math.log(ratio) * Math.LOG10E + 1 | 0;
    ratio = ratio / Math.pow(10, numLength - 1);
    if (ratio >= 1 && ratio <= 1.5) { ratio = 1; }//1 first digit
    else if (ratio > 1.5 && ratio < 4) { ratio = 2; }//2 first digit
    else if (ratio >= 4 && ratio <= 7.5) { ratio = 5; }//5 first digit
    else if (ratio > 7.5 && ratio < 10) { ratio = 10; }//10 first digit}
    ratio = ratio * Math.pow(10, numLength - 1);
    ratio = (ratio > 0) ? ratio : 1;
    let value = 0;
    while (value <= max) {
        const roundedValue = floorVal(value, 1).commaSplit();
        yList.push(roundedValue);
        value += ratio;
    }
    return yList;
}
function getXList(data) {
    const xList = [];
    const length = data.length;
    const factor = (length > 1) ? Math.floor(length / 2) : 1;
    const numXElems = (window.innerWidth > 768) ? Math.min(6, factor) : Math.min(3, factor);
    const xIncrFactor = Math.floor(length / numXElems);
    const dateFormat = (window.innerWidth > 768) ? false : true;
    for (let i = 0; i <= numXElems; i++) {
        const date = (i === numXElems) ? formatDate(data[length - 1].date, dateFormat) : (i === 0) ? formatDate(data[0].date, dateFormat) : formatDate(data[i * xIncrFactor].date, true);
        xList.push(date);
    }
    return { xList, xIncrFactor };
}
function getFirstLastXWidth(first, last) {
    const chart = _('svgChart');
    const elem1 = createSVGEl('g', 'no-visibility');
    const elem2 = createSVGEl('g', 'no-visibility');
    elem1.innerHTML = `<text class='chart-text' x='0', y='0' fill="none" dominant-baseline='middle' text-anchor='middle'>${first}</text>`;
    elem2.innerHTML = `<text class='chart-text' x='0', y='0' fill="none" dominant-baseline='middle' text-anchor='middle'>${last}</text>`;
    chart.appendChild(elem1);
    chart.appendChild(elem2);
    const firstX = Math.ceil(elem1.getBBox().width);
    const lastX = Math.ceil(elem2.getBBox().width) / 2;
    chart.removeChild(elem1);
    chart.removeChild(elem2);
    return { firstX, lastX };
}
function getMaxTextWidth(lastY, firstX) {
    const chart = _('svgChart');
    const elem = createSVGEl('g', 'no-visibility');
    elem.innerHTML = `<text class='chart-text' x='0', y='0' fill="none" dominant-baseline='middle' text-anchor='end'>${lastY}</text>`;
    chart.appendChild(elem);
    const maxWidth = Math.ceil(elem.getBBox().width);
    firstX = Math.max(maxWidth, firstX / 2);
    chart.removeChild(elem);
    return firstX;
}
function getBoundValues() {
    const chartWrapper = _('chart');
    const yBound = chartWrapper.offsetHeight - 80 - headerHeight, //20 top padding + 60(20 + extra 40 for xList) bottom padding
        xBound = chartWrapper.offsetWidth - 40 - lastXTextWidth;//20 padding on both sides
    const bounds = {
        yBound,
        xBound,
        yIncr: yBound / yListLength - 1,//nuber of y data-ranges - 1
        xIncr: (xBound - initialX) / (chartArray.length - 1)//number of data plots - 1
    }
    return bounds;
}
//X & Y AXIS
function makeXYAxis(data) {
    return new Promise(resolve => {
        const xList = data.xList.xList;
        const yList = data.yList;
        const xBound = data.bounds.xBound;
        const yBound = data.bounds.yBound;
        let xPlot = initialX;
        let yPlot = yBound;
        const xIncr = data.bounds.xIncr * data.xList.xIncrFactor;
        const yIncr = data.bounds.yIncr;
        const chart = _('svgChart');
        const elemX = createSVGEl('g', 'x-axis');
        const elemY = createSVGEl('g', 'y-axis');
        const lines = createSVGEl('g', 'horizontal-lines');
        for (let i = 0; i < xList.length; i++) {//x-axis labels
            if (i === xList.length - 1) {
                elemX.append(appendAxisText(xBound, yBound, xList[i]));
                elemX.append(appendXLine(xBound, yBound));
            }
            else {
                elemX.append(appendAxisText(xPlot, yBound, xList[i]));
                elemX.append(appendXLine(xPlot, yBound));
            }
            xPlot += xIncr;
        }
        for (let i = 0; i < yList.length; i++) {//y-axis labels + horizontal gridlines
            elemY.append(appendAxisText(firstXTextWidth, yPlot - xTextPadding, yList[i], true));
            if (i === 0) { lines.append(appendHorizLine(firstXTextWidth, xBound, yPlot)); }
            else { lines.append(appendHorizLine(firstXTextWidth, xBound, yPlot, true)); }
            yPlot -= yIncr;
        }
        chart.append(elemX);
        chart.append(elemY);
        chart.append(lines);
        resolve();
    });
}
function appendAxisText(xBound, yBound, val, onYAxis) {
    const text = createSVGEl('text', 'chart-text');
    text.setAttribute('x', xBound);
    text.setAttribute('y', yBound + xTextPadding);
    text.setAttribute('dominant-baseline', 'middle');
    const anchor = (onYAxis) ? 'end' : 'middle';
    text.setAttribute('text-anchor', anchor);
    text.innerHTML = val;
    return text;
}
function appendXLine(xBound, yBound) {
    const line = createSVGEl('line', 'chart-lines');
    line.setAttribute('x1', xBound);
    line.setAttribute('x2', xBound);
    line.setAttribute('y1', yBound);
    line.setAttribute('y2', yBound + 4);
    return line;
}
function appendHorizLine(x1, x2, y, onDashed) {
    const line = createSVGEl('line', 'chart-horiz-lines');
    line.setAttribute('x1', x1 + 10);
    line.setAttribute('x2', x2);
    line.setAttribute('y1', y);
    line.setAttribute('y2', y);
    if (onDashed) { line.setAttribute('stroke-dasharray', '3,2'); }
    return line;
}
//PLOT DATA
function plotData(data) {
    xyPlots = [];//reinitialize array on resize/reset
    const points = [];
    const bounds = getBoundValues();
    const yBound = bounds.yBound;
    const xBound = bounds.xBound;
    const yRatio = bounds.yIncr;
    const xIncr = bounds.xIncr;
    let xPlot = initialX;
    let yPlot = 0;
    const prop = propArr[0];
    for (let i = 0; i < data.length; i++) {
        yPlot = (data[i][prop] != null) ? yBound - ((data[i][prop] / ratio) * yRatio) : null;
        const value = (data[i][prop] != null) ? data[i][prop] : null;
        xyPlots.push({ x: xPlot, y: yPlot, date: data[i].date, value });
        if (yPlot !== null) { points.push(`${xPlot}, ${yPlot}`); }
        xPlot += xIncr;
    }
    const color = chartPropSwitch(currentProp);
    const chart = _('svgChart');
    const plotEl = createSVGEl('g', 'plot-lines');
    plotEl.innerHTML = `
        <rect id='plotRect' x='${initialX}' y='${0}' width='${xBound - initialX}' height='${yBound}' fill='#000' opacity='0'></rect>
        <polyline class='polyline' stroke='${color}' points='${points}'></polyline>`;
    chart.appendChild(plotEl);
}

//GLOBAL LISTENERS
function addGlobalChartListeners() {
    const chartWrapper = _('chart');
    const btns = chartWrapper.querySelectorAll('.chart-btns');
    btns.forEach(btn => { btn.addEventListener('click', onChartOptClick, false); });
    const menu = chartWrapper.querySelector('.chart-dropdown');
    menu.addEventListener('click', onChartDropDown, false);
}
export function removeGlobalChartListeners() {
    const chartWrapper = _('chart');
    const btns = chartWrapper.querySelectorAll('.chart-btns');
    btns.forEach(btn => { btn.removeEventListener('click', onChartOptClick); });
    const menu = chartWrapper.querySelector('.chart-dropdown');
    menu.removeEventListener('click', onChartDropDown);
}

//CHART LISTENERS
var charttime;
function addChartListeners() {
    const chart = _('svgChart');
    if (is_touch_device) {
        charttime = new Hammer(chart);
        sidebartime.get('pan').set({ direction: Hammer.DIRECTION_HORIZONTAL });
        charttime.on('pan', onChartMove);
        charttime.on('tap', onChartMove);
    }
    else { document.addEventListener('mousemove', onChartMove, false); }
    window.addEventListener("resize", resetChart, false);
}
export function removeChartListeners() {
    if (is_touch_device) {
        charttime.off('pan').destroy();
        charttime.off('tap').destroy();
    }
    else { document.removeEventListener('mousemove', onChartMove); }
    window.removeEventListener("resize", resetChart);
}

//DROPDOWN LISTENERS
function onChartDropDown() {
    const menu = _('chart').querySelector('.chart-options-wrapper');
    if (menu.style.height === '30px' || menu.style.height === '') { openChartDropDown(); }
    else { closeChartDropDown(); }
}
function openChartDropDown() {
    const toggle = _('chart').querySelector('.chart-option-arrow');
    const menu = _('chart').querySelector('.chart-options-wrapper');
    const height = (!usOn) ? '180px' : '120px';
    menu.style.height = height;
    toggle.classList.add('transform-rotate');
}
function closeChartDropDown() {
    const toggle = _('chart').querySelector('.chart-option-arrow');
    const menu = _('chart').querySelector('.chart-options-wrapper');
    menu.style.height = '30px';
    toggle.classList.remove('transform-rotate');
}
async function onChartOptClick(e) {
    const text = this.innerText;
    const prop = this.getAttribute('data-chartprop');
    if (currentProp != prop) {
        currentProp = prop;
        propArr = [], propTitle = [];
        propArr.push(prop);
        propTitle.push(text);
        chartArray = await createChartArray(dataHist, currentProp);
        resetChart();
        const title = _('chart').querySelector('.chart-option-title');
        title.innerText = text;
        closeChartDropDown();
    }
}

//RESET CHART
function resetChart() {
    const chartWrapper = _('chart');
    if (chartOn) { removeChartListeners(); removeChart(); }
    countryPopup.scrollTop = chartWrapper.offsetTop - 5;
    if (chartArray.length === 0) { return onNoChartData(); }
    chartWrapper.className = 'chart-change';
    chartOn = true;
    makeChart(chartArray, propArr, propTitle);
    addChartListeners();
}
function onNoChartData() {
    const chartWrapper = _('chart');
    chartWrapper.className = 'chart-change-nodata';
    chartOn = false;
    propArr = [];
    propTitle = [];
    updateChartInfo(propArr, propTitle);
}
function removeChart() {
    const chartWrapper = _('chart');
    const chart = _('svgChart');
    chart.querySelectorAll('g').forEach(g => { chart.removeChild(g); });
    const popup = chartWrapper.querySelector('.chart-popup');
    chartWrapper.removeChild(popup);
}

//CHART HOVER
function appendHoverG() {
    const chartWrapper = _('chart');
    const chart = _('svgChart');
    const hoverInfo = createSVGEl('g', 'hover-info no-display');
    const color = chartPropSwitch(currentProp);
    hoverInfo.innerHTML = `<line class='hover-line' x1="0" x2="0" y1="0" y2="${getBoundValues().yBound}" stroke-width='1px'></line>
    <circle class='hover-dot' cx="0" cy="0" r="5" fill='${color}' style='visibility:hidden;'></circle>`;
    const toolEl = createEl('div', 'chart-popup no-display');
    chart.appendChild(hoverInfo);
    chartWrapper.appendChild(toolEl);
}
function onChartMove(e) {
    e = e || window.event;
    const offX = (!is_touch_device) ? e.layerX : e.srcEvent.layerX;
    const offY = (!is_touch_device) ? e.layerY : e.srcEvent.layerY;
    const target = (!is_touch_device) ? e.target : e.srcEvent.target;
    const chartWrapper = _('chart');
    const chart = _('svgChart');
    const hoverInfo = chart.querySelector('.hover-info');
    const line = chart.querySelector('.hover-line');
    const dot = chart.querySelector('.hover-dot');
    const toolEl = chartWrapper.querySelector('.chart-popup');
    const rect = _('plotRect');
    if (target === rect && offX >= initialX && offX <= getBoundValues().xBound && offY >= 0 && offY <= getBoundValues().yBound) {
        const xGap = getBoundValues().xIncr;
        const record = xyPlots.find(point => Math.abs(point.x - offX) <= xGap / 2);
        if (record) {
            hoverInfo.classList.remove('no-display');
            toolEl.classList.remove('no-display');
            line.setAttribute('x1', record.x);
            line.setAttribute('x2', record.x);
            const cy = (record.y != null) ? record.y : 0;
            const visib = (record.y != null) ? 'visible' : 'hidden';
            dot.setAttribute('cx', record.x);
            dot.setAttribute('cy', cy);
            dot.style.visibility = visib;
            popupHtml(record, toolEl);
            const xLimit = record.x + toolEl.offsetWidth + 10;
            const x = (xLimit > getBoundValues().xBound + lastXTextWidth) ? record.x - toolEl.offsetWidth + 15 + 'px' : record.x + 25 + 'px';
            const y = (window.innerWidth > 768) ? headerHeight + 70 + 'px' : headerHeight + 30 + 'px';//20 top padding + 50 extra
            toolEl.setAttribute('style', `-o-transform: translate(${x}, ${y}); -moz-transform: translate(${x}, ${y}); -ms-transform: translate(${x}, ${y}); -webkit-transform: translate(${x}, ${y}); transform: translate(${x}, ${y}); display: block;`);
        }
    }
    else {
        hoverInfo.classList.add('no-display');
        toolEl.classList.add('no-display');
    }
}
function popupHtml(record, el) {
    el.innerHTML = '';
    const color = chartPropSwitch(currentProp);
    el.append(appendPopupP('chart-popup-date', formatDate(record.date)));
    if (record.value === null) { return el.append(appendPopupP('chart-popup-text', 'No Data')); }
    record.value = roundVal(record.value, 2);
    const propPrefix = (propTitle[0] === 'Vaccinations') ? 'Daily' : '';
    const wrapper = createEl('div', 'chart-popup-wrapper');
    const flex1 = appendPopupFlex();
    const flex2 = appendPopupFlex();
    flex1.append(appendPopupCircle(color));
    flex1.append(appendPopupP('chart-popup-text', `${propPrefix} ${propTitle[0]}`));
    flex2.append(appendPopupP('chart-popup-num', record.value.commaSplit()));
    wrapper.append(flex1);
    wrapper.append(flex2);
    el.append(wrapper);
}
function appendPopupFlex() {
    const div = createEl('div', 'chart-popup-flex');
    return div;
}
function appendPopupP(classes, value) {
    const p = createEl('p', classes);
    p.innerText = value;
    return p;
}
function appendPopupCircle(color) {
    const svg = createSVGEl('svg', 'chart-popup-circle');
    const circle = createSVGEl('circle', '');
    circle.setAttribute('cx', '5');
    circle.setAttribute('cy', '7');
    circle.setAttribute('r', '5');
    circle.setAttribute('fill', color);
    svg.append(circle);
    return svg
}