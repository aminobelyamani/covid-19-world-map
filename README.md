![COVID-19 World Map Logo](logo.png) 
# COVID-19 World Map [*(worldmapcovid19.com)*](https://worldmapcovid19.com)
This is a repository for a full-stack Node JS app that fetches, scrapes, and processes COVID-19 data in real-time and serves the client with interactive data maps and charts. You can visit the site [here](https://worldmapcovid19.com).
## Code
#### Back end
Node JS express app server
* Dependencies
    * *cheerio* - daily data scraping.
    * *cron* - setting up cron jobs for automated fetching and scraping.
    * *csv-parser* - reading csv files and converting them to objects.
    * *socket.io* - server-client data transfers.

#### Front end
All client-side code was developed from scratch. **No** external libraries, **no** bootstraps, **no** frameworks, and **no** widgets were used. All of it done with the holy trinity (*html, css, and javascript*). The minified javascript file (*main.min.js*) in the [/public/js](https://github.com/aminobelyamani/covid-19-world-map/tree/master/public/js) folder contains all three js files (*main.js, chart.js, and panzoom.js*).
## Data
All the data can be found in the [/data](https://github.com/aminobelyamani/covid-19-world-map/tree/master/data) folder in the root directory.
#### Sources
* **Worldometer:** Most of the data scraping is from [here](https://www.worldometers.info/coronavirus/). The compiled world data is made available in this file [/data/scrape/LATEST.json](https://github.com/aminobelyamani/covid-19-world-map/tree/master/data/scrape/LATEST.json).
* **OWID(*Our World In Data*):** All chart data for countries and vaccine data for both World and USA is fetched [here](https://github.com/owid/covid-19-data/tree/master/public/data). The main data files used can be found in this folder [/data/owid](https://github.com/aminobelyamani/covid-19-world-map/tree/master/data/owid). *OWID* data by Cameron Appel, Diana Beltekian, Daniel Gavrilov, Charlie Giattino, Joe Hasell, Bobbie Macdonald, Edouard Mathieu, Esteban Ortiz-Ospina, Hannah Ritchie, Max Roser.

#### USA 50 States - Chart Data
Scraping from Worldometer is compiled daily and added to this file (*us-data-hist-raw.json*). A 7-day rolling average is then calculated for daily cases, deaths, and vaccinations. All of that daily processed data is then compiled and added to this file (*us-data-hist.json*). Both json files can be found in this folder [/data/us-data](https://github.com/aminobelyamani/covid-19-world-map/tree/master/data/us-data).
##### *us-data-hist-raw.json* structure:
* `country`: US state
* `data`: array of daily cases, deaths, and vaccinations for each date of recorded data
    * `date`: date in the format yyyy-mm-dd
    * `new_cases`: new daily confirmed cases
    * `new_deaths`: new daily confirmed deaths
    
##### *us-data-hist.json* structure:
* `country`: US state
* `data`: array of smoothed out daily cases, deaths, and vaccinations for each date of recorded data
    * `date`: date in the format yyyy-mm-dd
    * `new_cases_smoothed`: new daily confirmed cases (7-day rolling average)
    * `new_deaths_smoothed`: new daily confirmed deaths (7-day rolling average)
    * `new_vaccinations_smoothed`: new daily doses administered (7-day rolling average)

#### Locations
World country location data is made available in this file [/data/ref/world.json](https://github.com/aminobelyamani/covid-19-world-map/tree/master/data/ref/world.json).
* `id`: country numeric code.
* `name`: country full name.
* `alpha2`: country alpha2 code.
* `alpha3`: country alpha3 code.
* `country`: country short name.

USA 50 states location data is made available in this file [/data/ref/us-states.json](https://github.com/aminobelyamani/covid-19-world-map/tree/master/data/ref/us-states.json).
* `id`: US state two letter code.
* `state`: US state full name.

## Feedback
Please feel free to reach out with any feedback or questions on my twitter account.
## License
This repository is under the MIT [license](https://github.com/aminobelyamani/covid-19-world-map/blob/master/LICENSE). You have the permission to use the code and data, provided the source and authors are credited. Third-party data (*Our World In Data* and *Worldometer*) is subject to the license terms from the respective third-party authors.
## Author
This PWA (*Progressive Web Application*) was created and developed by [Amino Belyamani](https://aminobelyamani.com). USA chart data was collected, compiled, and processed by Amino Belyamani.