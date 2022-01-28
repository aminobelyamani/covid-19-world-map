import { onMenuBtn } from "./main.js";

export function loadUrl(onInterval) {
    var url;
    var origUrl = window.location.pathname;
    const last = origUrl.charAt(origUrl.length - 1);
    if (last === '/') { url = origUrl.slice(0, -1); }
    else { url = origUrl; }
    const target = (url.includes('/usa/')) ? 'us' : 'world';
    const sliceNum = (url.includes('/usa/')) ? 5 : 1;
    url = (url === '/reunion' || url === '/curacao' || url === '/timor-leste' || url === '/guinea-bissau' || url === '/s-korea' || url === '/st-vincent-grenadines') ? switchUrl(url) : url.replace(/-/g, ' ').slice(sliceNum);
    url = url.replace('/', '');
    if (url.length > 1) {
        if (url != 'about') { onMenuBtn(target, url, onInterval); }
        else { onMenuBtn('about', false, onInterval); }
    }
}
export function onPopState(e) {
    if (e.state === null) { return; }
    if (e.state.hasOwnProperty('country') && e.state.country === null) {//world & us pages
        const target = (e.state.usOn === true) ? 'us' : 'world';
        onMenuBtn(target, false, true);
        return;
    }
    if (e.state.hasOwnProperty('page')) { return onMenuBtn(e.state.page, false, true); }
    if (e.state.hasOwnProperty('country') && e.state.country != null) {
        const target = (e.state.usOn === true) ? 'us' : 'world';
        onMenuBtn(target, e.state.country, true);
    }
}
function switchUrl(url) {
    let newUrl = '';
    switch (url) {
        case '/reunion':
            newUrl = 'réunion';
            break;
        case '/curacao':
            newUrl = 'curaçao';
            break;
        case '/timor-leste':
            newUrl = 'timor-leste';
            break;
        case '/guinea-bissau':
            newUrl = 'guinea-bissau';
            break;
        case '/s-korea':
            newUrl = 's. korea';
            break;
        case '/st-vincent-grenadines':
            newUrl = 'st. vincent grenadines';
    }
    return newUrl;
}