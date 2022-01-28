import { _ } from "./exports/global.js";
import { clearLegendHover, onLegendResize } from "./legend.js";
import { globalRangeList, is_touch_device, svgEl, zoomEl, VBWidth, VBHeight, addHeader, closeSideBar, onMaps, sideBar, globalInstructions, globalHelpTip, removeHeader, usOn, countriesList, usData, addRemoveHeader, showGlInstructions, currentData } from "./main.js";
import { addPopupListeners, countryAnim, getPopupInfo, pathMove, popup, removePopupListeners, setMouseMove } from "./popup.js";
import { goToCountry } from "./profile.js";
import { expandSearch, resultsTransform } from "./search.js";
import { onToggleSVGResize, switchToggle, switchWrapper } from "./toggle.js";


export const maxZoom = 20;
const prevMatrix = {};
var trail,
    initialScale = 0;

//HAMMER GLOBAL VARIABLES
var taptime, hammertime, presstime;

export var sidebartime;

//TOUCH GLOBAL VARIABLES
var touchTrail, fadeTrail, prevP;
var prevScale = 0;

export function addZoomTapListeners() {
    if (!is_touch_device) {
        svgEl.addEventListener('mousedown', onMouseDown, false);
        svgEl.addEventListener('dblclick', tapZoomHandler, false);
        svgEl.addEventListener('onwheel' in document ? 'wheel' : 'onmousewheel' in document ? 'mousewheel' : 'DOMMouseScroll', zoomHandler, false);
        initNoTouchTrail();
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
        sidebartime.on('pan', onSideBarPan);
        currentData.addEventListener('touchend', addRemoveHeader, false);
        initTrails();
    }
    centerBtn.addEventListener('click', centerMap, false);
}
export function removeZoomTapListeners() {
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
        sidebartime.off('pan', onSideBarPan);
        currentData.removeEventListener('touchend', addRemoveHeader);
        resetTouchTrails();
    }
    centerBtn.removeEventListener('click', centerMap);
}

//INITIALIZE TRAILS
function initNoTouchTrail() {
    trail = svgEl.createSVGPoint();
    trail.x = trail.y = 0;
}
function initTrails() {
    touchTrail = svgEl.createSVGPoint();
    fadeTrail = svgEl.createSVGPoint();
    prevP = svgEl.createSVGPoint();
    resetTouchTrails();
}
function resetTouchTrails() {
    fadeTrail.x = fadeTrail.y = touchTrail.x = touchTrail.y = prevP.x = prevP.y = 0;
}

////MOUSE HANDLING
//PAN
function getPanPos(e) {
    const initialMat = zoomEl.transform.baseVal.getItem(0).matrix;
    const p = svgEl.createSVGPoint();
    p.x = e.movementX / initialMat.a;
    p.y = e.movementY / initialMat.d;
    return p;
}
function setPanMatrix(p) {
    const zoomMat = svgEl.createSVGMatrix()
        .translate(p.x, p.y);
    return zoomMat;
}
export function fadePan() {
    const rate = 0.06;//rate of decay
    trail.x = trail.x * (1 - rate);
    trail.y = trail.y * (1 - rate);
    if (Math.floor(Math.abs(trail.x)) != 0 || Math.floor(Math.abs(trail.y)) != 0) {
        const matrix = setPanMatrix(trail);
        setCTM(zoomEl.getScreenCTM().multiply(matrix));
        requestAnimationFrame(fadePan);
    }
    else {
        cancelAnimationFrame;
    }
}
function onMouseDown(e) {
    cancelAnimationFrame(fadePan);
    trail.x = 0, trail.y = 0;
    document.body.addEventListener('mousemove', onMouseMove);
    document.body.addEventListener('mouseup', onMouseUp);
    svgEl.addEventListener('mouseleave', onMouseUp, false);
}
function onMouseMove(e) {
    e = e || window.event;
    setMouseMove(true);
    const p = getPanPos(e);
    trail.x = p.x, trail.y = p.y;
    const matrix = setPanMatrix(p);
    setCTM(zoomEl.getScreenCTM().multiply(matrix));
}
function onMouseUp(e) {
    e = e || window.event;
    setMouseMove(false);
    document.body.removeEventListener('mousemove', onMouseMove);
    document.body.removeEventListener('mouseup', onMouseUp);
    svgEl.removeEventListener('mouseleave', onMouseUp);
    fadePan();
}

//ZOOM
function getWheelDelta(e) {
    const delta = -(e.deltaY ? e.deltaY : e.wheelDeltaY ? e.wheelDeltaY : e.detail);
    if (delta % 1 !== 0) {//check if delta is a float (pinch), instead of int (wheel)
        e.preventDefault();//prevent default pinch zoom
        return Math.pow(10, delta / 360);
    }
    return Math.pow(1.2, delta / 360);;
}
function getCursorPt(e) {
    const p = svgEl.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    return p;
}
export function setMatrix(p, scale) {
    p = p.matrixTransform(zoomEl.getScreenCTM().inverse());
    p.x = Math.min(p.x, VBWidth);
    p.y = Math.min(p.y, VBHeight);
    const zoomMat = svgEl.createSVGMatrix()
        .translate(p.x, p.y)
        .scale(scale)
        .translate(-p.x, -p.y);
    return zoomMat;
}
function setCTM(m) {
    const windowHeight = window.innerHeight + 50;
    const rightBound = window.innerWidth - (m.a * VBWidth);
    const bottomBound = windowHeight - (m.a * VBHeight);
    m.e = (m.e >= 0) ? (rightBound < 0) ? 0 : rightBound / 2 : (rightBound > 0) ? rightBound : Math.max(m.e, rightBound);
    m.f = (m.f >= 50) ? (bottomBound < 0) ? 50 : Math.max(50, bottomBound / 2) : (bottomBound > 0) ? bottomBound / 2 : Math.max(m.f, bottomBound);
    if (m.a <= maxZoom && m.a >= initialScale) {
        const transform = `matrix(${m.a},${m.b},${m.c},${m.d},${m.e},${m.f})`;
        zoomEl.setAttributeNS(null, 'transform', transform);
    }
    pathStrokeHandler();
}
export function pathStrokeHandler() {
    const zoom = zoomEl.transform.baseVal.getItem(0).matrix.a;
    document.querySelector(':root').style.setProperty('--zoom', zoom);
}
function zoomHandler(e) {
    e = e || window.event;
    const scale = getWheelDelta(e);
    const p = getCursorPt(e);
    const matrix = setMatrix(p, scale);
    setCTM(zoomEl.getScreenCTM().multiply(matrix));
}
var tapP;
var maxScale;
function tapZoomHandler(e) {
    e = e || window.event;
    if (!countryAnim) {
        tapP = getCursorPt(e);
        maxScale = zoomEl.transform.baseVal.getItem(0).matrix.a * 2;
        maxScale = (maxScale > maxZoom) ? maxZoom : maxScale;
        fadeZoom();
    }
}
export function fadeZoom() {
    const currentScale = zoomEl.transform.baseVal.getItem(0).matrix.a;
    const perc = Math.floor((currentScale / maxScale) * 100);
    if (perc < 90) {
        const matrix = setMatrix(tapP, 1.05);
        setCTM(zoomEl.getScreenCTM().multiply(matrix));
        requestAnimationFrame(fadeZoom);
    }
    else {
        cancelAnimationFrame;
    }
}


//GET PREVIOUS MATRIX
export function getPrevMatrix() {
    const matrix = zoomEl.transform.baseVal.getItem(0).matrix;
    prevMatrix.scale = matrix.a;
    prevMatrix.x = matrix.e;
    prevMatrix.y = matrix.f;
}
export function setPrevMapState() {
    const transform = `matrix(${prevMatrix.scale}, 0, 0, ${prevMatrix.scale}, ${prevMatrix.x}, ${prevMatrix.y})`;
    zoomEl.setAttributeNS(null, 'transform', transform);
    pathStrokeHandler();
}

////TOUCH HANDLING
export function touchEvents(newHammer) {
    //GLOBAL
    if (newHammer) { hammertime.off('doubletap').destroy(); presstime.off('doubletap').destroy(); sidebartime.off('pan').destroy(); }
    taptime = new Hammer(document);
    //ZOOM & PAN
    hammertime = new Hammer(svgEl);
    hammertime.get('pinch').set({ enable: true });
    //PRESS FOR COUNTRY POPUP
    presstime = new Hammer(zoomEl);
    if (window.innerWidth <= 768) { closeSideBar(); }
    //SIDEBAR
    sidebartime = new Hammer(sideBar);
    sidebartime.get('pan').set({ direction: Hammer.DIRECTION_VERTICAL });
}
function onDocTap(e) {
    if (e.tapCount >= 1) {
        if (e.target.parentNode != _('legendColors') && onMaps) { clearLegendHover(); }
        else if (e.target.parentNode != zoomEl) { popup.classList.add('no-display'); }
    }
}
function onPinchZoom(e) {
    popup.classList.add('no-display');
    const p = getTouchPoint(e);
    const scale = (prevScale === 0) ? e.scale - prevScale : (e.scale - prevScale) + 1;
    prevScale = e.scale;
    const matrix = setMatrix(p, scale);
    setCTM(zoomEl.getScreenCTM().multiply(matrix));
    const currentMat = zoomEl.transform.baseVal.getItem(0).matrix;
    if ((currentMat.a - initialScale) < 0.1) {
        if (window.innerWidth <= 768) { addHeader(); }
        globalInstructions.classList.remove('transform-y-260');
        globalHelpTip.style.top = (globalInstructions.classList.contains('transform-y-260')) ? "50px" : "70px";
    }
    else {
        if (window.innerWidth <= 768) { removeHeader(); }
        globalInstructions.classList.add('transform-y-260');
    }
}
function getTouchPoint(e) {
    const p = svgEl.createSVGPoint();
    p.x = e.center.x;
    p.y = e.center.y;
    return p;
}
function onPinchEnd(e) {
    prevScale = 0;
}
function onTapZoom(e) {
    if (e.tapCount === 2 && !countryAnim) {
        if (window.innerWidth <= 768) { removeHeader(); }
        globalInstructions.classList.add('transform-y-260');
        tapP = getTouchPoint(e);
        maxScale = zoomEl.transform.baseVal.getItem(0).matrix.a * 2;
        maxScale = (maxScale > maxZoom) ? maxZoom : maxScale;
        fadeZoom();
        popup.classList.add('no-display');
    }
}
function onTapPopup(e) {
    if (e.tapCount === 1) {
        const country = e.target.getAttribute('data-name');
        getPopupInfo(country);
        pathMove(e);
    }
}
function onPress(e) {
    const country = e.target.getAttribute('data-name');
    const dataset = (!usOn) ? countriesList : usData;
    if (dataset.find(data => data.country === country)) {
        popup.classList.add('no-display');
        clearLegendHover();
        cancelAnimationFrame(fadeTouchPan);
        goToCountry(e.target);
    }
}
export function fadeTouchPan() {
    touchTrail.x = touchTrail.y = 0;
    const rate = 0.06;//rate of decay
    fadeTrail.x = fadeTrail.x * (1 - rate);
    fadeTrail.y = fadeTrail.y * (1 - rate);
    if (Math.floor(Math.abs(fadeTrail.x)) != 0 || Math.floor(Math.abs(fadeTrail.y)) != 0) {
        const matrix = setPanMatrix(fadeTrail);
        setCTM(zoomEl.getScreenCTM().multiply(matrix));
        requestAnimationFrame(fadeTouchPan);
    }
    else {
        fadeTrail.x = fadeTrail.y = prevP.x = prevP.y = 0;
        cancelAnimationFrame;
    }
}
function onPanStart(e) {
    popup.classList.add('no-display');
    fadeTrail.x = fadeTrail.y = touchTrail.x = touchTrail.y = prevP.x = prevP.y = 0;
    cancelAnimationFrame(fadeTouchPan);
}
function onPan(e) {
    if (e.maxPointers === 1) {
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
}
function onPanEnd(e) {
    if (e.maxPointers > 1) { return fadeTrail.x = fadeTrail.y = touchTrail.x = touchTrail.y = prevP.x = prevP.y = 0; }
    else {
        fadeTrail.x = touchTrail.x;
        fadeTrail.y = touchTrail.y;
        fadeTouchPan();
    }
}
function onSideBarPan(e) {
    if ((e.target.parentNode === switchWrapper || e.target.parentNode === switchToggle)) {
        const delta = -(e.deltaY) / 4;
        if (!Number.isNaN(delta)) { statsWrapper.scrollTop += delta; }
    }
}

//CENTER MAP
function centerMap() {
    const windowHeight = window.innerHeight + 50;
    const rightBound = (window.innerWidth - (initialScale * VBWidth));
    const bottomBound = windowHeight - (initialScale * VBHeight);
    const gMatrix = zoomEl.transform.baseVal.getItem(0).matrix;
    const p = svgEl.createSVGPoint();
    p.x = rightBound / 2;
    p.y = bottomBound / 2;
    const scale = 0.9;
    const matrix = setMatrix(p, scale);
    setCTM(zoomEl.getScreenCTM().multiply(matrix));
    if ((gMatrix.a - initialScale) > 0.1) {
        removePopupListeners();
        removeZoomTapListeners();
        requestAnimationFrame(centerMap);
    }
    else {
        onResize();
        addHeader();
        cancelAnimationFrame;
        removeZoomTapListeners();
        addZoomTapListeners();
        removePopupListeners();
        addPopupListeners();
    }
}

//RESIZE
export function onResize() {
    const vh = window.innerHeight / 100;
    document.querySelector(':root').style.setProperty('--vh', vh + 'px');
    const scaleX = window.innerWidth / VBWidth;
    const scaleY = (window.innerHeight - 50) / VBHeight;
    initialScale = Math.min(scaleX, scaleY);
    prevMatrix.scale = initialScale;
    const windowHeight = window.innerHeight + 50;
    const posX = Math.abs((window.innerWidth - (initialScale * VBWidth)) / 2);
    const posY = Math.abs((windowHeight - (initialScale * VBHeight)) / 2);
    prevMatrix.x = posX;
    prevMatrix.y = posY;
    const matrix = `matrix(${initialScale}, 0, 0, ${initialScale}, ${posX}, ${posY})`;
    zoomEl.setAttributeNS(null, 'transform', matrix);
    if (window.innerWidth > 768) { globalHelpTip.style.top = "unset"; }
    else {
        globalHelpTip.style.top = (is_touch_device) ? "70px" : "50px";
        if (resultsWrapper.innerText.length > 0) { expandSearch(); }
    }
    resultsTransform();
    addHeader();
    pathStrokeHandler();
    onLegendResize(globalRangeList);
    onToggleSVGResize();
    showGlInstructions();
}