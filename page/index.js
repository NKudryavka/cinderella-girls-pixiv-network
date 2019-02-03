import vis from 'vis';

function calcNodesAndEdges(works) {
    const relation = {};
    works.forEach(work => {
        const pairWeight = 1;//work.idols.length;
        work.idols.forEach(from => {
            if (!relation[from]) relation[from] = {};
            work.idols.forEach(to => {
                if(!relation[from][to]) {
                    relation[from][to] = pairWeight;
                } else {
                    relation[from][to] += pairWeight;
                }
            });
        });
    });

    const nodes = Object.keys(relation).map(idol => {
        const total = relation[idol][idol];
        const weight = total;
        return {id: idol, label: idol, mass: Math.log10(weight/10), value: weight};
    });

    const edges = [];
    Object.entries(relation).forEach(ent => {
        const [from, tos] = [ent[0], Object.keys(ent[1])];
        tos.forEach(to => {
            if (from === to) return;
            const weight = relation[from][to]/relation[from][from];
            if (weight > 0.1) edges.push({from: from, to: to, width: weight*10});
        });
    });
    return [nodes, edges];
}

fetch('illust-data.json')
.then(response => {
    return response.json();
}).then(works => {
    works = works.filter(work => !work.nsfw)
    const [nodes, edges] = calcNodesAndEdges(works);
    
    const container = document.getElementById('network');
    const netData = {nodes: nodes, edges: edges};
    const options = {
        nodes: {
            scaling: {
                min: 1,
                max: 100000,
                label: {
                    enabled: true,
                    min: 10,
                    max: 50,
                },
            },
        },
        edges: {
            arrows: {
                to: {
                    enabled: true,
                },
            },
        },
        layout:{
            improvedLayout: false,
        },
    };
    const network = new vis.Network(container, netData, options);
});
