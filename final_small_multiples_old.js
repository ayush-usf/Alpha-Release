// Ref: https://bl.ocks.org/pstuffa/fbf893deff6661f7402846b41457ebcb
let smMargin = {top: 20, right: 20, bottom: 20, left: 20},
    smWidth = 280 - smMargin.left - smMargin.right,
    smHeight = 200 - smMargin.top - smMargin.bottom;
let smData = {}
let nestedCrimeData = {}
let smBody = d3.select("#small-multiples");
let sMxScale = d3.scaleTime()
    .range([0, smWidth]);
let min = {}
let max = {}
let sMyScale = d3.scaleLinear()
    .range([smHeight, 0]);

let sMxAxis = d3.axisBottom(sMxScale)
    .ticks(3)
    .tickSize(-smHeight);

let sMyAxis = d3.axisLeft(sMyScale);

let smLine = d3.line()
    .x(function (d) {
        return sMxScale(d.date);
    })
    .y(function (d) {
        return sMyScale(d.cumulative);
    });

const colorMapping = ["VEHICLE THEFT", "ASSAULT", "LARCENY/THEFT", "VANDALISM", "BURGLARY"]
// let sMulColor = d3.scaleOrdinal(d3.schemeCategory10);
let sMulColor = d3.scaleOrdinal(d3.schemeSet2);
// let sMulColor = d3.scaleOrdinal(d3.schemePastel2);

sMulColor.domain(colorMapping.map(function(c) {
    return c;
}));
let monthCrimeGroupSMultiple = {}

function sortByDateAscending(a, b) {
    // Dates will be cast to numbers automagically:
    return a.date - b.date;
}


async function drawSmallMultiples(data,top_5,selectedYear){

    if(!min[selectedYear])
        min[selectedYear] = Number.MAX_SAFE_INTEGER
    if(!max[selectedYear])
        max[selectedYear] = 0

    if(!monthCrimeGroupSMultiple[selectedYear]){
        monthCrimeGroupSMultiple[selectedYear] = d3.rollup(data,
            v=>v.length,
            d => d.pddistrict, // group 1
            d=> d.category, // group 2
            d => d.date); // group 3
    }
    if(!min[selectedYear] || !max[selectedYear]){
        monthCrimeGroupSMultiple[selectedYear].forEach((value1, key1) => {
            value1.forEach((value, key) => {

                for (let [key2, val2] of value) {
                    if (val2 < min[selectedYear])
                        min[selectedYear] = val2
                    if (val2 > max[selectedYear])
                        max[selectedYear] = val2
                }
            })
        })
    }

    if(!smData[selectedYear]){
        data.forEach(function (d) {
            d.date = new Date(d.date);
        })
        smData[selectedYear] = data
    }
    else{
        data=smData[selectedYear]
    }

    sMxScale.domain(d3.extent(data, function (d) {
        return d.date;
    })).nice()

    sMyScale.domain([min[selectedYear], max[selectedYear]]);
    if(!nestedCrimeData[selectedYear]){
        nestedCrimeData[selectedYear] = d3.groups(data, d => d.pddistrict, d => d.category);

        nestedCrimeData[selectedYear].forEach(function (region) {
            region[1].forEach(function (crimeType) {
                let map = {};
                crimeType[1].forEach(function (d) {
                    let date = d.date.toDateString();
                    if(!map[date])
                        map[date] =0;
                    map[date]+=1;
                });
                let arr = [];
                Object.keys(map).forEach(function(k){
                    arr.push({"date" : new Date(k), "cumulative" : map[k]});
                });
                crimeType[1] = arr.sort(sortByDateAscending);
            });
        });
    }
    renderSmallMultiples(selectedYear)
}

function renderSmallMultiples(selectedYear) {

    // Legend
    let legend = d3.select('#sm_legend_svg').selectAll('g')
        .data(colorMapping)
        .enter()
        .append('g')
        .attr('class', 'sm-legend');

    legend.append('rect')
        .attr('x', function (d, i) {
            return i * 135;
        })
        .attr('y', function (d) {
            return 10;
        })
        .attr('width', 10)
        .attr('height', 10)
        .style('fill', function (d) {
            return sMulColor(d);
        });

    legend.append('text')
        .attr('y', 20)
        .attr('x', function (d, i) {
            return (i * 135) + 15;
        })
        .attr('style', "font-size: 12px;")
        .attr('class', function (d) {
            return "m_line_" + d.replace(" ", "_");
        })
        .text(function (d) {
            return d;
        });

    legend
        .on("click", ((d, e) => {
                return reDraw(e.id.replace("/", "_").replace(" ", "_"))
            }
        ))
        .on("mouseover", ((d, e) => {
            return highlight(e.id.replace("/", "_").replace(" ", "_"))
        }))
        .on("mouseleave", ((d, e) => {
            return doNotHighlight(e.id.replace("/", "_").replace(" ", "_"))
        }));

    let divisionGroup = smBody.selectAll("svg")
        .data(nestedCrimeData[selectedYear])
        .enter().append("svg")
        .attr("class", "division")
        .attr("width", smWidth + smMargin.left + smMargin.right)
        .attr("height", smHeight + smMargin.top + smMargin.bottom)
        .append("g")
        .attr("transform", "translate(" + 0 + "," + smMargin.top + ")")

    divisionGroup.append("text")
        .text(function (d) {
            return d[0];
        })

    divisionGroup.append("line")
        .attr("x1", 0)
        .attr("x2", smWidth)
        .attr("y1", sMyScale(0))
        .attr("y2", sMyScale(0))
        .style("stroke", "#000")
        .style("stroke-dasharray", 1)
        .style("stroke-width", .25)

    divisionGroup.selectAll(".teams")
        .data(function (d) {
            return d[1];
        })
        .enter().append("path")
        .attr("class", "teams")
        .style("stroke", function (d) {
            return sMulColor(d[0]);
        })
        .attr("d", function (d) {
            return smLine(d[1]);
        });

    divisionGroup.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + smHeight + ")")
        .call(sMxAxis)
        .selectAll("g")
        .classed("major", function (d) {
            return d.getDate() <= 7;
        });

    divisionGroup.append("g")
        .attr("class", "y axis")
        .call(sMyAxis);

}