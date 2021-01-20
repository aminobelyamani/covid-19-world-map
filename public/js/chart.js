var propArr = [];
var propTitle = [];
var ratio = 1,
    yListLength = 1,
    headerHeight = 0,
    firstXTextWidth = 0,
    labelMaxWidth = 0,
    xTextPadding = 20,
    xyPlots,
    initialX = 0,
    dataHist = [];

function makePropList(data) {
    const nullProps = propArr.filter(prop => getMax(data, prop) === 0);
    nullProps.forEach(p => {
        const index = propArr.findIndex(prop => prop === p);
        propArr.splice(index, 1);
        propTitle.splice(index, 1);
    });
    const checkBox = _('testsCheckBox');
    const wrapper = _('testsCheckBoxWrapper');
    if(propArr.length === 0){
        checkBox.disabled = true; 
        wrapper.style.opacity = '0.5';
    }
    if(propArr.length > 0 && (propArr[0].includes('cases') || propArr[0].includes('deaths'))){
        const testProp = testsSwitch(propArr[0]).testProp;
        if (getMax(data, testProp) === 0){
            checkBox.disabled = true;
            wrapper.style.opacity = '0.5';
        }
        else{
            checkBox.disabled = false;
            wrapper.style.opacity = '1';
        }
    }
    return propArr.length;
}
function getMax(data, property) {
    const list = getDataList(data, property);
    const max = Math.max.apply(null, list);
    return max;
}
function getDataList(data, property) {
    const list = data.map(item => {
        item[property] = (item[property] >= 0) ? item[property] : null;
        return item[property];
    });
    return list;
}
function roundVal(value, precision) {
    const multiplier = Math.pow(10, precision || 0);
    return Math.ceil(value * multiplier) / multiplier;
}
function floorVal(value, precision) {
    const multiplier = Math.pow(10, precision || 0);
    return Math.floor(value * multiplier) / multiplier;
}
function getYList(data) {
    const yList = [];
    const maxList = [];
    for (let i = 0; i < propArr.length; i++) {
        maxList.push(getMax(data, propArr[i]));
    }
    maxList.sort((a, b) => (a < b) ? 1 : -1);//sort by increasing value
    let max = Math.max.apply(null, maxList);
    let numLength = Math.log(max) * Math.LOG10E + 1 | 0;;
    max = (numLength > 0) ? floorVal(max, -(numLength - 2)) : 1;
    ratio = max / 5;
    max = (max > 0) ? max : 1;
    numLength = Math.log(ratio) * Math.LOG10E + 1 | 0;
    ratio = ratio / Math.pow(10, numLength - 1);
    if (ratio >= 1 && ratio <= 1.5) {//1 first digit
        ratio = 1;
    }
    else if (ratio > 1.5 && ratio < 4) {//2 first digit
        ratio = 2;
    }
    else if (ratio >= 4 && ratio <= 7.5) {//5 first digit
        ratio = 5;
    }
    else if (ratio > 7.5 && ratio < 10) {//10 first digit
        ratio = 10;
    }
    ratio = ratio * Math.pow(10, numLength - 1);
    let value = 0;
    ratio = (ratio > 0) ? ratio : 1;
    while (value <= max) {
        let roundedValue = floorVal(value, 1).commaSplit();
        yList.push(roundedValue);
        value += ratio;
    }
    yListLength = yList.length;
    return yList;
}
function getXList(data) {
    const xList = [];
    let value = '';//string for dates
    const length = data.length;
    const numXElems = (window.innerWidth > 768) ? 6 : 3;
    const xIncrFactor = Math.floor(length / numXElems);
    for (i = 0; i <= numXElems; i++) {
        value = (i === numXElems) ? formatDate(data[data.length - 1].date) : (i === 0) ? formatDate(data[i * xIncrFactor].date) : formatDate(data[i * xIncrFactor].date, true);
        xList.push(value);
    }
    const chart = _('svgChart');
    const elem = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    elem.setAttribute('style', 'visibility:hidden');
    let html = `<text class='chart-text' x='0', y='0' fill="none" dominant-baseline='middle' text-anchor='end'>${xList[0]}</text>`;
    elem.innerHTML = html;
    chart.appendChild(elem);
    firstXTextWidth = Math.ceil(elem.getBBox().width);
    return { xList: xList, xIncrFactor: xIncrFactor };
}
function getTextWidth(yList) {
    const chart = _('svgChart');
    const elem1 = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    const elem2 = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    elem1.setAttribute('style', 'visibility:hidden');
    elem2.setAttribute('style', 'visibility:hidden');
    let html1 = `<text class='chart-text' x='0', y='0' fill="none" dominant-baseline='middle' text-anchor='end'>${yList[yList.length - 1]}</text>`;
    let html2 = `<text class='chart-text' x='0', y='0' fill="none" dominant-baseline='middle' text-anchor='middle'>Stringency Index</text>`;
    elem1.innerHTML = html1;
    elem2.innerHTML = html2;
    chart.appendChild(elem1);
    chart.appendChild(elem2);
    const maxWidth = Math.ceil(elem1.getBBox().width);
    labelMaxWidth = Math.ceil(elem2.getBBox().width) + 10;//10px for position of first xPlot
    firstXTextWidth = Math.max(maxWidth, firstXTextWidth / 2);
    chart.removeChild(elem1);
    chart.removeChild(elem2);
    return firstXTextWidth;
}
function getBoundValues() {
    const chartWrapper = _('chart');
    const yBound = chartWrapper.offsetHeight - 80 - headerHeight, //20 top padding + 60(20 + extra 40 for xList) bottom padding
        xBound = chartWrapper.offsetWidth - 40 - labelMaxWidth;//20 padding on both sides
    const bounds = {
        yBound: yBound,
        xBound: xBound,
        yIncr: yBound / yListLength - 1,//nuber of y data-ranges - 1
        xIncr: (xBound - initialX) / dataHist.length
    }
    return bounds;
}
function makeXYAxis(data) {
    const chart = _('svgChart');
    const yList = getYList(data);
    const xList = getXList(data).xList;
    const elemY = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    const elemX = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    const elemLines = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    elemY.setAttribute('class', 'y-axis');
    elemX.setAttribute('class', 'x-axis');
    elemLines.setAttribute('class', 'horizontal-lines');
    const maxWidth = getTextWidth(yList);
    const yBound = getBoundValues().yBound;
    const xBound = getBoundValues().xBound;
    let yPlot = yBound;
    let xPlot = maxWidth + 10;
    initialX = xPlot;
    const xIncr = getBoundValues().xIncr * getXList(data).xIncrFactor;
    const yIncr = getBoundValues().yIncr;
    let yText = '', yLines = '', xText = '';
    for (let i = 0; i < yList.length; i++) {//y-axis labels + horizontal gridlines
        yText += `<text class='chart-text' x='${maxWidth}', y='${yPlot}' dominant-baseline='middle' text-anchor='end'>${yList[i]}</text>`;
        yLines += (i === 0) ? `<line class='chart-horiz-lines' x1="${maxWidth + 10}" x2="${xBound - getBoundValues().xIncr}" y1="${yPlot}" y2="${yPlot}"></line>` : `<line class='chart-horiz-lines' x1="${maxWidth + 10}" x2="${xBound - getBoundValues().xIncr}" y1="${yPlot}" y2="${yPlot}" stroke-dasharray='3,2'></line>`;
        yPlot -= yIncr;
    }
    for (let i = 0; i < xList.length; i++) {//x-axis labels
        xText += (i === xList.length - 1) ? `
            <text class='chart-text' x='${xBound - getBoundValues().xIncr}', y='${yBound + xTextPadding}' dominant-baseline='middle' text-anchor='middle'>${xList[i]}</text>
            <line class='chart-lines' x1="${xBound - getBoundValues().xIncr}" x2="${xBound - getBoundValues().xIncr}" y1="${yBound}" y2="${yBound + 4}"></line>` :
            `<text class='chart-text' x='${xPlot}', y='${yBound + xTextPadding}' dominant-baseline='middle' text-anchor='middle'>${xList[i]}</text>
            <line class='chart-lines' x1="${xPlot}" x2="${xPlot}" y1="${yBound}" y2="${yBound + 4}"></line>`;
        xPlot += xIncr;
    }
    elemY.innerHTML = yText;
    elemX.innerHTML = xText;
    elemLines.innerHTML = yLines;
    chart.appendChild(elemY);
    chart.appendChild(elemX);
    chart.appendChild(elemLines);
}
function plotData(data) {
    const chart = _('svgChart');
    xyPlots = [];//reinitialize array on resize/reset
    const yBound = getBoundValues().yBound;
    const xBound = getBoundValues().xBound;
    const yRatio = getBoundValues().yIncr;
    const plotEl = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    plotEl.setAttribute('class', 'plot-lines');
    const points1 = [], points2 = [];
    let xPlot = initialX;
    let yPlot = 0;
    const xIncr = getBoundValues().xIncr;
    for (let i = 0; i < data.length; i++) {
        let yArr = [];
        let valueArr = [];
        propArr.forEach(prop => {
            if (data[i][prop] != null) {
                yPlot = yBound - ((data[i][prop] / ratio) * yRatio);
                yArr.push(yPlot);
                valueArr.push(data[i][prop]);
            }
            else {
                yArr.push(null);
                valueArr.push(null);
            }
        });
        xyPlots.push({ x: xPlot, y1: yArr[0], y2: yArr[1], date: data[i].date, value1: valueArr[0], value2: valueArr[1] });
        if (yArr[0] != null) {
            points1.push(`${xPlot}, ${yArr[0]}`);
        }
        if (yArr[1] != null) {
            points2.push(`${xPlot}, ${yArr[1]}`);
        }
        xPlot += xIncr;
    }
    const color = (propArr.length > 0 && propArr[0].includes('cases')) ? (mode === 'dark') ? '#54cbf2' : '#038ebc' : (mode === 'dark') ? '#f44336' : '#B13507';
    const yellow = (mode === 'dark') ? '#ffc82a' : '#967000';
    let plotHtml = `
        <rect x='${initialX}' y='${0}' width='${xBound - initialX}' height='${yBound}' fill='#000' opacity='0'></rect>
        <polyline class='polyline' stroke='${color}' points='${points1}'></polyline>
        <polyline class='polyline' stroke='${yellow}' points='${points2}'></polyline>`;
    plotEl.innerHTML = plotHtml;
    chart.appendChild(plotEl);
}
function getLastNonNull(data, y) {
    let index = data.length - 1;
    while (data[index][y] === null) {
        index--;
    }
    return data[index][y];
}
function makeChartLabels() {
    const chart = _('svgChart');
    const labels = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    labels.setAttribute('class', 'chart-labels');
    const xPlot = xyPlots[xyPlots.length - 1].x + 10;//10 for margin between last xPlot and label
    let yPlot1 = getLastNonNull(xyPlots, 'y1');
    let yPlot2 = getLastNonNull(xyPlots, 'y2');
    if (Math.abs(yPlot1 - yPlot2) < 20) {// 20 height of label
        if (yPlot1 > yPlot2) {
            yPlot2 -= 20;
        }
        else {
            yPlot1 -= 20;
        }
    }
    const yPlots = [yPlot1, yPlot2];
    const color = (propArr.length > 0 && propArr[0].includes('cases')) ? (mode === 'dark') ? '#54cbf2' : '#038ebc' : (mode === 'dark') ? '#f44336' : '#B13507';
    const yellow = (mode === 'dark') ? '#ffc82a' : '#967000';
    let html = '';
    for (i = 0; i < propArr.length; i++) {
        html += `<text class='chart-label' x='${xPlot}', y='${Math.max(yPlots[i], 10)}' fill="${(i === 0) ? color : yellow}" dominant-baseline='middle' text-anchor='start'>${propTitle[i]}</text>`;
    }
    labels.innerHTML = html;
    chart.appendChild(labels);
}
function appendHoverG() {
    const chartWrapper = _('chart');
    const chart = _('svgChart');
    const hoverInfo = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    hoverInfo.setAttribute('class', 'hover-info');
    chart.appendChild(hoverInfo);
    const toolEl = document.createElement('div');
    toolEl.setAttribute('class', 'chart-popup');
    chartWrapper.appendChild(toolEl);
}
function makeChartDiv() {
    const container = countryPopup.querySelector('.flex-stats-container');
    const chart = document.createElement('div');
    chart.setAttribute('id', 'chart');
    let html = `
        <div class='chart-header'>
            <h2>NO DATA</h2>
            <div class="help-tip">
                <p>Published by the Oxford Coronavirus Government Response Tracker (OxCGRT), the <strong><em>stringency index</em></strong> measures the severity of the lockdown measures. This metric should not be interpreted as an indication of how appropriate or effective a country’s response was to the pandemic.</p>
            </div>
            <div id='chartInfo'>
                <p></p>
            </div>
            <div id='testsCheckBoxWrapper' class='yellow-test'>
                <input id='testsCheckBox' type='checkbox'></input>
                <label for='testsCheckBox'>Tests</label>
            </div>
            <div class="chart-options-wrapper" class="ease-out">
                <div id="chartDropDown">
                    <span class="flex-span" id="chartOptionTitle">New Cases</span>
                    <span class="flex-span bckg-sprite" id="chartOptionArrow"></span> 
                </div>
                <div id="chartMenu">
                    <button type="button" class="chart-btns" data-chartprop="new_cases_smoothed">New Cases</button>
                    <button type="button" class="chart-btns" data-chartprop="new_deaths_smoothed">New Deaths</button>
                    <button type="button" class="chart-btns" data-chartprop="total_cases">Total Cases</button>  
                    <button type="button" class="chart-btns" data-chartprop="total_deaths">Total Deaths</button>
                    <button type="button" class="chart-btns" data-chartprop="total_cases_per_million">Cases/Million</button>
                    <button type="button" class="chart-btns" data-chartprop="total_deaths_per_million">Deaths/Million</button>
                    <button type="button" class="chart-btns" data-chartprop="stringency_index">Stringency Index</button>
                </div>
            </div> 
        </div>
        <svg id='svgChart' width='100%' height='100%'></svg>`;
    chart.innerHTML = html;
    container.appendChild(chart);
}
function updateChartInfo(){
    const chart = _('chart');
    const helpTip = chart.querySelector('.chart-header .help-tip');
    const h2 = chart.querySelector('h2');
    const chartInfo = _('chartInfo');
    const info =  chartInfo.querySelector('p');
    let text = '', infoText = '';
    helpTip.style.display = 'none';
    helpTip.style.opacity = 0;
    if (propTitle.length > 0){
        for(i = 0; i < propTitle.length; i++){
            text = (i > 0) ? text + ' AND ' : text;
            text += propTitle[i]; 
        }
        if(propArr[0].includes('smoothed')){
            infoText = 'Daily data is smoothed out using a 7-day rolling average.';
        }
        else if(propArr[0].includes('stringency')){
            infoText = 'Scaled to a value from 0 to 100 (100 = strictest).';
            fadeIn(helpTip);
        }
        else{
            infoText = 'Due to limited testing and challenges in the cause of death, confirmed cases and deaths shown below might be lower.';
        }
    }
    else{
        text = 'NO DATA';
    }
    info.innerText = infoText;
    h2.innerText = text;
    const svg = _('svgChart');
    const header = chart.querySelector('.chart-header');
    const menu = document.querySelector('.chart-options-wrapper');
    headerHeight = (menu.style.height === '240px') ? header.offsetHeight - 210 : header.offsetHeight;//subtract 210(30 less than menu height, 30 is dropdown height) when dropdown menu is open to avoid negative yBound values
    svg.setAttribute('style', `height:calc(100% - ${headerHeight}px)`);
    svg.style.top = headerHeight + 'px';
}
//DROPDOWN CHART MENU
function onChartOptClick(e) {
    const checkBox = _('testsCheckBox');
    const text = this.innerText;
    const prop = this.dataset.chartprop;
    propArr = [], propTitle = [];
    propArr.push(prop);
    propTitle.push(text);
    const wrapper = _('testsCheckBoxWrapper');
    if (prop === 'stringency_index') {
        checkBox.disabled = true;
        wrapper.style.opacity = '0.5';
    }
    else {
        checkBox.disabled = false;
        wrapper.style.opacity = '1';
        const checked = (checkBox.checked) ? true : false;
        if (checked) {
            const testProp = testsSwitch(prop).testProp;
            const testTitle = testsSwitch(prop).testTitle;
            propArr.push(testProp);
            propTitle.push(testTitle);
        }
    }
    resetChart();
    const title = _('chartOptionTitle');
    title.innerText = text;
    closeChartDropDown();
}
function testsSwitch(property) {
    let testProp = '', testTitle = '';
    switch (property) {
        case 'new_cases_smoothed':
        case 'new_deaths_smoothed':
            testProp = 'new_tests_smoothed';
            testTitle = 'New Tests';
            break;
        case 'total_cases':
        case 'total_deaths':
            testProp = 'total_tests';
            testTitle = 'Total Tests';
            break;
        case 'total_cases_per_million':
        case 'total_deaths_per_million':
            testProp = 'total_tests_per_thousand';
            testTitle = 'Tests/Thousand';
    }
    return { testProp: testProp, testTitle: testTitle };
}
function onChartCheckBox(e) {
    const checkBox = (this.checked) ? true : false;
    const prop = propArr[0];
    if (checkBox) {
        const testProp = testsSwitch(prop).testProp;
        const testTitle = testsSwitch(prop).testTitle;
        propArr.push(testProp);
        propTitle.push(testTitle);
    }
    else {
        const index = propArr.findIndex(prop => prop.includes('tests'));
        propArr.splice(index, 1);
        propTitle.splice(index, 1);
    }
    resetChart();
}
function onChartDropDown(){
    const menu = document.querySelector('.chart-options-wrapper');
    if(menu.style.height === '30px' || menu.style.height === ''){
        openChartDropDown();
    }
    else{
        closeChartDropDown();
    }
}
function openChartDropDown(){
    const toggle = _('chartOptionArrow');
    const menu = document.querySelector('.chart-options-wrapper');
    menu.style.height = '240px';
    toggle.classList.add('transform-rotate');
}
function closeChartDropDown(){
    const toggle = _('chartOptionArrow');
    const menu = document.querySelector('.chart-options-wrapper');
    menu.style.height = '30px';
    toggle.classList.remove('transform-rotate');
}
//RENDER/REMOVE CHART
function makeChart() {
    const length = makePropList(dataHist);
    updateChartInfo();
    makeXYAxis(dataHist);
    plotData(dataHist);
    makeChartLabels();
    appendHoverG();  
}
function removeChart() {
    const chartWrapper = _('chart');
    const chart = _('svgChart');
    chart.querySelectorAll('g').forEach(g => {
        chart.removeChild(g);
    });
    const popup = chartWrapper.querySelector('.chart-popup');
    chartWrapper.removeChild(popup);
}
function resetChart() {
    removeChartListeners();
    removeChart();
    makeChart();
    addChartListeners();
}
//LISTENERS
//CHART DATA HOVER
function onChartHover(e) {
    getChartData(e);
}
function getChartData(e) {
    var offX = e.layerX;
    const chartWrapper = _('chart');
    const chart = _('svgChart');
    const hoverInfo = chart.querySelector('.hover-info');
    const toolEl = chartWrapper.querySelector('.chart-popup');
    const xGap = getBoundValues().xIncr;
    let record = xyPlots.find(point => Math.abs(point.x - offX) <= xGap / 2);
    record = (!record) ? xyPlots[xyPlots.length - 1] : record;
    const color = (propArr.length > 0 && propArr[0].includes('cases')) ? (mode === 'dark') ? '#54cbf2' : '#038ebc' : (mode === 'dark') ? '#f44336' : '#B13507';
    const yellow = (mode === 'dark') ? '#ffc82a' : '#967000';
    //HOVER VERTICAL LIGN + DOTS
    let html = `<line class='hover-line' x1="${record.x}" x2="${record.x}" y1="${0}" y2="${getBoundValues().yBound}" stroke-width='1px'></line>`;
    let visib = (record.y1 != null) ? 'visible' : 'hidden';
    html += `<circle class='hover-dot' cx="${record.x}" cy="${(record.y1 != null) ? record.y1 : 0}" r="5" fill='${color}' style='visibility:${visib};'></circle>`;
    visib = (record.y2 != null) ? 'visible' : 'hidden';
    html += `<circle class='hover-dot' cx="${record.x}" cy="${(record.y2 != null) ? record.y2 : 0}" r="5" fill='${yellow}' style='visibility:${visib};'></circle>`;
    hoverInfo.innerHTML = html;
    //TOOLTIP
    toolEl.innerHTML = popupHtml(record);
    hoverInfo.style.display = 'none';
    toolEl.style.display = 'none';
}
function popupHtml(record) {
    const varArr = ['value1', 'value2'];
    const color = (propArr.length > 0 && propArr[0].includes('cases')) ? (mode === 'dark') ? '#54cbf2' : '#038ebc' : (mode === 'dark') ? '#f44336' : '#B13507';
    const yellow = (mode === 'dark') ? '#ffc82a' : '#967000';
    const colors = [color, yellow];
    let tooltip = `<p class='chart-popup-date'>${formatDate(record.date)}</p>`;
    let count = 0;
    for (i = 0; i < propArr.length; i++) {
        if (record[varArr[i]] != null) {
            record[varArr[i]] = (record[varArr[i]] > 999) ? Math.round(record[varArr[i]]) : record[varArr[i]];
            let propPrefix = (propTitle[i] === 'New Cases' || propTitle[i] === 'New Deaths' || propTitle[i] === 'New Tests') ? 'Daily': (propTitle[i] != 'Stringency Index') ?'Cumulative' : '';
            tooltip +=
                `<div class='chart-popup-wrapper'>   
                    <div class='chart-popup-flex'>
                        <svg width='12px' height='12px'>
                            <circle cx="${5}" cy="${7}" r="5" fill='${colors[i]}'></circle>
                        </svg>
                        <p class='chart-popup-text'>${propPrefix} ${propTitle[i]}</p>
                    </div>
                    <div class='chart-popup-flex'>
                        <p class='chart-popup-text'>${record[varArr[i]].commaSplit()}</p>
                    </div>
                </div>`;
        }
        else { count++; }
    }
    if (count === propArr.length) {
        tooltip += `<p class='chart-popup-text'>No Data</p>`;
    }
    return tooltip;
}
function onChartMove(e) {
    var offX = e.layerX;
    const chartWrapper = _('chart');
    const chart = _('svgChart');
    const hoverG = chart.querySelector('.plot-lines');
    const hoverInfo = chart.querySelector('.hover-info');
    const line = chart.querySelector('.hover-line');
    const dot = chart.querySelectorAll('.hover-dot');
    const toolEl = chartWrapper.querySelector('.chart-popup');
    if (e.target.parentNode === hoverG || e.target.parentNode === hoverInfo) {
        const xGap = getBoundValues().xIncr;
        let record = xyPlots.find(point => Math.abs(point.x - offX) <= xGap / 2);
        record = (!record) ? xyPlots[xyPlots.length - 1] : record;
        hoverInfo.style.display = 'block';
        toolEl.style.display = 'block';
        line.setAttribute('x1', record.x);
        line.setAttribute('x2', record.x);
        const yArr = ['y1', 'y2'];
        let i = 0;
        dot.forEach(dot => {
            dot.setAttribute('cx', record.x);
            if (record[yArr[i]] != null) {
                dot.setAttribute('cy', record[yArr[i]]);
                dot.style.visibility = 'visible';
            }
            else {
                dot.style.visibility = 'hidden';
            }
            i++;
        });
        toolEl.innerHTML = popupHtml(record);
        const xLimit = offX + toolEl.offsetWidth + 10;
        let x;
        if(window.innerWidth > 768){
            x = (xLimit > getBoundValues().xBound + 20 + labelMaxWidth) ? record.x - toolEl.offsetWidth + 15 + 'px' : record.x + 25 + 'px';
        }
        else{   
            x = firstXTextWidth + 30 + 'px';//20 left padding + 10 initialXplot
        }
        const y = (window.innerWidth > 768 ) ? headerHeight + 70 + 'px' : headerHeight + 30 + 'px';//20 top padding + 50 extra
        toolEl.setAttribute('style', `-o-transform: translate(${x}, ${y}); -moz-transform: translate(${x}, ${y}); -ms-transform: translate(${x}, ${y}); -webkit-transform: translate(${x}, ${y}); transform: translate(${x}, ${y}); display: block;`);
    }
    else {
        hoverInfo.style.display = 'none';
        toolEl.style.display = 'none';
    }
}
//WINDOW RESIZE
function onChartResize() {
    resetChart();
}
//LABEL HOVER
function onChartLabelHover(e) {
    this.addEventListener('mouseout', onChartLabelOut, false);
    const chart = _('svgChart');
    const hoverG = chart.querySelector('.plot-lines');
    const lines = hoverG.querySelectorAll('polyline');
    const labels = chart.querySelectorAll('.chart-label');
    const color = this.getAttribute('fill');
    lines.forEach(line => {
        if (line.getAttribute('stroke') != color) {
            line.classList.add('stroke-gray');
        }
    });
    labels.forEach(label => {
        if (this != label) {
            label.classList.add('fill-gray');
        }
    });
}
function onChartLabelOut(e) {
    const chart = _('svgChart');
    const hoverG = chart.querySelector('.plot-lines');
    const lines = hoverG.querySelectorAll('polyline');
    const labels = chart.querySelectorAll('.chart-label');
    lines.forEach(line => {
        line.classList.remove('stroke-gray');
    });
    labels.forEach(label => {
        label.classList.remove('fill-gray');
    });
    this.removeEventListener('mouseout', onChartLabelOut);
}