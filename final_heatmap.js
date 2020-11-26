// Tooltip :  https://bl.ocks.org/alandunning/274bf248fd0f362d64674920e85c1eb7

const hMapTooltip = d3.select(".heatmap-tooltip")
let hMapSvg;
let heatMapMonthCrimeGroup = {}
const heatMapchartAreaHeight = 400
const heatMapChartAreaWidth = 1350

const heatMapMargin = {top: 100, right: 50, bottom: 70, left: 150}
const heatMapWidth = heatMapChartAreaWidth - heatMapMargin.left - heatMapMargin.right;
const heatMapHeight = heatMapchartAreaHeight - heatMapMargin.top - heatMapMargin.bottom;


function drawHeatMap(data, top_5,selectedYear){

    const hrFormat = d3.timeFormat("%H")
    let plotData = [];
    let min = undefined, max = undefined;

    if(!heatMapMonthCrimeGroup[selectedYear]){
        heatMapMonthCrimeGroup[selectedYear] = d3.rollup(data,
            v=>v.length,
            // d => formatMonth(new Date(d.date)), // group 1
            d=> d.category, // group 1
            d => hrFormat(new Date(d.date.replace("00:00:00",`${d.time}:00`))))
    }

    heatMapMonthCrimeGroup[selectedYear].forEach((value,key)=> {

        const val = Array.from(value.values())
        const minVal = Math.min.apply(null,val)
        const maxVal = Math.max.apply(null,val)
        if(min){
            if(min > minVal)
                min = minVal;
        }
        else{
            min = minVal;
        }
        if(max){
            if(max < maxVal)
                max = maxVal;
        }
        else{
            max = maxVal;
        }

        // Filling plotData
        value.forEach((val1,hour)=>{
            plotData.push({group:hour, value:Math.round(val1), variable:key})
        })
    })
    drawHeatMapViz(plotData, min, max, top_5);
}

// Rendering the bar chart
function drawHeatMapViz(data, min, max, top_5) {

    hMapSvg = d3.select(".heatmap_svg");

    // Creating groups
        const g = hMapSvg.append("g")
            .attr("transform", `translate(${heatMapMargin.left}, ${heatMapMargin.top} )`);

    const hrArr = ["00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23"];


    // Ref (Heatmap) : https://www.d3-graph-gallery.com/graph/heatmap_style.html
    const myColor = d3.scaleSequential()
        .interpolator(d3.interpolateOrRd)
        .domain([min,max])

    const defs = g.append("defs");

    let linearGradient = defs.append("linearGradient")
        .attr("id", "linear-gradient")
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "0%")
        .attr("y2", "100%");

    linearGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", myColor(min));

    linearGradient.append("stop")
        .attr("offset", "25%")
        .attr("stop-color", myColor((max - min) * 0.25));

    linearGradient.append("stop")
        .attr("offset", "50%")
        .attr("stop-color", myColor((max - min) * 0.5));

    linearGradient.append("stop")
        .attr("offset", "75%")
        .attr("stop-color", myColor((max - min) * 0.75));

    linearGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", myColor(max));

    g.append("rect")
        .attr("x", 80)
        .attr("y", - 70)
        .attr("width", heatMapWidth - 370)
        .attr("height", 10)
        // .style("stroke", "black")
        // .style("stroke-width", 2)
        .style("fill", "url(#linear-gradient)")

    g.append("text")
        .attr("class",  "min-value")
        .attr("x",  0)
        .attr("y", -60)
        .text(Math.round(min) +" (min)")

    g.append("text")
        .attr("class",  "max-value")
        .attr("x",   heatMapWidth - 270)
        .attr("y", -60)
        .text(numberFormat(Math.round(max)) +" (max)")

    // X axis label
    // Ref: text label for the x axis (https://bl.ocks.org/d3noob/23e42c8f67210ac6c678db2cd07a747e)
    g.append("text")
        .attr("class", "x axis-label")
        .attr("x",  heatMapWidth / 3 + 50)
        .attr("y", heatMapHeight - 5)
        .attr("font-size", "15px")
        .attr("text-anchor", "middle")
        .text("Hour")

    // scaleBand is used to position many visual elements in a particular order with even spacing
    // ref: http://daydreamingnumbers.com/learn-d3/bar-charts-in-d3/
    // https://github.com/d3/d3-scale/blob/master/README.md#scaleBand
    // https://github.com/d3/d3-scale/blob/master/README.md#band_paddingInner
    const xAxisRange = d3.scaleBand()
        .domain(hrArr)
        .range([0, heatMapWidth - heatMapMargin.right - heatMapMargin.left])
        .padding(0.05);

    const xAxisCall = d3.axisBottom(xAxisRange)
        .tickSize(0)

    g.append("g")
        .attr("class", "x axis")
        .attr("transform", `translate(0, ${3*heatMapHeight/4})`)
        .call(xAxisCall)        // https://stackoverflow.com/questions/12805309/javascript-library-d3-call-function
        .selectAll("text")      // https://stackoverflow.com/questions/12805309/javascript-library-d3-call-function
        .attr("y", "10")        //  https://stackoverflow.com/questions/41193617/group-each-rect-and-text-in-d3#answer-41193711
        .attr("x", "-5")
        .attr("text-anchor", "middle")
        .select(".domain").remove();

    // Scaling y-axis data
    const yAxisRange = d3.scaleBand()
        .domain(top_5)
        .range([3*heatMapHeight/4, 0])
        .padding(0.05);

    // Creating y-axis
    // https://www.tutorialsteacher.com/d3js/axes-in-d3
    // https://observablehq.com/@d3/axis-ticks
    // tickFormat => https://github.com/d3/d3-axis#axis_tickFormat
    const yAxisCall = d3.axisLeft(yAxisRange)
        .ticks(6)
        .tickFormat(d => d)

    g.append("g")
        .attr("class", "y axis")
        .call(yAxisCall)

    // Y label
    g.append("text")
        .attr("class", "y axis-label")
        .attr("x", - ( heatMapHeight / 3))
        .attr("y", -120)
        .attr("font-size", "15px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Crime Type")


    g.selectAll()
        .data(data, function(d) {return d.group+':'+d.variable;})
        .enter()
        .append("rect")
        .attr("x", function(d) {
            return xAxisRange(d.group) })
        .attr("y", function(d) {
            return yAxisRange(d.variable) })
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("width", xAxisRange.bandwidth() )
        .attr("height", yAxisRange.bandwidth() )
        .style("fill", function(d) {
            return myColor(d.value)} )
        .style("stroke-width", 4)
        .style("stroke", "none")
        .style("opacity", 0.8)
        .on("mousemove", function(event, d){
            hMapTooltip
                .style("left", event.pageX - 100 + "px")
                .style("top", event.pageY - 90 + "px")
                .style("display", "inline-block")
                .html("Crime Type: " + (d.variable) + "<br>Total Cases: "+ numberFormat(d.value));
        })
        .on("mouseout", function(d){ hMapTooltip.style("display", "none");});

}
