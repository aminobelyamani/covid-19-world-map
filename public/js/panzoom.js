//GLOBALS
const maxZoom = 20;
var svgEl = _('worldMap'),
    zoomEl = _('gOuter'),
    VBWidth = 2000,
    VBHeight = 1051,//1001 + 50
    initialScale = 0,
    mouseMove = false,
    countryAnim = false,
    prevMatrix = {};
//ZOOM & PAN
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
function setMatrix(p, scale) {
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
function pathStrokeHandler() {
    const zoom = zoomEl.transform.baseVal.getItem(0).matrix.a;
    for (let i = 0; i < pathCountries.length; i++) {
        if (pathCountries[i].getAttribute('data-name')) {//avoid including centerBtn SVG in loop
            pathCountries[i].style.setProperty('--zoom', zoom);
        }
    }
}
function zoomHandler(e) {
    const scale = getWheelDelta(e);
    const p = getCursorPt(e);
    const matrix = setMatrix(p, scale);
    setCTM(zoomEl.getScreenCTM().multiply(matrix));
}
var tapP;
var maxScale;
function tapZoomHandler(e) {
    if (!countryAnim) {
        tapP = getCursorPt(e);
        maxScale = zoomEl.transform.baseVal.getItem(0).matrix.a * 2;
        maxScale = (maxScale > maxZoom) ? maxZoom : maxScale;
        fadeZoom();
    }
}
function fadeZoom() {
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
//MOUSE PAN
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
var trail = svgEl.createSVGPoint();
function fadePan() {
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
    /* document.body.ondragstart = function (e) {
        e.preventDefault();
        return false;
    }; */
}
function onMouseMove(e) {
    mouseMove = true;
    const p = getPanPos(e);
    trail.x = p.x, trail.y = p.y;
    const matrix = setPanMatrix(p);
    setCTM(zoomEl.getScreenCTM().multiply(matrix));
}
function onMouseUp(e) {
    mouseMove = false;
    document.body.removeEventListener('mousemove', onMouseMove);
    document.body.removeEventListener('mouseup', onMouseUp);
    svgEl.removeEventListener('mouseleave', onMouseUp);
    fadePan();
}
//PAN & ZOOM TO COUNTRY ANIMATION
function goToCountry(e) {
    cancelAnimationFrame(fadePan);
    popup.style.display = "none";
    removePopupListeners();
    const pathBox = e;
    zoomToCountry(pathBox);
}
function zoomToCountry(e) {
    clearPage();
    onCloseSearch();
    trail.x = trail.y = touchTrail.x = touchTrail.y = 0;
    getPrevMatrix();
    removeZoomTapListeners();
    const pathBox = e.getBBox();
    const country = e.getAttribute('data-name');
    const alpha2 = e.getAttribute('data-id');
    highlightCountry(country);
    const windowHeight = window.innerHeight + 50;
    const initialMat = zoomEl.transform.baseVal.getItem(0).matrix;
    const initialLimit = Math.min(window.innerWidth - (initialMat.a * pathBox.width), windowHeight - (initialMat.a * pathBox.height));
    const limitSign = Math.sign(initialLimit);
    const centerBoundX = (pathBox.x * initialMat.a) - (window.innerWidth - (pathBox.width * initialMat.a)) / 2;
    const centerBoundY = (pathBox.y * initialMat.a) - (windowHeight - (pathBox.height * initialMat.a)) / 2;
    const finalScale = Math.min(Math.min(((window.innerHeight - 170) / pathBox.height), ((window.innerWidth - 20) / pathBox.width)), maxZoom);//120 for 60px extra padding on top/bottom + 50px header
    panToCountry(initialMat, centerBoundX, centerBoundY);
    const scale = (limitSign === -1) ? 0.85 : 1.15;
    setTimeout(function zoomLoop() {
        zoomEl.classList.remove('ease-out');
        const prevMat = zoomEl.transform.baseVal.getItem(0).matrix;
        const p = svgEl.createSVGPoint();
        p.x = (pathBox.x + pathBox.width / 2) * prevMat.a + prevMat.e;
        p.y = (pathBox.y + pathBox.height / 2) * prevMat.d + prevMat.f;
        const matrix = zoomEl.getScreenCTM().multiply(setMatrix(p, scale));
        if (limitSign === -1) {
            if (matrix.a >= finalScale) {
                const transform = `matrix(${matrix.a},${matrix.b},${matrix.c},${matrix.d},${matrix.e},${matrix.f})`;
                zoomEl.setAttributeNS(null, 'transform', transform);
                requestAnimationFrame(zoomLoop);
            }
            else {
                cancelAnimationFrame;
                pathStrokeHandler();
                closePopup.addEventListener('mouseup', onClosePopup, false);
            }
        }
        else {
            if (matrix.a <= finalScale) {
                const transform = `matrix(${matrix.a},${matrix.b},${matrix.c},${matrix.d},${matrix.e},${matrix.f})`;
                zoomEl.setAttributeNS(null, 'transform', transform);
                requestAnimationFrame(zoomLoop);
            }
            else {
                cancelAnimationFrame;
                pathStrokeHandler();
                closePopup.addEventListener('mouseup', onClosePopup, false);
            }
        }
    }, 350);
    setTimeout(() => {
        showCountryPopup(country, alpha2);
    }, 500);
}
function highlightCountry(country) {
    for (let i = 0; i < pathCountries.length; i++) {
        if (pathCountries[i].getAttribute('data-name')) {
            if (pathCountries[i].getAttribute('data-name') === country) {
                pathCountries[i].classList.add('light-path');
            }
            else {
                pathCountries[i].classList.add('dark-path');
            }
        }
    }
}
function panToCountry(m, x, y) {
    const transform = `matrix(${m.a},${m.b},${m.c},${m.d},${-x},${-y})`;
    zoomEl.classList.add('ease-out');
    zoomEl.setAttributeNS(null, 'transform', transform);
}
function zoomToCountryNoAnim(e, noPrevMat) {
    trail.x = trail.y = touchTrail.x = touchTrail.y = 0;
    cancelAnimationFrame(fadePan);
    if (!noPrevMat) { getPrevMatrix(); }
    removeZoomTapListeners();
    removePopupListeners();
    const pathBox = e.getBBox();
    const country = e.getAttribute('data-name');
    const alpha2 = e.getAttribute('data-id');
    highlightCountry(country);
    const windowHeight = window.innerHeight + 50;
    const scale = Math.min(Math.min(((window.innerHeight - 170) / pathBox.height), ((window.innerWidth - 20) / pathBox.width)), maxZoom);//120 for 60px header
    const centerBoundX = (pathBox.x * scale) - (window.innerWidth - (pathBox.width * scale)) / 2;
    const centerBoundY = (pathBox.y * scale) - (windowHeight - (pathBox.height * scale)) / 2;
    const transform = `matrix(${scale},${0},${0},${scale},${-centerBoundX},${-centerBoundY})`;
    zoomEl.setAttributeNS(null, 'transform', transform);
    pathStrokeHandler();
    clearPage();
    if (chartOn) { removeChartListeners(); removeGlobalChartListeners(); chartOn = false; }
    showCountryPopup(country, alpha2);
    closePopup.addEventListener('mouseup', onClosePopup, false);
}
function getPrevMatrix() {
    const matrix = zoomEl.transform.baseVal.getItem(0).matrix;
    prevMatrix.scale = matrix.a;
    prevMatrix.x = matrix.e;
    prevMatrix.y = matrix.f;
}
//CENTER & RESIZE
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
        showGlInstructions();
    }
}
function onResize() {
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
    if (window.innerWidth > 768) {
        globalHelpTip.style.top = "unset";
    }
    else {
        globalHelpTip.style.top = (is_touch_device) ? "70px" : "50px";
        if (resultsWrapper.innerText.length > 0) { expandSearch(); }
    }
    resultsTransform();
    addHeader();
    pathStrokeHandler();
    onLegendResize(globalRangeList);
    onToggleSVGResize();
}
onResize();
fadeIn(mapDiv);
window.addEventListener("resize", onResize, false);