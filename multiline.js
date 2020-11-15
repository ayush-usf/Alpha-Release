// https://ayusharora.me/data-viz-assignment-8/
function drawMultiLine(data, top_5){
    data['columns'] = top_5.concat('date')
    // getting month from date - https://stackoverflow.com/questions/58594065/d3js-v4-get-month-and-year
    const formatMonth = d3.timeFormat('%b');
    const monthCrimeGroup = d3.rollup(data,
        v=>v.length,
        // d => formatMonth(new Date(d.date)), // group 1
        d=> d.category, // group 1
        d => d.date); // group 1

    let plotData = []
    let parseTime = d3.timeParse("%Y%m%d")
    monthCrimeGroup.forEach((value,key) => {
        // console.log(value,key)
        let innerData = []
        for(let [key2, val2] of value) {
            // console.log("key2, val2",key2, val2);
            innerData.push({
                date : new Date(key2),
                count : val2
            })
        }
        // console.log("value",value);

        innerData = innerData.sort(sortByDateAscending);

        // formatMonth(new Date(
        plotData.push({
            id: key,
            values: innerData
        })
    })

    function sortByDateAscending(a, b) {
        // Dates will be cast to numbers automagically:
        return a.date - b.date;
    }
    
    // console.log("plotData",plotData);

    const mLineSvgWidth = screen.width - 20
    const mLineSvgHeight = 500

    const margin = {top: 20, right: 80, bottom: 30, left: 50},
        width = mLineSvgWidth - margin.left - margin.right,
        height = mLineSvgHeight - margin.top - margin.bottom;

    let mLineSvg = d3.select("#multi_line_div").append("svg")
                    .attr("class", "m_line_svg")
                    .attr("width", mLineSvgWidth)
                    .attr("height", mLineSvgHeight);

    let g = mLineSvg.append("g")
        .attr("class", "mLine-g")

    // let parseTime = d3.timeParse("%Y%m%d");

    let x = d3.scaleTime().range([0, width]),
        y = d3.scaleLinear().range([height, 0]),
        color = d3.scaleOrdinal(d3.schemeCategory10);

    let line = d3.line()
        .curve(d3.curveBasis)
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y(d.count); });

    let filterData={}
    top_5.forEach(i=>filterData[i]=true)
    // console.log("filterData",filterData);

    let zoom = d3.zoom()
        .scaleExtent([1 / 4, 8])
        .translateExtent([[-width, -Infinity], [2 * width, Infinity]])
        .extent([[margin.left, 0], [width - margin.right, height]])
        .on("zoom", zoomed);

    let zoomRect = mLineSvg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .call(zoom);

    x.domain(d3.extent(data, function(d) {
        return new Date(d.date);
    }));

    y.domain([
        d3.min(plotData, function(c) { return d3.min(c.values, function(d) { return d.count; }); }),
        d3.max(plotData, function(c) { return d3.max(c.values, function(d) { return d.count; }); })
    ]);

    function drawChart(filterData){
        try{

            color.domain(plotData.map(function(c) {
                return c.id;
            }));

            g.selectAll("*").remove();
            // Legend
            let legend = g.selectAll('g')
                .data(plotData)
                .enter()
                .append('g')
                .attr('class', 'legend');

            legend.append('rect')
                .attr('x', width - 10)
                .attr('y', function(d, i){ return i *  10;})
                .attr('width', 8)
                .attr('height', 8)
                .style('fill', function(d) {
                    return color(d.id);
                });

            legend.append('text')
                .attr('x', width)
                .attr('y', function(d, i){ return (i *  10) + 9;})
                .attr('style',"font-size: 12px;")
                .text(function(d){ return d.id; });

            legend
                .on("click",(d => reDraw(d.id)))
                .on("mouseover",(d => highlight(d.id)))
                .on("mouseleave",(d => doNotHighlight(d.id)));

            g.append("g")
                .attr("class", "axis axis--x")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(x));

            g.append("g")
                .attr("class", "axis axis--y")
                .call(d3.axisLeft(y))
                .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .attr("dy", "0.71em")
                .attr("fill", "#000")
                .text("Count");

            let city = g.selectAll(".city")
                .data(plotData.filter(function(d){return filterData[d.id]==true;}))
                .enter().append("g")
                .attr("class", "city");

            city.append("path")
                .attr("class", function(d) {
                    return "line " + d.id
                })
                .attr("d", function(d) { return line(d.values); })
                .style("stroke", function(d) { return color(d.id); });

            city.append("text")
                .datum(function(d) { return {id: d.id, value: d.values[d.values.length - 1]}; })
                .attr("transform", function(d) { return "translate(" + x(d.value.date) + "," + y(d.value.count) + ")"; })
                .attr("x", 3)
                .attr("class", function(d) {
                    return  d.id + "_1"
                })
                .attr("dy", "0.35em")
                .style("font", "10px sans-serif")
                .text(function(d) { return d.id; });

            g.selectAll(".city")
                .data(plotData.filter(function(d){return filterData[d.id]==true;}))
                .exit()
                .remove();

            let xExtent = d3.extent(data, function(d) {return d.date; });
            zoom.translateExtent([[margin.left, -Infinity], [width - margin.right, Infinity]])
            zoomRect.call(zoom.transform, d3.zoomIdentity);

            // Adding chart label
            g.append("text")
                .attr("class", "chart-label")
                .attr("x",  width / 4)
                .attr("y", 10)
                .text("Filtering, Brushing, Zoom & Pan")
        }
        catch (e){
            console.log("e",e);
        }

        function reDraw(id){

            filterData[id]=!filterData[id];
            drawChart(filterData);
        }
    }
    drawChart(filterData);

    function zoomed() {
        try{
            let xz = d3.event.transform.rescaleX(x);
            let yz = d3.event.transform.rescaleY(y);

            // x axis change when zoom
            g.select(".axis--x")
                .call(d3.axisBottom(x).scale(xz));

            // y
            g.select(".axis--y")
                .call(d3.axisLeft(x).scale(yz));

            //line
            line.x(function(d) { return xz(d.date); })
            d3.selectAll('.line').attr("d", function(d){return line(d.values);});
        }
        catch (e){
            console.log("e",e);
        }
    }

    function highlight(selected_category) {
        let classVal = selected_category;

        if(selected_category === "San Francisco"){
            classVal="San.Francisco"
        }
        if(selected_category === "New York"){
            classVal="New.York"
        }
        d3.selectAll(".line")
            .transition().duration(200).style("stroke", "lightgrey")
            .style("opacity", "0.3")
        d3.selectAll("." + classVal)
            .transition().duration(200)
            .style("stroke", color(selected_category))
            .style("opacity", "1")
    }
    function doNotHighlight() {
        d3.selectAll(".line")
            .transition().duration(200).delay(100)
            .style("stroke", function(d) {
                return (color(d.id))
            }).style("opacity", "1")
    }

    function type(d, _, columns) {

        for (let i = 1, n = columns.length, c; i < n; ++i)
            d[c = columns[i]] = +d[c];
        return d;
    }
}