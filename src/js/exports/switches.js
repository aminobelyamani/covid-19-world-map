import { mode, usOn } from "../main.js";
import { _ } from "./global.js";

var casesMenu = _('casesMenu'),
    testsMenu = _('testsMenu'),
    deathsMenu = _('deathsMenu'),
    vaccMenu = _('vaccMenu');

export function toggleSwitchCases(cat) {
    let cx, cy, color, menu, property, title, height, btns, colors;
    switch (cat) {
        case 'cases':
            cx = 10;
            cy = 32;
            color = '#54cbf2';
            menu = casesMenu;
            property = 'newCasesPerMil';
            title = `Today's Cases/Mill`;
            height = '280px';//40 * 7 (number of menu options)
            btns = '.cases-btns';
            colors = ['#d6f5ff', '#96dcf4', '#54cbf2', '#04abe3', '#038ebc', '#035e79', '#013544'];
            break;
        case 'tests':
            cx = 32;
            cy = 10;
            color = '#f4bc68';
            menu = testsMenu;
            property = 'testsPerMil';
            title = 'Tests/Mill';
            height = '160px';
            btns = '.tests-btns';
            colors = ['#fbebd1', '#f9d7a4', '#f4bc68', '#f9ad3b', '#ff9700', '#c57603', '#844f01'];
            break;
        case 'deaths':
            cx = 54;
            cy = 32;
            color = '#f6584c';
            menu = deathsMenu;
            property = 'newDeathsPerMil';
            title = `Today's Deaths/Mill`;
            height = '200px';
            btns = '.deaths-btns';
            colors = ['#ffe9e7', '#fcd2cd', '#ffada6', '#fd8177', '#f6584c', '#bd4137', '#9e251b'];
            break;
        case 'vaccines':
            cx = 32;
            cy = 54;
            color = '#4cf6af';
            menu = vaccMenu;
            property = 'percFullyVacc';
            title = 'Fully Vaccinated';
            height = '200px';
            btns = '.vacc-btns';
            colors = ['#e2fdf1', '#bafbdf', '#89f9ca', '#4cf6af', '#33a976', '#1f6949', '#0e2f20'];
    }
    return { cx, cy, color, menu, property, title, height, btns, colors };
}
export function rawTotalSwitch(property) {
    let totalProp, title, colorClass;
    switch (property) {
        case 'casesPerMil':
            totalProp = 'totalCases';
            title = 'Cases/Mill';
            colorClass = '';//for countryPopup prop-title
            break;
        case 'newCasesPerMil':
            totalProp = 'newCases';
            title = `Today's Cases/Mill`;
            colorClass = '';
            break;
        case 'yestCasesPerMil':
            totalProp = 'yestCases';
            title = `Yesterday's Cases/Mill`;
            colorClass = '';
            break;
        case 'percRecovered':
            totalProp = 'totalRecovered';
            title = '% Recovered';
            colorClass = '';
            break;
        case 'percActive':
            totalProp = 'activeCases';
            title = '% Active';
            colorClass = '';
            break;
        case 'percCritical':
            totalProp = 'seriousCritical';
            title = '% Critical';
            colorClass = '';
            break;
        case 'deathsPerMil':
            totalProp = 'totalDeaths';
            title = 'Deaths/Mill';
            colorClass = '';
            break;
        case 'newDeathsPerMil':
            totalProp = 'newDeaths';
            title = `Today's Deaths/Mill`;
            colorClass = 'red';
            break;
        case 'yestDeathsPerMil':
            totalProp = 'yestDeaths';
            title = `Yesterday's Deaths/Mill`;
            colorClass = 'red';
            break;
        case 'percDeaths':
            totalProp = 'totalDeaths';
            title = 'Case Fatality Rate';
            colorClass = 'red';
            break;
        case 'testsPerMil':
            totalProp = 'totalTests';
            title = 'Tests/Mill';
            colorClass = 'yellow-test';
            break;
        case 'totalTests':
            totalProp = 'totalTests';
            title = 'Total Tests';
            colorClass = '';
            break;
        case 'population':
            totalProp = 'population';
            title = 'Population';
            colorClass = '';
            break;
        case 'totalVaccinations':
            totalProp = 'totalVaccinations';
            title = 'Total Vaccinations';
            colorClass = 'green';
            break;
        case 'percVacc':
            totalProp = 'partiallyVaccinated';
            title = '% Partially Vaccinated';
            colorClass = 'green';
            break;
        case 'percFullyVacc':
            totalProp = 'peopleFullyVaccinated';
            title = '% Fully Vaccinated';
            colorClass = 'green';
            break;
        case 'percBoosted':
            totalProp = 'totalBoosters';
            title = '% Boosted';
            colorClass = 'green';
    }
    return { totalProp, title, colorClass };
}
export function pieSwitch(title) {
    let property;
    switch (title) {
        case 'Total Recovered':
            property = 'totalRecovered';
            break;
        case 'Active Cases':
            property = 'activeCases';
            break;
        case 'Critical Cases':
            property = 'seriousCritical';
            break;
        case 'People Fully Vaccinated':
            property = 'percFullyVacc';
            break;
        case 'People Partially Vaccinated':
            property = 'percVacc';
            break;
        case 'People Boosted':
            property = 'percBoosted';
            break;
        case 'Total Deaths':
            property = 'totalDeaths';
    }
    return property;
}
export function dropDownSwitch(property) {
    let p = '';
    switch (property) {
        case 'casesPerMil':
            p = `This is the reported total cumulative count of detected, laboratory, and sometimes (depending on the ${(usOn) ? 'state' : 'country'} reporting them and the criteria adopted at the time) also clinical cases. Depending on the ${(usOn) ? 'state' : 'country'} reporting standards, this number can also include presumptive, suspect, or probable cases of detected infection.`;
            break;
        case 'newCasesPerMil':
            p = `Every ${(usOn) ? 'state' : 'country'} reports their daily new cases at different times in the day. The daily data by all reporting ${(usOn) ? 'states' : 'countries'} resets every day after midnight GMT.`;
            break;
        case 'yestCasesPerMil':
            p = "This is yesterday's reported count of positive COVID-19 cases.";
            break;
        case 'percRecovered':
            p = 'This is the percent of cases that have recovered from the disease. This statistic is highly imperfect, because reporting can be missing, incomplete, incorrect, based on different definitions, or dated (or a combination of all of these) for many governments, both at the local and national level, sometimes with differences between states within the same country or counties within the same state. ';
            break;
        case 'percActive':
            p = 'This figure represents the current number of people detected and confirmed to be infected with the virus. This figure can increase or decrease, and represents an important metric for public health and emergency response authorities when assessing hospitalization needs versus capacity.';
            break;
        case 'percCritical':
            p = `This is the percent of current active cases that are in critical condition. This statistic is imperfect, for many reasons. When 99% of the cases were in China, the figure pretty much corresponded to the Chinese NHC's reported number of "severe" cases. Today, it represents for the most part the number of patients currently being treated in Intensive Care Unit (ICU), if and when this figure is reported.`;
            break;
        case 'testsPerMil':
        case 'totalTests':
            p = `This statistic is imperfect, because some ${(usOn) ? 'states' : 'countries'} report tests performed, while others report the individuals tested.`;
            break;
        case 'deathsPerMil':
            p = `This is the reported total cumulative count of deaths caused by COVID-19. Due to limited testing, challenges in the attribution of the cause of death, and varying methods of reporting in some ${(usOn) ? 'states' : 'countries'}, this is an imperfect statistic.`;
            break;
        case 'newDeathsPerMil':
            p = `Every ${(usOn) ? 'state' : 'country'} reports their daily new deaths at different times in the day. The daily data by all reporting ${(usOn) ? 'states' : 'countries'} resets every day after midnight GMT.`;
            break;
        case 'yestDeathsPerMil':
            p = "This is yesterday's reported count of deaths caused by COVID-19.";
            break;
        case 'percDeaths':
            p = `The Case Fatality rate (CFR) represents the proportion of cases who eventually die from the disease. This statistic for each ${(usOn) ? 'state' : 'country'} is imperfect, since it is based on both the total number of reported cases and deaths, both of which depend on the respective ${(usOn) ? 'states' : 'countries'}' reporting criteria. Globally, the WHO has estimated the coronavirus' CFR at <strong>2%</strong>. For comparison, the CFR for SARS was <strong>10%</strong>, and for MERS <strong>34%</strong>.`;
            break;
        case 'percVacc':
            p = `This is the percent of population that received at least one vaccine dose, but has <strong>NOT</strong> received all doses presribed by the vaccination protocol. This metric is not being made available by all reporting ${(usOn) ? 'states' : 'countries'}, so a 0 result does <strong>NOT</strong> necessarily mean there are no people vaccinated in the respective ${(usOn) ? 'state' : 'country'}.<br><br>This metric can <strong>DECREASE</strong> as people receive all doses.`;
            break;
        case 'percFullyVacc':
            p = `This is the percent of population that received <strong>ALL</strong> doses prescribed by the vaccination protocol. This metric is not being made available by all reporting ${(usOn) ? 'states' : 'countries'}, so a 0 result does <strong>NOT</strong> necessarily mean there are no people vaccinated in the respective ${(usOn) ? 'state' : 'country'}.`;
            break;
        case 'percBoosted':
            p = `This is the percent of population that received a booster dose. This metric is not being made available by all reporting ${(usOn) ? 'states' : 'countries'}, so a 0 result does <strong>NOT</strong> necessarily mean there are no people boosted in the respective ${(usOn) ? 'state' : 'country'}.`;
            break;
        case 'totalVaccinations':
            p = 'This figure represents the total number of doses administered, it does <strong>NOT</strong> represent the total number of people vaccinated.';
    }
    return p;
}

//CHART SWITCHES
export function chartInfoSwitch(property) {
    let infoText, helpTip;
    switch (property) {
        case 'new_cases_smoothed':
        case 'new_deaths_smoothed':
        case 'new_vaccinations_smoothed':
            infoText = 'Daily data is smoothed out using a 7-day rolling average';
            helpTip = '<p>This chart shows the daily number of doses administered, it does <strong>NOT</strong> represent the number of people vaccinated.</p>';
            break;
        case 'icu_patients':
            infoText = 'Daily number of COVID-19 patients in intensive care units (ICUs)';
            helpTip = '';
            break;
        case 'stringency_index':
            infoText = 'Scaled to a value from 0 to 100 (100 = strictest)';
            helpTip = '<p>Published by the Oxford Coronavirus Government Response Tracker (OxCGRT), the <strong><em>stringency index</em></strong> measures the severity of the lockdown measures. This metric should not be interpreted as an indication of how appropriate or effective a country’s response was to the pandemic.</p>';
    }
    return { infoText, helpTip };
}
export function chartPropSwitch(property) {
    let color;
    switch (property) {
        case 'new_cases_smoothed':
            color = (mode === 'dark') ? '#54cbf2' : '#038ebc';
            break;
        case 'new_deaths_smoothed':
        case 'icu_patients':
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