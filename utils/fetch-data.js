const request = require('request-promise-native');
const $ = require('cheerio');
const fs = require('fs');

const searchUrl = 'https://www.pixiv.net/search.php';
const REQUEST_INTERVAL = 1000;

// structure of data
// items: Item[]
//   illustId: string(number)
//   illustTitle: string
//   illustType: string('0': イラスト, '1': マンガ)
//   url: string(url to image)
//   tags: string[]
//   userId: string(number)
//   userName: string
//   userImage: string
//   isBookmarkable: boolean?
//   isBookmarked: boolean?
//   isPrivateBookmark: boolean?
//   width: number
//   height: number
//   pageCount: number
//   bookmarkCount: number
//   responseCount: number

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

const idolLastIds = {};
async function fetchItems(idol) {
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
        resultItems.push(...searchResult);
        await wait(REQUEST_INTERVAL);
    }
    idolLastIds[idol] = resultItems.slice(0, 10).map(w => w.illustId);
    return resultItems;
}

async function main() {
    const idolNames = await fetchIdols();
    const works = {};
    for (const [index, idolName] of idolNames.entries()) {
        console.log(`Start: ${index} ${idolName}`);
        const items = await fetchItems(idolName);
        items.forEach(item => {
            if (!works[item.illustId]) {
                works[item.illustId] = {
                    title: item.illustTitle,
                    id: item.illustId,
                    type: item.illustType,
                    multiPage: item.pageCount > 1,
                    idols: idolNames.filter(name => {
                        for (const tag of item.tags) {
                            if (tag.includes(name)) return true;
                        }
                        return false;
                    }),
                    nsfw: item.tags.reduce((prev, curr) => prev || curr.includes('R-18'), false),
                };
            }
        });
        console.log(`Done: ${index} ${idolName}`);
        await wait(REQUEST_INTERVAL);
    }
    fs.writeFileSync('data/illust-data.json', JSON.stringify(Object.values(works).sort((a, b) => a.id - b.id), null, 2));
    fs.writeFileSync('data/idol-last-ids.json', JSON.stringify(idolLastIds, null, 2));
}

main().catch(err => {
    console.error(err);
});