const fs = require('fs');

//  data: [Work]
//      title: string
//      id: string(int)
//      type: string(0, 1) (0: illust, 1:comic)
//      multiPage: bool
//      idols: [string]
//      nsfw: bool

const illustData = JSON.parse(fs.readFileSync('data/illust-data.json'));
const data = {};

function addPair(from, to) {
    if (data[from][to] === undefined) {
        data[from][to] = 1;
    } else {
        data[from][to]++;
    }
}

illustData.forEach(work => {
    const idols = work.idols;
    idols.forEach(idol1 => {
        if (data[idol1] === undefined) {
            data[idol1] = {};
        }
        idols.forEach(idol2 => {
            addPair(idol1, idol2);
        });
    });
});

const csv = 'アイドル, 共に描かれているアイドル, イラスト数, 割合\n' 
    + Object.entries(data).map(pair => {
    const [from, value] = pair;
    const total = value[from];
    return Object.entries(value).sort((a, b) => b[1] - a[1]).map(p => {
        const [to, count] = p;
        return [from, to, count, count/total].join(',');
    }).join('\n');
}).join('\n');

fs.writeFileSync('relations.csv', csv);
