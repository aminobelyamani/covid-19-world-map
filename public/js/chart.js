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
    dataHist = [],
    chartArray = [],
    currentProp;

function makePropList(data) {
    const nullProps = propArr.filter(prop => getMax(data, prop) === 0);
    nullProps.forEach(p => {
        const index = propArr.findIndex(prop => prop === p);
        propArr.splice(index, 1);
        propTitle.splice(index, 1);
    });
    const checkBox = _('testsCheckBox');
    const wrapper = _('testsCheckBoxWrapper');
    if (propArr.length === 0) {
        checkBox.disabled = true;
        wrapper.style.opacity = '0.5';
    }
    if (propArr.length > 0 && (propArr[0].includes('cases') || propArr[0].includes('deaths'))) {
        const testProp = testsSwitch(propArr[0]).testProp;
        if (getMax(data, testProp) === 0) {
            checkBox.disabled = true;
            wrapper.style.opacity = '0.5';
        }
        else {
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
function createChartArray(data, property) {
    const list = [];
    let payload;
    data.forEach(d => {
        if (d.hasOwnProperty(property)) {
            if (d.hasOwnProperty('new_tests_smoothed') && (property != 'new_vaccinations_smoothed' && property != 'stringency_index')) {
                payload = { date: d.date, [property]: d[property], new_tests_smoothed: d.new_tests_smoothed };
            }
            else {
                payload = { date: d.date, [property]: d[property] };
            }
            list.push(payload);
        }
    });
    if (getMax(list, property) === 0) {
        list.length = 0;
    }
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
    const factor = (data.length > 1) ? Math.floor(length / 2) : 1;
    const numXElems = (window.innerWidth > 768) ? Math.min(6, factor) : Math.min(3, factor);
    const xIncrFactor = Math.floor(length / numXElems);
    const dateFormat = (window.innerWidth > 768) ? false : true;
    for (i = 0; i <= numXElems; i++) {
        value = (i === numXElems) ? formatDate(data[data.length - 1].date, dateFormat) : (i === 0) ? formatDate(data[i * xIncrFactor].date, dateFormat) : formatDate(data[i * xIncrFactor].date, true);
        xList.push(value);
    }
    const chart = _('svgChart');
    const elem1 = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    const elem2 = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    elem1.setAttribute('style', 'visibility:hidden');
    elem2.setAttribute('style', 'visibility:hidden');
    let html = `<text class='chart-text' x='0', y='0' fill="none" dominant-baseline='middle' text-anchor='middle'>${xList[0]}</text>`;
    let html2 = `<text class='chart-text' x='0', y='0' fill="none" dominant-baseline='middle' text-anchor='middle'>${xList[xList.length - 1]}</text>`;
    elem1.innerHTML = html;
    elem2.innerHTML = html2;
    chart.appendChild(elem1);
    chart.appendChild(elem2);
    labelMaxWidth = Math.ceil(elem2.getBBox().width) / 2;
    firstXTextWidth = Math.ceil(elem1.getBBox().width);
    chart.removeChild(elem1);
    chart.removeChild(elem2);
    return { xList: xList, xIncrFactor: xIncrFactor };
}
function getTextWidth(yList) {
    const chart = _('svgChart');
    const elem1 = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    elem1.setAttribute('style', 'visibility:hidden');
    let html1 = `<text class='chart-text' x='0', y='0' fill="none" dominant-baseline='middle' text-anchor='end'>${yList[yList.length - 1]}</text>`;
    elem1.innerHTML = html1;
    chart.appendChild(elem1);
    const maxWidth = Math.ceil(elem1.getBBox().width);
    firstXTextWidth = Math.max(maxWidth, firstXTextWidth / 2);
    chart.removeChild(elem1);
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
        xIncr: (xBound - initialX) / (chartArray.length - 1)//number of data plots - 1
    }
    return bounds;
}
function makeXYAxis(data) {
    return new Promise(resolve => {
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
            yLines += (i === 0) ? `<line class='chart-horiz-lines' x1="${maxWidth + 10}" x2="${xBound}" y1="${yPlot}" y2="${yPlot}"></line>` : `<line class='chart-horiz-lines' x1="${maxWidth + 10}" x2="${xBound}" y1="${yPlot}" y2="${yPlot}" stroke-dasharray='3,2'></line>`;
            yPlot -= yIncr;
        }
        for (let i = 0; i < xList.length; i++) {//x-axis labels
            xText += (i === xList.length - 1) ? `
                <text class='chart-text' x='${xBound}', y='${yBound + xTextPadding}' dominant-baseline='middle' text-anchor='middle'>${xList[i]}</text>
                <line class='chart-lines' x1="${xBound}" x2="${xBound}" y1="${yBound}" y2="${yBound + 4}"></line>` :
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
        resolve(true);
    });
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
    const yellow = (mode === 'dark') ? '#ffc82a' : '#967000';
    const color = propSwitch(currentProp);
    let plotHtml = `
        <rect id='plotRect' x='${initialX}' y='${0}' width='${xBound - initialX}' height='${yBound}' fill='#000' opacity='0'></rect>
        <polyline class='polyline' stroke='${color}' points='${points1}'></polyline>
        <polyline class='polyline' stroke='${yellow}' points='${points2}'></polyline>`;
    plotEl.innerHTML = plotHtml;
    chart.appendChild(plotEl);
}
function propSwitch(property) {
    let color;
    switch (property) {
        case 'new_cases_smoothed':
            color = (mode === 'dark') ? '#54cbf2' : '#038ebc';
            break;
        case 'new_deaths_smoothed':
            color = (mode === 'dark') ? '#f44336' : '#B13507';
            break;
        case 'new_vaccinations_smoothed':
            color = (mode === 'dark') ? '#4cf6af' : '#33a976';
            break;
        case 'stringency_index':
            color = (mode === 'dark') ? '#ffc82a' : '#967000';
    }
    return color;
}
function appendHoverG() {
    const chartWrapper = _('chart');
    const chart = _('svgChart');
    const hoverInfo = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    hoverInfo.setAttribute('class', 'hover-info');
    chart.appendChild(hoverInfo);
    //HOVER VERTICAL LINE + DOTS
    const color = propSwitch(currentProp);
    const yellow = (mode === 'dark') ? '#ffc82a' : '#967000';
    let html = `<line class='hover-line' x1="0" x2="0" y1="0" y2="${getBoundValues().yBound}" stroke-width='1px'></line>`;
    html += `<circle class='hover-dot' cx="0" cy="0" r="5" fill='${color}' style='visibility:hidden;'></circle>`;
    html += `<circle class='hover-dot' cx="0" cy="0" r="5" fill='${yellow}' style='visibility:hidden;'></circle>`;
    hoverInfo.innerHTML = html;
    const toolEl = document.createElement('div');
    toolEl.setAttribute('class', 'chart-popup');
    chartWrapper.appendChild(toolEl);
}
function makeChartDiv() {
    const chart = _('chart');
    const stringency = (!usOn) ? '<button type="button" class="chart-btns" data-chartprop="stringency_index">Stringency Index</button>' : '';
    let html = `
        <div class='chart-header'>
            <h2>CHART: NO DATA</h2>
            <div class="help-tip-chart help-tip-stats help-tip"><p></p></div>
            <div id='chartInfo'><p></p></div>
            <div id='testsCheckBoxWrapper' class='yellow-test'>
                <input id='testsCheckBox' type='checkbox'></input>
                <label for='testsCheckBox'>Tests</label>
            </div>
            <div class="chart-options-wrapper" class="ease-out">
                <div id="chartDropDown">
                    <span class="flex-span" id="chartOptionTitle">Daily Cases</span>
                    <span class="flex-span bckg-sprite dropDown-arrow" id="chartOptionArrow"></span> 
                </div>
                <div id="chartMenu">
                    <button type="button" class="chart-btns" data-chartprop="new_cases_smoothed">Daily Cases</button>
                    <button type="button" class="chart-btns" data-chartprop="new_deaths_smoothed">Daily Deaths</button>
                    <button type="button" class="chart-btns" data-chartprop="new_vaccinations_smoothed">Vaccinations</button>
                    ${stringency}  
                </div>
            </div> 
        </div>
        <svg id='svgChart' width='100%' height='100%'></svg>`;
    chart.innerHTML = html;
}
function updateChartInfo() {
    const chart = _('chart');
    const helpTip = chart.querySelector('.chart-header .help-tip');
    const h2 = chart.querySelector('h2');
    const chartInfo = _('chartInfo');
    const info = chartInfo.querySelector('p');
    let text = '', infoText = '';
    helpTip.style.display = 'none';
    helpTip.style.opacity = 0;
    if (propTitle.length > 0) {
        for (i = 0; i < propTitle.length; i++) {
            text = (i > 0) ? text + ' AND ' : text;
            text += propTitle[i];
        }
        if (propArr[0].includes('smoothed')) {
            infoText = 'Daily data is smoothed out using a 7-day rolling average.';
            if (currentProp === 'new_vaccinations_smoothed') {
                helpTip.innerHTML = '<p>This chart shows the daily number of doses administered, it does <strong>NOT</strong> represent the number of people vaccinated.</p>'
                fadeIn(helpTip);
            }
        }
        else if (propArr[0].includes('stringency')) {
            infoText = 'Scaled to a value from 0 to 100 (100 = strictest).';
            helpTip.innerHTML = '<p>Published by the Oxford Coronavirus Government Response Tracker (OxCGRT), the <strong><em>stringency index</em></strong> measures the severity of the lockdown measures. This metric should not be interpreted as an indication of how appropriate or effective a country’s response was to the pandemic.</p>'
            fadeIn(helpTip);
        }
        else {
            infoText = 'Due to limited testing and challenges in the cause of death, confirmed cases and deaths shown below might be lower.';
        }
    }
    else {
        text = 'NO DATA';
    }
    info.innerText = infoText;
    const color = propSwitch(currentProp);
    h2.style.color = color;
    h2.innerText = `CHART: ${text}`;
    const svg = _('svgChart');
    const header = chart.querySelector('.chart-header');
    const menu = document.querySelector('.chart-options-wrapper');
    const height = (!usOn) ? 150 : 120;
    headerHeight = (menu.style.height === `${height}px`) ? header.offsetHeight - (height - 30) : header.offsetHeight;//subtract 30 less than menu height (30 is dropdown height) when dropdown menu is open to avoid negative yBound values
    svg.setAttribute('style', `height:calc(100% - ${headerHeight}px)`);
    svg.style.top = headerHeight + 'px';
}
//DROPDOWN CHART MENU
function onChartOptClick(e) {
    const checkBox = _('testsCheckBox');
    const text = this.innerText;
    const prop = this.dataset.chartprop;
    if (currentProp != prop) {
        currentProp = prop;
        chartArray = createChartArray(dataHist, currentProp);
        propArr = [], propTitle = [];
        propArr.push(prop);
        propTitle.push(text);
        const wrapper = _('testsCheckBoxWrapper');
        if (prop === 'stringency_index' || prop === 'new_vaccinations_smoothed') {
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
}
function testsSwitch(property) {
    let testProp = '', testTitle = '';
    switch (property) {
        case 'new_cases_smoothed':
        case 'new_deaths_smoothed':
            testProp = 'new_tests_smoothed';
            testTitle = 'Daily Tests';
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
function onChartDropDown() {
    const menu = document.querySelector('.chart-options-wrapper');
    if (menu.style.height === '30px' || menu.style.height === '') {
        openChartDropDown();
    }
    else {
        closeChartDropDown();
    }
}
function openChartDropDown() {
    const toggle = _('chartOptionArrow');
    const menu = document.querySelector('.chart-options-wrapper');
    const height = (!usOn) ? '150px' : '120px';
    menu.style.height = height;
    toggle.classList.add('transform-rotate');
}
function closeChartDropDown() {
    const toggle = _('chartOptionArrow');
    const menu = document.querySelector('.chart-options-wrapper');
    menu.style.height = '30px';
    toggle.classList.remove('transform-rotate');
}
//RENDER/REMOVE CHART
async function makeChart() {
    const length = makePropList(chartArray);
    updateChartInfo();
    await makeXYAxis(chartArray);
    plotData(chartArray);
    appendHoverG();
    const chartWrapper = _('chart');
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
function onNoChartData() {
    const chartWrapper = _('chart');
    chartWrapper.style.height = '115px';
    chartWrapper.style.minHeight = '115px';
    chartOn = false;
    propArr = [];
    propTitle = [];
    updateChartInfo();
    const checkBox = _('testsCheckBox');
    const wrapper = _('testsCheckBoxWrapper');
    checkBox.disabled = true;
    wrapper.style.opacity = '0.5';
}
function resetChart() {
    const chartWrapper = _('chart');
    if (chartOn) { removeChartListeners(); removeChart(); }
    if (chartArray.length > 1) {
        chartWrapper.style.minHeight = '350px';
        chartWrapper.style.height = 'calc(calc(100 * var(--vh)) - 60px)';
        chartOn = true;
        makeChart();
        addChartListeners();
    }
    else {
        onNoChartData();
    }
    chartWrapper.scrollTop = 0;
    countryPopup.scrollTop = chartWrapper.offsetTop - 5;
}
//LISTENERS
//CHART DATA HOVER/MOVE
function popupHtml(record) {
    const varArr = ['value1', 'value2'];
    const color = propSwitch(currentProp);
    const yellow = (mode === 'dark') ? '#ffc82a' : '#967000';
    const colors = [color, yellow];
    let tooltip = `<p class='chart-popup-date'>${formatDate(record.date)}</p>`;
    let count = 0;
    for (i = 0; i < propArr.length; i++) {
        if (record[varArr[i]] != null) {
            record[varArr[i]] = (record[varArr[i]] > 999) ? Math.round(record[varArr[i]]) : record[varArr[i]];
            let propPrefix = (propTitle[i] === 'Vaccinations') ? 'Daily' : '';
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
    e = e || window.event;
    const offX = (!is_touch_device) ? e.layerX : e.srcEvent.layerX;
    const offY = (!is_touch_device) ? e.layerY : e.srcEvent.layerY;
    const path = (!is_touch_device) ? e.target : e.srcEvent.target;
    const chartWrapper = _('chart');
    const chart = _('svgChart');
    const hoverInfo = chart.querySelector('.hover-info');
    const line = chart.querySelector('.hover-line');
    const dot = chart.querySelectorAll('.hover-dot');
    const toolEl = chartWrapper.querySelector('.chart-popup');
    const rect = _('plotRect');
    if (path === rect && offX >= initialX && offX <= getBoundValues().xBound && offY >= 0 && offY <= getBoundValues().yBound) {
        const xGap = getBoundValues().xIncr;
        let record = xyPlots.find(point => Math.abs(point.x - offX) <= xGap / 2);
        if (record) {
            hoverInfo.style.display = 'block';
            toolEl.style.display = 'block';
            line.setAttribute('x1', record.x);
            line.setAttribute('x2', record.x);
            const yArr = ['y1', 'y2'];
            let i = 0;
            dot.forEach(dot => {
                dot.setAttribute('cx', record.x);
                const cy = (record[yArr[i]] != null) ? record[yArr[i]] : 0;
                const visib = (record[yArr[i]] != null) ? 'visible' : 'hidden';
                dot.setAttribute('cy', cy);
                dot.style.visibility = visib;
                i++;
            });
            toolEl.innerHTML = popupHtml(record);
            const xLimit = record.x + toolEl.offsetWidth + 10;
            const x = (xLimit > getBoundValues().xBound + labelMaxWidth) ? record.x - toolEl.offsetWidth + 15 + 'px' : record.x + 25 + 'px';
            const y = (window.innerWidth > 768) ? headerHeight + 70 + 'px' : headerHeight + 30 + 'px';//20 top padding + 50 extra
            toolEl.setAttribute('style', `-o-transform: translate(${x}, ${y}); -moz-transform: translate(${x}, ${y}); -ms-transform: translate(${x}, ${y}); -webkit-transform: translate(${x}, ${y}); transform: translate(${x}, ${y}); display: block;`);
        }
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