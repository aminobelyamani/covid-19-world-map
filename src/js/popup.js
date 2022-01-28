import { _, createEl } from './exports/global.js';
import { pathCountries, sortList } from "./data.js";
import { is_touch_device, countriesList, usData, usOn, dataSVG, usSVG, prop, zoomEl } from "./main.js";
import { rawTotalSwitch } from './exports/switches.js';
import { goToCountry } from './profile.js';
import { fadeZoom } from './panzoom.js';

export var countryAnim = false,
    mouseMove = false;

export function setMouseMove(val) {
    mouseMove = val;
}

export var popup = _('popup');

export function addPopupListeners() {
    countryAnim = false;
    for (let i = 0; i < pathCountries.length; i++) {
        if (!is_touch_device) { pathCountries[i].addEventListener('mouseover', pathHover, false); }
    }
    if (!is_touch_device) { document.addEventListener('mousemove', pathMove, false); }
}
export function removePopupListeners() {
    countryAnim = true;
    for (let i = 0; i < pathCountries.length; i++) {
        if (!is_touch_device) { pathCountries[i].removeEventListener('mouseover', pathHover); }
    }
    if (!is_touch_device) { document.removeEventListener('mousemove', pathMove); }
    popup.classList.add('no-display');
}
function pathHover(e) {
    const dataset = (!usOn) ? countriesList : usData;
    this.addEventListener('mouseup', onPathClick, false);
    this.addEventListener('mouseout', pathNoHover, false);
    if (dataset.length != 0 && prop != "") {
        const country = this.getAttribute('data-name');
        getPopupInfo(country);
    }
}
function pathNoHover(e) {
    this.removeEventListener('mouseup', onPathClick);
    this.removeEventListener('mouseout', pathNoHover);
}
export function pathMove(e) {
    if (mouseMove || e.target.parentNode !== zoomEl) { return popup.classList.add('no-display'); }
    var eventDoc, doc, body;
    e = e || window.event; // IE-ism
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
    popup.classList.remove('no-display');
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
export function getPopupInfo(country) {
    const svgList = (!usOn) ? dataSVG : usSVG;
    const flagId = svgList.find(path => path.country === country).id;
    const flagUrl = (flagId === 'ic') ? `https://worldmapcovid19.b-cdn.net/static/images/ic.png` : (flagId === 'us-dc') ? `https://worldmapcovid19.b-cdn.net/static/images/us-dc.png` : `https://flagcdn.com/h40/${flagId}.png`;
    const data = (!usOn) ? countriesList : usData;
    const record = sortList(data).find(data => data.country === country);
    if (!record) { return appendPopup(country, flagUrl, true); }
    const rank = record.rank;
    const stat = record[prop].commaSplit();
    const totalProp = rawTotalSwitch(prop).totalProp;
    const title = rawTotalSwitch(prop).title;
    const rawTotal = record[totalProp].commaSplit();
    appendPopup(country, flagUrl, false, title, stat, rank, rawTotal);
}
function appendPopup(country, flagUrl, noData, title, stat, rank, rawTotal) {
    popup.innerHTML = '';
    const flag = createEl('div', 'flag bckg-img');
    const header = createEl('p', 'popup country white');
    flag.setAttribute('style', `background-image:url(${flagUrl});`);
    header.innerText = country;
    popup.append(flag);
    popup.append(header);
    if (noData) {
        const p = createEl('p', 'popup-small yellow');
        p.innerText = 'No Reported Data';
        return popup.append(p);
    }
    popup.append(appendPopupStat(title, stat));
    popup.append(appendPopupStat('Rank', rank));
    if ((prop === 'testsPerMil' || prop === 'totalTests' || prop === 'population' || prop === 'totalVaccinations')) { return; }
    popup.append(appendPopupStat('Raw Total', rawTotal));
}
function appendPopupStat(title, stat) {
    const div = createEl('div', 'popup-flex');
    const p1 = createEl('p', 'popup-small gray');
    const p2 = createEl('p', 'popup-big white');
    p1.innerText = title;
    p2.innerText = stat;
    div.append(p1);
    div.append(p2);
    return div;
}
function onPathClick(e) {
    if (!mouseMove) {
        cancelAnimationFrame(fadeZoom);
        const country = this.getAttribute('data-name');
        const dataset = (!usOn) ? countriesList : usData;
        if (dataset.find(data => data.country === country)) { goToCountry(this); }
    }
}