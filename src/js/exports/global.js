export function _(x) {
    return document.getElementById(x);
}
export function createEl(tag, classes) {
    const el = document.createElement(tag);
    el.setAttribute('class', classes);
    return el;
}
export function createSVGEl(tag, classes) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    el.setAttribute('class', classes);
    return el;
}

//FADE IN/FADE OUT
export function fadeOut(e, opLimit) {
    opLimit = opLimit || 1;
    e.style.opacity = opLimit;
    (function fade(x) {
        (e.style.opacity -= 0.1) < 0 ? e.classList.add('no-display') : setTimeout(fade, 40);
    })();
}
export function fadeIn(e, flex, opLimit) {
    e.classList.remove('no-display');
    if (flex) { e.classList.add('flex-container'); }
    let opacity = 0;
    opLimit = opLimit || 1;
    var interval = setInterval(() => {
        if (opacity < opLimit) {
            opacity += 0.1;
            e.style.opacity = opacity;
        }
        else { clearInterval(interval); }
    }, 40);
}

//CHART LOADER
export function appendChartLoader() {
    const wrapper = createEl('div', 'flex-container');
    wrapper.setAttribute('id', 'chartLoader');
    const loader = createEl('div', 'chart-loader');
    wrapper.append(loader);
    return wrapper;
}

//CURRENT DATE
export function formatTime() {//for update timestamp
    var todayTime = new Date();
    var hours = todayTime.getHours().toString().length == 1 ? '0' + todayTime.getHours() : todayTime.getHours();
    var minutes = todayTime.getMinutes().toString().length == 1 ? '0' + todayTime.getMinutes() : todayTime.getMinutes();
    var seconds = todayTime.getSeconds().toString().length == 1 ? '0' + todayTime.getSeconds() : todayTime.getSeconds();
    return hours + ":" + minutes + ":" + seconds;
}
export function formatDate(date, short) {//for daily dates on charts
    date = date.split('-');
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return (!short) ? months[date[1] - 1] + ' ' + Number(date[2]) + ', ' + date[0] : months[date[1] - 1] + ' ' + Number(date[2]);
}

//ADD COMMAS TO NUMBER
String.prototype.commaSplit = function () {
    return this.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};
Number.prototype.commaSplit = String.prototype.commaSplit;

//COUNT DECIMAL PLACES IN NUMBER
Number.prototype.countDecimals = function () {
    if (Math.floor(this.valueOf()) === this.valueOf()) return 0;
    return this.toString().split(".")[1].length || 0;
};

//ROUNDING NUMBERS
export function roundVal(value, precision) {
    const multiplier = Math.pow(10, precision || 0);
    return Math.ceil(value * multiplier) / multiplier;
}
export function floorVal(value, precision) {
    const multiplier = Math.pow(10, precision || 0);
    return Math.floor(value * multiplier) / multiplier;
}

//REPLACE ARRAY OF CHARACTERS
String.prototype.replaceArray = function (find, replace) {
    var replaceString = this;
    var regex;
    for (var i = 0; i < find.length; i++) {
        regex = new RegExp(find[i], "g");
        replaceString = replaceString.replace(regex, replace[i]);
    }
    return replaceString;
};