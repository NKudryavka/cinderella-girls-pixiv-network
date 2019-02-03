const request = require('request-promise-native');
const $ = require('cheerio');
const fs = require('fs');

const searchUrl = 'https://www.pixiv.net/search.php';
const REQUEST_INTERVAL = 1000;

async function wait(ms) {
    return await new Promise((resolve, reject) => {
        setTimeout(() => resolve(), ms);
    });
}

async function fetchIdols() {
    return request({
        url: 'https://sparql.crssnky.xyz/spql/imas/query',
        qs: {
            query: `
                PREFIX schema: <http://schema.org/>
                PREFIX imas: <https://sparql.crssnky.xyz/imasrdf/URIs/imas-schema.ttl#>

                SELECT distinct ?name
                WHERE {
                ?idol schema:name ?name;
                    imas:Title "CinderellaGirls"@en.
                }
            `,
            format: 'json',
        }
    }).then(res => {
        return JSON.parse(res).results.bindings.map(o => o.name.value);
    });
}

async function fetchItems(idol, oldIds) {
    let resultItems = [];
    let breakFlag = false;
    let lastId = '';
    for (let page=1; !breakFlag; page++) {
        console.log(`page: ${page}`);
        const searchResult = await request({
            url: searchUrl,
            qs: {
                word: [idol, 'アイドルマスターシンデレラガールズ'].join(' '),
                p: page,
                s_mode: 's_tag',
            },
            jar: jar,
        }).then(res => {
            const items = $(res).find('#js-mount-point-search-result-list').data('items');
            if (items.length === 0) {
                breakFlag = true;
            } else if (lastId === items[0].illustId) {
                throw 'Login failed';
            } else {
                lastId = items[0].illustId;
            }
            return items;
        });
        if (oldIds) {
            const resultCount = searchResult.length;
            searchResult = searchResult.filter(item => !oldIds.includes(item.illustId));
            if (!breakFlag && resultCount !== searchResult.length) {
                breakFlag = true;
            }
        }
        resultItems.push(...searchResult);
        await wait(REQUEST_INTERVAL);
    }
    return resultItems;
}

const oldIds = JSON.parse(fs.readFileSync('data/illust-data.json')).map(w => w.id);

