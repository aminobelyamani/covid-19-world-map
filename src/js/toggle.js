import { _ } from "./exports/global.js";
import { setSwitchValue, switchValue, setProp, onStatsScroll, execProp, dropDownOn, setCurrentTitle, globalHelpTipHandler } from "./main.js";
import { toggleSwitchCases } from "./exports/switches.js";
import { addLegendListeners, changeLegendColors, removeLegendListeners } from "./legend.js";

var switchG = _('switchG'),
    switchCircle = _('switchCircle'),
    casesMenu = _('casesMenu'),
    testsMenu = _('testsMenu'),
    deathsMenu = _('deathsMenu'),
    vaccMenu = _('vaccMenu'),
    testsTitle = _('testsTitle'),
    deathsTitle = _('deathsTitle'),
    vaccTittle = _('vaccTitle');

export var switchWrapper = _('switchWrapper'),
    switchToggle = _('switchSVG');

export function onToggleSVGResize() {
    const width = switchWrapper.offsetWidth;
    const posX = (window.innerWidth <= 768) ? (width - 64) / 2 : 118;
    const matrix = `matrix(1, 0, 0, 1, ${posX}, 42)`;
    switchG.setAttributeNS(null, 'transform', matrix);
    const x = width / 2;
    testsTitle.setAttribute('x', x);
    deathsTitle.setAttribute('x', width - 12);
    vaccTittle.setAttribute('x', x);
}
export function onSwitchClick(e) {
    e = e || window.event;
    if (e.target.className.baseVal === 'switch-titles' || e.target.className.baseVal === 'switch-target-circles') {
        const cat = e.target.getAttribute('data-cat');
        executeSwitch(cat);
    }
}
export function onSwitchTap(e) {
    e = e || window.event;
    const list = [{ cat: "cases", x: 10, y: 32 }, { cat: "tests", x: 32, y: 10 }, { cat: "deaths", x: 54, y: 32 }, { cat: "vaccines", x: 32, y: 54 }];
    const matrix = switchG.transform.baseVal.getItem(0).matrix;
    const offX = e.layerX - matrix.e;
    const offY = e.layerY - matrix.f - 22;
    const record = list.find(circle => (offX - circle.x) < 22 && (offY - circle.y) < 12);
    if (e.target.className.baseVal === 'switch-titles' || e.target.className.baseVal === 'switch-target-circles') {
        const cat = e.target.getAttribute('data-cat');
        executeSwitch(cat);
    }
    else {
        if (record) {
            const cat = record.cat;
            executeSwitch(cat);
        }
    }
}
function executeSwitch(cat) {
    if (switchValue != cat) {
        setSwitchValue(cat);
        statsWrapper.removeEventListener('scroll', onStatsScroll);
        statsWrapper.style.overflowY = 'hidden';
        setProp(toggleSwitchCases(cat).property);
        const color = toggleSwitchCases(cat).color;
        switchG.setAttribute('fill', color);
        const cx = toggleSwitchCases(switchValue).cx;
        const cy = toggleSwitchCases(switchValue).cy;
        switchCircle.setAttribute('cx', 32);
        switchCircle.setAttribute('cy', 32);
        setTimeout(() => {
            switchCircle.setAttribute('cx', cx);
            switchCircle.setAttribute('cy', cy);
        }, 150);
        const titles = switchToggle.querySelectorAll('.switch-titles');
        for (let i = 0; i < titles.length; i++) {
            titles[i].style.opacity = (titles[i].getAttribute('data-cat') === cat) ? 1 : 0.4;
        }
        const menu = toggleSwitchCases(switchValue).menu;
        removeLegendListeners();
        currentData.style.backgroundColor = color;
        setCurrentTitle(toggleSwitchCases(cat).title);
        changeLegendColors(switchValue);
        handleOptionsMenu(menu);
        execProp();
        addLegendListeners();
        globalHelpTipHandler();
        if (dropDownOn) {
            const height = toggleSwitchCases(switchValue).height;
            optionsDiv.style.height = height;
            optionsDiv.style.minHeight = height;
        }
        setTimeout(() => {
            statsWrapper.addEventListener('scroll', onStatsScroll, false);
            statsWrapper.style.overflowY = 'scroll';
            statsWrapper.scrollTop = 0;
        }, 400);
    }
}
function handleOptionsMenu(e) {
    const menus = [casesMenu, testsMenu, deathsMenu, vaccMenu];
    for (let i = 0; i < menus.length; i++) {
        menus[i].style.display = (menus[i] === e) ? 'block' : 'none';
    }
}