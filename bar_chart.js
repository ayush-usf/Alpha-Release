let barFilterData={}
let finalMapBar = {};
let allCrimesBar;
let rectsBar;
let selectedYearBarChart;
const marginBar = {top: 50, right: 50, bottom: 70, left: 80}
const barChartAreaHeight = 720;
const barChartAreaWidth = 1100
let barWidth;
const barHeight = barChartAreaHeight - marginBar.top - marginBar.bottom;

// Tooltip :  https://bl.ocks.org/alandunning/274bf248fd0f362d64674920e85c1eb7
let barTooltip;

// Creating svg (canvas)
let barSvg;

// Creating groups
let bar_g;

function wrap(text, width) {
    text.each(function() {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
        }
    });
}

// Rendering the bar chart
function drawBarChart(finalMapData, top_15, selectedYearLabel) {

    Object.keys(finalMapData).forEach(i=>{
        if(top_15.includes(i)){
            const newLabel = i.replaceAll("/","/ ")
            finalMapBar[newLabel.charAt(0) + newLabel.substr(1,i.length).toLowerCase()] = finalMapData[i]
        }
    })
    selectedYearBarChart = selectedYearLabel
    allCrimesBar = Object.keys(finalMapBar);

    let markup = "";
    allCrimesBar.forEach((i, idx) =>{
        if(idx < 13 && idx !== 1 && idx!==3){
            barFilterData[i]=true
            markup += `<span class="bar_checkbox_span"><input type="checkbox" onclick="drawBarEvt()" id="${i}-checkbox" class="bar-checkbox" checked value="">
                       <label>${i}</label></span>`

        }
        else{
            markup += `<span class="bar_checkbox_span"><input type="checkbox" onclick="drawBarEvt()" id="${i}-checkbox" class="bar-checkbox" value="">
                       <label>${i}</label></span>`
            barFilterData[i]=false
        }
        // if(idx % 2 == 0 && idx != 0){
            markup += "<br>"
        // }
    });
    $('#bar_checkbox').html(markup)
    
    drawBarViz(barFilterData);
}

function drawBarViz(barFilterData){

    let plotMap = {}
    const d3Data = []
    allCrimesBar.forEach(i=>{
        if(barFilterData[i]){
            plotMap[i] = finalMapBar[i];
            d3Data.push({
                "crime_type": i,
                "data": finalMapBar[i]
            })
        }
    })
    const crimes = Object.keys(plotMap);
    const data = Object.values(plotMap);

    barWidth = marginBar.left + marginBar.right + (data.length * 80);
    barSvg = d3.select("#bar_div").append("svg")
        .attr("width", barWidth)
        .attr("height", barHeight)
        .attr("class", `bar-svg`);

    bar_g = barSvg.append("g")
        .attr("transform", `translate(${marginBar.left}, ${marginBar.top})`);

    // Scaling y-axis data
    const yAxisRange = d3.scaleLinear()
        .domain([0, d3.max(data, d => d) ])
        .range([3*barHeight/4, 0])
        .nice()        // https://stackoverflow.com/questions/51046409/last-tick-label-does-not-appear-in-d3-line-chart

    // Creating y-axis
    // https://www.tutorialsteacher.com/d3js/axes-in-d3
    // https://observablehq.com/@d3/axis-ticks
    // tickFormat => https://github.com/d3/d3-axis#axis_tickFormat
    const yAxisCall = d3.axisLeft(yAxisRange)
        .ticks(6)
        .tickFormat(d => d == 0 ? 0 : d)

    bar_g.append("g")
        .attr("class", "y axis")
        .call(yAxisCall)

    // Y label
    bar_g.append("text")
        .attr("class", "y axis-label")
        .attr("x", - ( barHeight / 3))
        .attr("y", -60)
        .attr("font-size", "15px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Crime Cases Count")

    // X axis label
    // Ref: text label for the x axis (https://bl.ocks.org/d3noob/23e42c8f67210ac6c678db2cd07a747e)
    bar_g.append("text")
        .attr("class", "x axis-label")
        .attr("x",  barWidth / 3 + 50)
        .attr("y", barHeight - 100)
        .attr("font-size", "15px")
        .attr("text-anchor", "middle")
        .text("Crime Types")

    // scaleBand is used to position many visual elements in a particular order with even spacing
    // ref: http://daydreamingnumbers.com/learn-d3/bar-charts-in-d3/
    // https://github.com/d3/d3-scale/blob/master/README.md#scaleBand
    // https://github.com/d3/d3-scale/blob/master/README.md#band_paddingInner
    const xAxisRange = d3.scaleBand()
        .domain(crimes)
        .range([0, barWidth - marginBar.right - marginBar.left])
        .paddingInner(0.1)
        .paddingOuter(0.3)

    const xAxisCall = d3.axisBottom(xAxisRange)
    bar_g.append("g")
        .attr("class", "bar-x-axis")
        .attr("transform", `translate(0, ${3*barHeight/4})`)
        .call(xAxisCall)        // https://stackoverflow.com/questions/12805309/javascript-library-d3-call-function
        .selectAll(".tick text")
        .call(wrap, xAxisRange.bandwidth()) // Ref : https://bl.ocks.org/guypursey/f47d8cd11a8ff24854305505dbbd8c07


    // Now that we have a reference to SVG, we can move on to creating bars.
    // ref: http://daydreamingnumbers.com/learn-d3/bar-charts-in-d3/
    rectsBar = bar_g.selectAll("rect")
        .data(d3Data)

    barTooltip = d3.select("#bar_div").append("div").attr("class", "bar-toolTip");

    // d3js - enter(), update() and exit() (http://bl.ocks.org/alansmithy/e984477a741bc56db5a5)
    rectsBar.enter().append("rect")
        .attr("y", d => yAxisRange(d.data))
        .attr("x", d => xAxisRange(d.crime_type))
        .attr("width", xAxisRange.bandwidth)
        .attr("height", d => 3*barHeight/4 - yAxisRange(d.data))
        .on("mousemove", function(event, d){
            barTooltip
                .style("left", event.pageX - 50 + "px")
                .style("top", event.pageY - 70 + "px")
                .style("display", "inline-block")
                .html("Crime: " + (d.crime_type) + "<br>Total Cases reported: "+ (d.data));
        })
        .on("mouseout", function(d){ barTooltip.style("display", "none");});

    // Adding chart label
    bar_g.append("text")
        .attr("class", "bar-chart-label")
        .attr("x",  3 * barWidth / 8)
        .attr("y", -30)
        .text(`Overall Crime Distribution (${selectedYearBarChart})`)
}

function drawBarEvt(){
    event.stopPropagation()
    let checkbox_id = event.target.id.split('-')[0]
    barFilterData[checkbox_id]= barFilterData[checkbox_id] == true ? false : true;
    const arr = Object.values(barFilterData)
    let flag = arr.some(i => i == true);
    const count = arr.filter(Boolean).length;
    if(flag == false){
        $(event.target).prop( "checked",true)
        alert("Atleast 1 crime type should be selected in Bar Chart")
        return
    }
    if(count>13){
        $(event.target).prop( "checked",false)
        alert("You can select atmost 13 crime types for bar chart")
        return
    }
    d3.select('#bar_div').selectAll("*").remove();
    // d3.select('.bar-g').selectAll(".legend").remove();
    drawBarViz(barFilterData)
}