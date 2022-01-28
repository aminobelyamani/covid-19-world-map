import { _, fadeIn, fadeOut, formatTime } from "./exports/global.js";
import { calcData, calcUsData, getData, getMinMax, matchData, parseSVG, showSortedList, worldData } from "./data.js";
import { dropDownSwitch, rawTotalSwitch, toggleSwitchCases } from "./exports/switches.js";
import { addLegendListeners, clearHighlights, makeLegend } from "./legend.js";
import { addPopupListeners, removePopupListeners } from "./popup.js";
import { onSwitchClick, onSwitchTap, onToggleSVGResize, switchToggle } from "./toggle.js";
import { addZoomTapListeners, onResize, removeZoomTapListeners, setPrevMapState, touchEvents } from "./panzoom.js";
import { zoomToCountryNoAnim } from "./profile.js";
import { onCloseSearch, onSearchInput, resultsTransform, searchWrapper, showSearch } from "./search.js";
import { chartOn, removeChartListeners, removeGlobalChartListeners, setChartOn } from "./chart.js";
import { loadUrl, onPopState } from "./history.js";

//GLOBAL VARIABLES
var overlay = _('overlay'),
    header = _('header'),
    mobileNav = _('mobileNav'),
    hamburger = _('hamburger'),
    timeStamp = _('timeStamp'),
    dropDown = _('dropDown'),
    optionsDiv = _('optionsDiv'),
    toggle = _('toggleSideBar'),
    closeDash = _('closeDash'),
    statsWrapper = _('statsWrapper'),
    dropDownTitle = _('dropDownTitle'),
    worldList = _('worldList'),
    currentDataWrapper = _('currentDataWrapper'),
    toggleDark = _('toggleDark'),
    centerBtn = _('centerBtn'),
    keyBtn = _('keyBtn'),
    keyTitle = _('keyTitle'),
    keys = _('keys'),
    closeKeys = _('closeKeys'),
    searchIcon = _('searchIcon'),
    searchInput = _('searchInput'),
    mapDiv = _('mapDiv'),
    usMap = _('usMap'),
    about = _('about');

var bckColorLDM = "#3d3c3a",
    colorLDM = "#faebd7";

//PROP SWITCH VARIABLES
export var prop = "newCasesPerMil",
    switchValue = "cases",
    mode = "dark",
    currentTitle = `Today's Cases/Mill`;

//SVG VARIABLES
export var VBWidth = 2000,
    VBHeight = 1051,//1001 + 50
    zoomEl = _('gOuter'),
    svgEl = _('worldMap');

//BOOL VARIABLES
export var usOn = false,
    onMaps = true,
    dropDownOn = false;

//DATA VARIABLES
export var countryCodes = [],
    globalRangeList = [],
    dataSVG = [],
    usSVG = [],
    dataAPI = [],
    countriesList = [],
    usData = [],
    dataYest = [],
    usDataYest = [];

//COUNTRY PROFILE VARIABLES
export var countryPopup = _('countryPopup'),
    closePopup = _('closePopup');

//TOUCH FUNCTIONS DOM VARIABLES
export var globalInstructions = _('globalInstructions'),
    globalHelpTip = _('globalHelpTip'),
    sideBar = _('sideBar'),
    currentData = _('currentData');

export var is_touch_device;

document.addEventListener("DOMContentLoaded", onDOMLoaded);

async function onDOMLoaded() {
    is_touch_device = 'ontouchstart' in document.documentElement;
    document.body.classList.remove('no-display');
    const kofiBtns = document.querySelectorAll('.btn-container');
    kofiBtns.forEach(btn => { btn.style.visibility = 'visible'; });
    kofiBtns[kofiBtns.length - 1].style.visibility = 'hidden';
    onResize();
    fadeIn(mapDiv);
    window.addEventListener("resize", onResize, false);
    dataSVG = await parseSVG();
    fetchInitialData();
    setInterval(() => { fetchInitialData(true); }, 300000);
}
function onPageLoad() {
    statsWrapper.scrollTop = 0;
    const els = [header, toggleDark, centerBtn, keyBtn, currentDataWrapper];
    els.forEach(e => {
        const flex = (e === header || e === currentDataWrapper) ? true : false;
        fadeIn(e, flex);
    });
    fadeOut(overlay);
    sideBar.classList.remove('transform');
    currentData.innerText = currentTitle;
    if (is_touch_device) {
        header.style.pointerEvents = 'none';
        touchEvents();
        removeHover();
    }
    addGlobalListeners();
    openLegend();
    showGlInstructions();
    globalHelpTipHandler();
    legendHelpTipHandler();
}
function fetchInitialData(onInterval) {
    fetch(`/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(function (result) { return result.json() })
        .then(async function (data) {
            if (!data) {
                if (!onInterval) { return onServerError(); }
                return;
            }
            timeStamp.innerText = `Updated at ${formatTime()}`;
            countryCodes = data.countryCodes;
            dataAPI = data.fetchData;
            dataYest = data.yestData;
            usDataYest = data.yestUsData;
            const combinedData = await getData(data.fetchData, data.yestData, data.vaccineData, dataSVG);
            countriesList = await calcData(combinedData);
            const rawUsData = await calcUsData(data.usData, data.yestUsData);
            usData = await calcData(rawUsData);
            if (window.location.pathname.length > 1) {
                if (!onInterval) { onPageLoad(); }
                return loadUrl(onInterval);
            }
            execProp();
            if (!onInterval) {
                const pageTitle = 'COVID-19 World Map';
                window.history.replaceState({ country: null, usOn }, pageTitle, '/');
                onPageLoad();
            }
        });
}
function onServerError() {
    const loader = overlay.querySelector('.loader');
    fadeOut(loader);
    _('overlayMsg').innerHTML = `Failed fetching data, please try again later`;
    _('overlayMsg').classList.add('error');
    setTimeout(() => { location.reload(); }, 5000);
}

//GLOBAL VARIABLE EXPORTS
export function setSwitchValue(val) {
    switchValue = val;
}
export function setProp(val) {
    prop = val;
}
export function setCurrentTitle(val) {
    currentTitle = val;
}

export async function execProp(noWorld) {
    const dataset = (!usOn) ? countriesList : usData;
    buttonsHandler(prop);
    if (!noWorld) { worldData(dataAPI); }//no need to refresh worldData when switching props on same switchValue
    globalRangeList = await getMinMax(dataset, prop);
    makeLegend(globalRangeList);
    matchData(dataset, prop, globalRangeList);
    showSortedList(dataset);
}

//LOAD COUNTRY PROFILE
function onWorldListClick(e) {
    e = e || window.event;
    if (e.target.parentNode.className === 'stats-flex') {
        const country = e.target.parentNode.getAttribute('data-country');
        loadCountry(country, false);
    }
}
export function loadCountry(country, prevMat, state) {
    clearPage();
    clearHighlights();
    const svgList = (!usOn) ? dataSVG : usSVG;
    const path = svgList.find(path => path.path.getAttribute('data-name').toLowerCase() === country.toLowerCase());
    zoomToCountryNoAnim(path.path, prevMat, state);
}

//DROPDOWN PROP EVENTS
function buttonsHandler(property) {
    const btnsQuery = toggleSwitchCases(switchValue).btns;
    const btns = optionsDiv.querySelectorAll(btnsQuery);
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
function onPropClick(e) {
    const data = (!usOn) ? countriesList : usData;
    if (data.length != 0 && prop != this.dataset.prop) {//wait for countriesList to fill with data
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
        execProp(true);
        if (window.innerWidth <= 768) {
            if (sideBar.classList.length > 0) {// handle when dropdown is open and fixed to top
                sideBar.addEventListener('transitionend', onMenuTrans, false);
                statsWrapper.style.overflowY = 'hidden';
                statsWrapper.removeEventListener('scroll', onStatsScroll);
                sideBar.className = '';
            }
            else { closeSideBar(); }
        }
    }
}
function onMenuTrans(e) {
    e = e || window.event;
    if (e.propertyName === 'transform') {
        this.removeEventListener('transitionend', onMenuTrans, false);
        closeSideBar();
        statsWrapper.style.overflowY = 'scroll';
        statsWrapper.addEventListener('scroll', onStatsScroll, false);
    }
}

//GLOBAL LISTENERS
function addGlobalListeners() {
    document.querySelectorAll('.menu-btns').forEach(btn => { btn.addEventListener('click', onMenuBtn, false); });
    toggle.addEventListener('click', toggleSideBar, false);
    closeDash.addEventListener('click', closeSideBar, false);
    keyBtn.addEventListener('click', toggleLegend, false);
    closeKeys.addEventListener('click', closeLegend, false);
    if (is_touch_device) { switchToggle.addEventListener('touchend', onSwitchTap, false); }
    else { switchToggle.addEventListener('click', onSwitchClick, false); }
    dropDown.addEventListener('click', onDropdownClick, false);
    statsWrapper.addEventListener('scroll', onStatsScroll, false);
    sideBar.addEventListener('onwheel' in document ? 'wheel' : 'onmousewheel' in document ? 'mousewheel' : 'DOMMouseScroll', onSideBarScroll, false);
    toggleDark.addEventListener('click', onToggleDark, false);
    const buttons = document.querySelectorAll('button');
    const propBtns = Array.from(buttons).filter(node => node.getAttribute('data-prop'));
    propBtns.forEach(btn => { btn.addEventListener('click', onPropClick, false); });
    worldList.addEventListener('click', onWorldListClick, false);
    searchInput.addEventListener('keyup', onSearchInput, false);
    searchIcon.addEventListener('click', showSearch, false);
    hamburger.addEventListener('click', onHamburger, false);
    window.addEventListener('popstate', onPopState, false);
    addPopupListeners();
    addZoomTapListeners();
    addLegendListeners();
}

//SIDEBAR
export function closeSideBar() {
    sideBar.className = 'transform';
    toggle.style.opacity = 1;
}
function toggleSideBar() {
    if (sideBar.classList.length === 0) { closeSideBar(); }
    else {
        sideBar.className = '';
        toggle.style.opacity = 0;
        popup.classList.add('no-display');
    }
}

//DROPDOWN
function openDropDown() {
    const height = toggleSwitchCases(switchValue).height;
    const toggle = _('dropDownArrow');
    optionsDiv.style.overflowY = "scroll";
    optionsDiv.style.height = height;
    optionsDiv.style.minHeight = height;
    toggle.classList.add('transform-rotate');
    sideBar.style.height = "calc(100 * var(--vh))";
    dropDownOn = true;
}
function closeDropDown() {
    const toggle = _('dropDownArrow');
    optionsDiv.scrollTo(0, 0);
    optionsDiv.style.height = "39px";
    optionsDiv.style.minHeight = "39px";
    optionsDiv.style.overflowY = "hidden";
    toggle.classList.remove('transform-rotate');
    dropDownOn = false;
}
function onDropdownClick(e) {
    statsWrapper.style.overflowY = 'hidden';
    statsWrapper.removeEventListener('scroll', onStatsScroll);
    if (optionsDiv.style.height === "39px" || optionsDiv.style.height === "") { openDropDown(); }
    else { closeDropDown(); }
    setTimeout(() => {
        statsWrapper.style.overflowY = 'scroll';
        statsWrapper.addEventListener('scroll', onStatsScroll, false);
    }, 400);
    sideBar.className = '';
}

//STATS DASHBOARD SCROLL
function onSideBarScroll(e) {
    e = e || window.event;
    const delta = (e.deltaY ? e.deltaY : e.wheelDeltaY ? e.wheelDeltaY : e.detail);
    statsWrapper.scrollTop += delta;
}
var lastScrollTop = 0;
export function onStatsScroll(e) {
    var st = this.scrollTop;
    if (st === lastScrollTop) { return; }//firefox bug firing scroll when height changes
    if (st <= 0) {
        sideBar.className = "";
        if (st > lastScrollTop) {// downscroll code
            sideBar.style.height = 'calc(100 * var(--vh))';
        }
        else {
            setTimeout(() => {//avoid wheel action on svg map
                sideBar.style.height = 'calc(100 * var(--vh))';
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

//LEGEND BOX
function toggleLegend() {
    if (!keys.classList.contains('no-display')) { closeLegend(); }
    else { openLegend(); }
}
function openLegend() {
    fadeIn(keys);
}
function closeLegend() {
    fadeOut(keys);
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
        if (searchWrapper.classList.length === 2) { searchWrapper.style.backgroundColor = '#e6e6e6'; }
        buttonsHandler(prop);
    }
    else {//DARK
        mode = "dark";
        this.setAttribute('title', 'Toggle Light Mode');
        bckColorLDM = "#3d3c3a";
        colorLDM = "#faebd7";
        html.classList.remove('light');
        if (searchWrapper.classList.length === 2) { searchWrapper.style.backgroundColor = '#282828'; }
        buttonsHandler(prop);
    }
    changeNavColor();
}

//HEADER
export function addRemoveHeader() {
    if (window.innerWidth <= 768) {
        if (header.classList.length === 2) { removeHeader(); }
        else { addHeader(); }
    }
}
export function addHeader() {
    const elements = [header, currentData, globalHelpTip, toggle, toggleDark, keyBtn, centerBtn];
    elements.forEach(e => { e.classList.remove('transform-y-50'); });
}
export function removeHeader() {
    const elements = [header, currentData, globalHelpTip, toggle, toggleDark, keyBtn, centerBtn];
    elements.forEach(e => { e.classList.add('transform-y-50'); });
    globalInstructions.classList.add('transform-y-260');
    globalHelpTip.style.top = "50px";
    if (mobileNav.classList.length === 0) {
        mobileNav.classList.add('transform-y-260');
        hamburger.classList.toggle('change');
    }
    if (window.innerWidth <= 768) { onCloseSearch(); }
}

//PAGE SWITCHING
export function menuSwitchBtns(menu) {
    let btn, btnMobile;
    switch (menu) {
        case 'us':
            btn = _('usBtn');
            btnMobile = _('usBtnMobile');
            break;
        case 'about':
            btn = _('aboutBtn');
            btnMobile = _('aboutBtnMobile');
            break;
        case 'world':
            btn = _('worldBtn');
            btnMobile = _('worldBtnMobile');
    }
    return { btn, btnMobile };
}
export function handleMenuBtnColors(e) {
    const thisColor = (mode === 'dark') ? '#54cbf2' : '#9c9c9c';
    const otherColor = (mode === 'dark') ? '#faebd7' : '#000';
    document.querySelectorAll('.menu-btns').forEach(item => { item.style.color = otherColor; });
    e.style.color = thisColor;
}
export async function onMenuBtn(e, country, state) {
    removePopupListeners();
    removeZoomTapListeners();
    onCloseSearch();
    e = (e.clientY) ? this : (window.innerWidth <= 768) ? menuSwitchBtns(e).btnMobile : menuSwitchBtns(e).btn;
    mobileNav.classList.add('transform-y-260');
    hamburger.classList.remove('change');
    const attr = e.getAttribute('data-link');
    handleMenuBtnColors(e);
    about.classList.add('no-display');
    popup.classList.add('no-display');
    if (attr === "about") {
        if (chartOn) { removeChartListeners(); removeGlobalChartListeners(); setChartOn(false); }
        clearPopup(true);
        onResize();
        clearPage();
        about.classList.remove('no-display');
        if (!state) {
            const pageTitle = 'About | COVID-19 World Map';
            window.history.pushState({ page: 'about' }, pageTitle, '/about');
            document.title = pageTitle;
        }
    }
    else if (attr === 'us') {
        onMaps = true;
        usOn = true;
        await declareUsZoomElems().then(async () => {
            showGlInstructions();
            await onResetPage(state).then(() => {
                clearHighlights();
                if (country) { loadCountry(country, false, state); }
            });
        });
    }
    else {
        onMaps = true;
        usOn = false;
        await declareWorldZoomElems().then(async () => {
            showGlInstructions();
            await onResetPage(state).then(() => {
                clearHighlights();
                if (country) { loadCountry(country, false, state); }
            });
        });
    }
}
function declareUsZoomElems() {
    return new Promise(async resolve => {
        fadeOut(_('worldMap'));
        svgEl = usMap
        zoomEl = _('gUsMap');
        VBWidth = 1362;
        VBHeight = 817;//767 + 50
        if (is_touch_device) { touchEvents(true); }
        usSVG = await parseSVG();
        onResize();
        fadeIn(svgEl);
        resolve();
    });
}
function declareWorldZoomElems() {
    return new Promise(async resolve => {
        fadeOut(usMap);
        svgEl = _('worldMap');
        zoomEl = _('gOuter');
        VBWidth = 2000;
        VBHeight = 1051;//1001 + 50
        if (is_touch_device) { touchEvents(true); }
        dataSVG = await parseSVG();
        onResize();
        fadeIn(svgEl);
        resolve();
    });
}
function onResetPage(onHist) {
    return new Promise(resolve => {
        if (chartOn) { removeChartListeners(); removeGlobalChartListeners(); setChartOn(false); }
        clearPopup(onHist);
        addZoomTapListeners();
        addPopupListeners();
        showPage();
        reassignProp();
        resolve();
    });
}
export function clearPage() {
    const els = [toggle, toggleDark, sideBar, currentDataWrapper, centerBtn, keyBtn, keys, globalInstructions];
    els.forEach(e => { e.classList.add('no-display'); });
    if (!about.classList.contains('no-display')) { about.classList.add('no-display'); }
    removeZoomTapListeners();
    removePopupListeners();
    onMaps = false;
}
function showPage() {
    const els = [toggle, toggleDark, sideBar, currentDataWrapper, centerBtn, keyBtn, keys];
    els.forEach(e => { e.classList.remove('no-display'); });
    if (is_touch_device) {
        if (window.innerWidth <= 768) {
            globalHelpTip.style.top = (globalInstructions.classList.contains('transform-y-260') > 1) ? "50px" : "70px";
        }
        globalInstructions.classList.remove('no-display');
    }
    onToggleSVGResize();
}
function reassignProp() {
    execProp();
    statsWrapper.scrollTop = 0;
    globalHelpTipHandler();
    const placeholder = (!usOn) ? 'Search by Country' : 'Search by State';
    searchInput.setAttribute('placeholder', placeholder);
}

//SHOW COUNTRY PROFILE
export function onShowPopup(country, alpha2) {
    countryPopup.scrollTo(0, 0);
    countryPopup.classList.remove('transform');
    closePopup.classList.add('closepopup-change');
    closePopup.setAttribute('data-alpha2', alpha2);
    closePopup.setAttribute('data-country', country);
    setTimeout(() => { resultsTransform(); }, 300);
    closePopup.addEventListener('click', onClosePopup, false);
    countryPopup.addEventListener('scroll', onCountryPopupScroll, false);
}
function onCountryPopupScroll() {
    if (window.innerWidth <= 768) { addHeader(); }
}
//CLEAR COUNTRY PROFILE
function onClosePopup(e) {
    onMaps = true;
    onCloseSearch();
    clearPopup();
    setPrevMapState();
    showPage();
    addPopupListeners();
    addZoomTapListeners();
    if (chartOn) { removeChartListeners(); removeGlobalChartListeners(); setChartOn(false); }
    clearHighlights();
}
function clearPopup(onAbout) {
    countryPopup.style.overflow = 'hidden';//block touch scroll momentum before animation
    countryPopup.scrollTo(0, 0);
    countryPopup.removeEventListener('scroll', onCountryPopupScroll);
    closePopup.removeEventListener('click', onClosePopup);
    closePopup.setAttribute('data-alpha2', '');
    closePopup.setAttribute('data-country', '');
    countryPopup.classList.add('transform');
    closePopup.classList.remove('closepopup-change');
    countryPopup.style.overflow = '';
    setTimeout(() => { resultsTransform(); }, 500);
    if (!onAbout) {
        const pageTitle = 'COVID-19 World Map';
        const state = { country: null, usOn };
        window.history.pushState(state, pageTitle, '/');
        document.title = pageTitle;
    }
}

//HAMBURGER
function onHamburger(e) {
    if (mobileNav.classList.length === 1) { mobileNav.classList.remove('transform-y-260'); }
    else { mobileNav.classList.add('transform-y-260'); }
    hamburger.classList.toggle('change');
    popup.classList.add('no-display');
}

//REMOVE HOVER ON TOUCH DEVICES
function removeHover() {
    closeKeys.classList.add('no-hover');
    closeDash.classList.add('white');
}

//HELLP TIPS
export function showGlInstructions() {
    if (is_touch_device && onMaps) {
        globalInstructions.classList.remove('transform-y-260');
        const p = globalInstructions.querySelector('p');
        globalInstructions.classList.remove('no-display');
        const target = (!usOn) ? 'country' : 'state';
        p.innerText = `Tap ${target} for info, press and hold for full ${target} profile.`;
    }
}
export function globalHelpTipHandler() {
    const pText = dropDownSwitch(prop);
    if (pText != '') {
        globalHelpTip.classList.remove('no-display');
        const p = globalHelpTip.querySelector('p');
        p.innerHTML = pText;
    }
    else { globalHelpTip.classList.add('no-display'); }
    if (is_touch_device && window.innerWidth <= 768) {
        globalHelpTip.style.top = (globalInstructions.classList.contains('transform-y-260')) ? "50px" : "70px";
    }
}
function legendHelpTipHandler() {
    let text = (is_touch_device) ? 'Tap color to isolate countries in specific range.' : 'Hover mouse over color to isolate countries in specific range.';
    const p = legendHelpTip.querySelector('p');
    p.innerText = text;
    p.style.width = (is_touch_device) ? '300px' : '370px';
}