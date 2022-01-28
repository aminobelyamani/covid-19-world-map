import { _, createEl } from "./exports/global.js";
import { countriesList, countryCodes, dataSVG, handleMenuBtnColors, loadCountry, menuSwitchBtns, mode, usData, usOn, usSVG } from "./main.js";

var headerTitle = _('headerTitle'),
    searchInput = _('searchInput'),
    closeSearch = _('closeSearch');

export var searchWrapper = _('searchWrapper'),
    resultsWrapper = _('resultsWrapper');

export function onSearchInput(e) {
    e = e || window.event;
    e.preventDefault();
    if (e.key != 'ArrowDown' && e.key != 'ArrowUp' && e.key != 'Enter' && e.key != 'ArrowLeft' && e.key != 'ArrowRight') {
        resultsWrapper.innerHTML = "";
        const dataset = (!usOn) ? countriesList : usData;
        if (dataset.length != 0) {
            const search = this.value.toLowerCase().trim();
            if (search != "") {
                const result = getSearchResults(search);
                addCloseSearch();
                if (result.length != 0) {
                    resultsWrapper.style.visibility = "visible";
                    result.forEach(record => {
                        const svgList = (!usOn) ? dataSVG : usSVG;
                        const flagId = svgList.find(path => path.country === record.country).id;
                        const flagUrl = (flagId === 'ic') ? `https://worldmapcovid19.b-cdn.net/static/images/ic.png` : (flagId === 'us-dc') ? `https://worldmapcovid19.b-cdn.net/static/images/us-dc.png` : `https://flagcdn.com/h40/${flagId}.png`;
                        resultsWrapper.append(appendResult(record, flagUrl));
                    });
                    resultsTransform();
                    const rows = resultsWrapper.querySelectorAll('.results-flex');
                    rows.forEach(row => { row.addEventListener('click', onResultClick, false); });
                }
                else { removeSearchResults(); }
            }
            else { onCloseSearch(); }
        }
    }
    else {
        const rows = resultsWrapper.querySelectorAll('.results-flex');
        if (rows.length > 0) { handleKeysOnSearch(e); }
    }
}

//HANDLE ON CLOSE AND NO RESULT
export function onCloseSearch() {
    removeSearchResults();
    searchInput.value = "";
    closeSearch.style.visibility = "hidden";
    closeSearch.removeEventListener('click', onCloseSearch);
}
function addCloseSearch() {
    closeSearch.style.visibility = "visible";
    closeSearch.addEventListener('click', onCloseSearch, false);
}
function removeSearchResults() {
    resultsWrapper.style.visibility = "hidden";
    resultsWrapper.innerHTML = "";
}

//RESULT
function getSearchResults(search) {
    let result = [];
    const dataSet = (!usOn) ? countriesList : usData;
    const find = ['é', 'ç'];
    const replace = ['e', 'c'];
    const filtered = (!usOn) ? countryCodes.filter(row => row.name.toLowerCase().replaceArray(find, replace).includes(search) || row.country.toLowerCase().replaceArray(find, replace).includes(search) || row.country.toLowerCase().includes(search) || row.alpha2.toLowerCase().includes(search) || row.alpha3.toLowerCase().includes(search)) : usSVG.filter(row => row.country.toLowerCase().includes(search));
    filtered.forEach(row => {
        const record = dataSet.find(country => country.country.toLowerCase() === row.country.toLowerCase());
        if (record) {
            result.push(record);
        }
    });
    return result;
}
function appendResult(record, url) {
    const div = createEl('div', 'results-flex');
    div.setAttribute('data-country', record.country);
    const flag = createEl('div', 'bckg-img inline-flag');
    flag.setAttribute('style', `background-image:url(${url});`);
    const p = createEl('p', 'inline-p');
    p.innerText = record.country;
    div.append(flag);
    div.append(p);
    return div;
}
function onResultClick(e) {
    e = (e.clientY) ? this : e;
    removeResultFocus();
    e.classList.add('results-flex-focus');
    const country = e.getAttribute('data-country');
    loadCountry(country, true);
    onCloseSearch();
    const menuTarget = (usOn) ? 'us' : 'world';
    const target = (window.innerWidth <= 768) ? menuSwitchBtns(menuTarget).btnMobile : menuSwitchBtns(menuTarget).btn;
    handleMenuBtnColors(target);
}
function removeResultFocus() {
    const rows = resultsWrapper.querySelectorAll('.results-flex');
    rows.forEach(row => { row.classList.remove('results-flex-focus'); });
}

//HANDLE ARROWS AND ENTER KEY
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

//RESULTS TRANSFORM
function getOffsets(e) {
    const offsets = { width: e.offsetWidth, left: e.offsetLeft };
    return offsets;
}
export function resultsTransform() {
    resultsWrapper.style.width = `${getOffsets(searchWrapper).width}px`;
    resultsWrapper.style.msTransform = `translateX(${getOffsets(searchWrapper).left}px)`;
    resultsWrapper.style.webkitTransform = `translateX(${getOffsets(searchWrapper).left}px)`;
    resultsWrapper.style.MozTransform = `translateX(${getOffsets(searchWrapper).left}px)`;
    resultsWrapper.style.OTransform = `translateX(${getOffsets(searchWrapper).left}px)`;
    resultsWrapper.style.transform = `translateX(${getOffsets(searchWrapper).left}px)`;
}

//MOBILE SEARCH WRAPPER
export function showSearch() {
    if (window.innerWidth <= 768) {
        if (searchWrapper.classList.length === 1) { expandSearch(); }
        else { collapseSearch(); onCloseSearch(); }
    }
    else { searchInput.focus(); }
}
export function expandSearch() {
    const color = (mode === 'dark') ? '#282828' : '#e6e6e6';
    searchWrapper.classList.add('flex-1');
    closeSearch.classList.remove('no-display');
    searchInput.style.visibility = "visible";
    searchWrapper.style.backgroundColor = color;
    searchWrapper.style.marginRight = "45px";
    headerTitle.classList.add('no-display');
}
function collapseSearch() {
    searchWrapper.classList.remove('flex-1');
    closeSearch.classList.add('no-display');
    searchInput.style.visibility = "hidden";
    searchWrapper.style.backgroundColor = "transparent";
    searchWrapper.style.marginRight = "30px";
    setTimeout(() => { headerTitle.classList.remove('no-display'); }, 300);
}