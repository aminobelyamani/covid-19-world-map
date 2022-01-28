import { _ } from "./exports/global.js";
import { prop, zoomEl, is_touch_device } from "./main.js";
import { toggleSwitchCases } from "./exports/switches.js";
import { pathCountries } from "./data.js";

var keys = _('keys'),
    legendColors = _('legendColors');

export function changeLegendColors(cat) {
    const colors = legendColors.querySelectorAll('.color');
    const color = toggleSwitchCases(cat).colors.reverse();
    for (let i = 0; i < colors.length - 1; i++) {
        colors[i].style.backgroundColor = color[i];
    }
}
export function makeLegend(rangeList) {
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
export function onLegendResize(rangeList) {
    const rangeElems = keys.querySelectorAll('.data-range');
    const colorElems = legendColors.querySelectorAll('.color');
    rangeElems[rangeElems.length - 1].innerText = (window.innerWidth <= 768) ? 'No Data' : 'No Reported Data';
    if (rangeList.length === 0) {
        colorElems[colorElems.length - 2].style.borderTopRightRadius = '3px';
        if (window.innerWidth <= 768) { colorElems[colorElems.length - 2].style.borderBottomRightRadius = '3px'; }
        else { colorElems[colorElems.length - 2].style.borderTopLeftRadius = '3px'; }
    }
    for (let count = 0; count < rangeList.length; count++) {
        const index = rangeElems.length - (3 + count);
        const decCount = rangeList[count].countDecimals();
        const rangeMin = (rangeList[count] <= 1) ? 0 : (prop === 'newCasesPerMil' || prop === 'yestCasesPerMil' || prop === 'percRecovered' || prop === 'percActive' || prop === 'percCritical' || prop === 'newDeathsPerMil' || prop === 'yestDeathsPerMil' || prop === 'percDeaths' || prop === 'percVacc' || prop === 'percFullyVacc' || prop === 'percBoosted') ? 0.1 : 1;
        const rangeMax = (rangeList[count] < 1 && rangeList[count + 1] === 1) ? 1 / Math.pow(10, decCount) : 0;
        rangeElems[index].classList.remove('no-display');
        colorElems[index].classList.remove('no-display');
        if (count == rangeList.length - 1) {
            colorElems[index].style.borderTopRightRadius = '3px';
            rangeElems[index].firstElementChild.innerText = `> ${rangeList[count].commaSplit()}`;
            if (window.innerWidth <= 768) { colorElems[index].style.borderBottomRightRadius = '3px'; }
            else { colorElems[index].style.borderTopLeftRadius = '3px'; }
        }
        else { rangeElems[index].firstElementChild.innerText = (window.innerWidth <= 768) ? `${(rangeList[count]).commaSplit()}` : `${(rangeList[count] + rangeMin).commaSplit()} – ${(rangeList[count + 1] - rangeMax).commaSplit()}`; }
    }
    const width = colorElems[colorElems.length - 2].getBoundingClientRect().width;
    const x = (window.innerWidth <= 768) ? -((width / 2) + .5) + 'px' : 0 + 'px';
    for (let i = 0; i < rangeElems.length; i++) {
        rangeElems[i].style.width = (window.innerWidth <= 768) ? `${width}px` : 'auto';
        if (i != rangeElems.length - 1) { rangeElems[i].style.setProperty('--trans', x); }
    }
}

//LEGEND HOVER LISTENERS
export function addLegendListeners() {
    const colors = legendColors.querySelectorAll('.color');
    const keyRanges = keys.querySelectorAll('.data-range');
    for (let i = 0; i < colors.length; i++) {
        if (!is_touch_device) { colors[i].addEventListener('mouseover', onColorOver, false); }
        else { colors[i].addEventListener('touchend', onColorTouch, false); }
    }
    for (let i = 0; i < keyRanges.length; i++) {
        if (!is_touch_device) { keyRanges[i].addEventListener('mouseover', onColorOver, false); }
        else { keyRanges[i].addEventListener('touchend', onColorTouch, false); }
    }
}
export function removeLegendListeners() {
    const keyRanges = keys.querySelectorAll('.data-range');
    const colors = legendColors.querySelectorAll('.color');
    for (let i = 0; i < colors.length; i++) {
        if (!is_touch_device) { colors[i].removeEventListener('mouseover', onColorOver); }
        else { colors[i].removeEventListener('touchend', onColorTouch); }
    }
    for (let i = 0; i < keyRanges.length; i++) {
        if (!is_touch_device) { keyRanges[i].removeEventListener('mouseover', onColorOver); }
        else { keyRanges[i].removeEventListener('touchend', onColorTouch); }
    }
}
export function clearLegendHover() {
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
    e = e || window.event;
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
    e = e || window.event;
    this.addEventListener('mouseout', onColorOut, false);
    const elem = (e.target.className === 'color') ? this : getLegendTarget(this).elem;
    const keyRanges = keys.querySelectorAll('.data-range');
    for (let i = 0; i < keyRanges.length; i++) {
        keyRanges[i].style.opacity = (i === getLegendTarget(this).index) ? 1 : 0.3;
    }
    elem.classList.add('on-color-hover');
    highlightRangeCountries(elem.style.backgroundColor);
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
function getLegendTarget(e) {
    const parent = e.parentNode;
    const index = Array.prototype.indexOf.call(parent.children, e);
    return { elem: legendColors.querySelectorAll('.color')[index], index: index };
}
//HIGHLIGHT COUNTRIES
function highlightRangeCountries(color) {
    const zoom = zoomEl.transform.baseVal.getItem(0).matrix.a;
    document.querySelector(':root').style.setProperty('--zoom', zoom);
    for (let i = 0; i < pathCountries.length; i++) {
        if (pathCountries[i].style.fill != color) { pathCountries[i].classList.add('dark-path'); }
        else { pathCountries[i].classList.add('highlight-path'); }
    }
}
export function clearHighlights() {
    const zoom = zoomEl.transform.baseVal.getItem(0).matrix.a;
    document.querySelector(':root').style.setProperty('--zoom', zoom);
    for (let i = 0; i < pathCountries.length; i++) {
        pathCountries[i].removeAttribute('class');
    }
}