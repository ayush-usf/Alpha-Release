// Ref :  https://ayusharora.me/data-viz-assignment-8/
let multi_zoom;
let multiZoomRect;
let monthCrimeGroup = {}
const mLineSvgWidth = screen.width - 80
const mLineSvgHeight = 500

const mLineMargin = {top: 20, right: 80, bottom: 30, left: 100},
    mLineWidth = mLineSvgWidth - mLineMargin.left - mLineMargin.right,
    mLineHeight = mLineSvgHeight - mLineMargin.top - mLineMargin.bottom;

let mLineSvg = d3.select(".m_line_svg");

let mLineg;

let mLinePlotData = []

let mLine_x = d3.scaleTime().range([0, mLineWidth]),
    mLine_y = d3.scaleLinear().range([mLineHeight, 0]),
    // mLineColor = d3.scaleOrdinal(d3.schemeCategory10);
    mLineColor = d3.scaleOrdinal(d3.schemeSet2);
    // mLineColor = d3.scaleOrdinal(d3.schemeSet3);

function drawMultiLine(data, top_5, selectedYear){
    mLinePlotData = []
    mLineg = mLineSvg.append("g")
        .attr("class", "mLine-g")
        .attr("transform", `translate(0, ${mLineMargin.top})`);

    data['columns'] = top_5.concat('date')
    // getting month from date - https://stackoverflow.com/questions/58594065/d3js-v4-get-month-and-year
    if(!monthCrimeGroup[selectedYear])
        monthCrimeGroup[selectedYear] = d3.rollup(data,
            v=>v.length,
            d=> d.category, // group 2
            d => d.date); // group 1


    monthCrimeGroup[selectedYear].forEach((value,key) => {
        // console.log(value,key)
        let innerData = []
        for(let [key2, val2] of value) {
            // console.log("key2, val2",key2, val2);
            innerData.push({
                date : new Date(key2),
                count : val2
            })
        }

        innerData = innerData.sort(sortByDateAscending);

        // formatMonth(new Date(
        mLinePlotData.push({
            id: key,
            values: innerData
        })
    })

    function sortByDateAscending(a, b) {
        // Dates will be cast to numbers automagically:
        return a.date - b.date;
    }

    let line = d3.line()
        .curve(d3.curveBasis)
        .x(function(d) { return mLine_x(d.date); })
        .y(function(d) { return mLine_y(d.count); });

    let filterData={}
    top_5.forEach(i=>filterData[i]=true)
    // console.log("filterData",filterData);

    multi_zoom = d3.zoom()
        .scaleExtent([1 / 4, 8])
        .translateExtent([[-mLineWidth, -Infinity], [2 * mLineWidth, Infinity]])
        .extent([[mLineMargin.left, 0], [mLineWidth - mLineMargin.right, mLineHeight]])
        .on("zoom", zoomed);

    multiZoomRect = mLineSvg.append("rect")
        .attr("width", mLineWidth)
        .attr("height", mLineHeight)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .call(multi_zoom);

    mLine_x.domain(d3.extent(data, function(d) {
        return new Date(d.date);
    }));

    mLine_y.domain([
        d3.min(mLinePlotData, function(c) { return d3.min(c.values, function(d) { return d.count; }); }),
        d3.max(mLinePlotData, function(c) { return d3.max(c.values, function(d) { return d.count; }); })
    ]);

    function drawChart(filterData){
        try{

            mLineColor.domain(mLinePlotData.map(function(c) {
                return c.id;
            }));

            mLineg.selectAll("*").remove();
            // Legend
            let legend = mLineg.selectAll('g')
                .data(mLinePlotData)
                .enter()
                .append('g')
                .attr('class', 'legend');

            legend.append('rect')
                .attr('x', mLineWidth - 10)
                .attr('y', function(d, i){ return i *  10;})
                .attr('width', 8)
                .attr('height', 8)
                .style('fill', function(d) {
                    return mLineColor(d.id);
                });

            legend.append('text')
                .attr('x', mLineWidth)
                .attr('y', function(d, i){ return (i *  10) + 9;})
                .attr('style',"font-size: 12px;")
                .attr('class',function(d){
                    return d.id;
                })
                .text(function(d){ return d.id; });

            legend
                .on("click",((d,e) =>{
                    return reDraw(e.id.replace("/","_").replace(" ","_"))}
                    ))
                .on("mouseover",((d,e) => {
                    return highlight(e.id.replace("/","_").replace(" ","_"))
                }))
                .on("mouseleave",((d,e) => {
                    return doNotHighlight(e.id.replace("/","_").replace(" ","_"))
                }));

            mLineg.append("g")
                .attr("class", "axis mline-axis--x")
                .attr("transform", "translate(0," + mLineHeight + ")")
                .call(d3.axisBottom(mLine_x));

            mLineg.append("g")
                .attr("class", "axis mline-axis--y")
                .call(d3.axisLeft(mLine_y))
                .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .attr("dy", "0.71em")
                .attr("fill", "#000")
                .text("Count");

            let crimes = mLineg.selectAll(".mline-crime")
                .data(mLinePlotData.filter(function(d){return filterData[d.id]==true;}))
                .enter().append("g")
                .attr("class", "mline-crime");

            crimes.append("path")
                .attr("class", function(d) {
                    return "line " + d.id.replace("/","_").replace(" ","_")
                })
                .attr("d", function(d) { return line(d.values); })
                .style("stroke", function(d) { return mLineColor(d.id); });

            crimes.append("text")
                .datum(function(d) { return {id: d.id, value: d.values[d.values.length - 1]}; })
                .attr("transform", function(d) { return "translate(" + mLine_x(d.value.date) + "," + mLine_y(d.value.count) + ")"; })
                .attr("x", 3)
                .attr("class", function(d) {
                    return  d.id.replace("/","_").replace(" ","_") + "_1" + " label_class"
                })
                .attr("dy", "0.35em")
                .style("font", "10px sans-serif")
                .text(function(d) { return d.id; });

            mLineg.selectAll(".mline-crime")
                .data(mLinePlotData.filter(function(d){return filterData[d.id]==true;}))
                .exit()
                .remove();

            // let xExtent = d3.extent(data, function(d) {return d.date; });
            multi_zoom.translateExtent([[mLineMargin.left, -Infinity], [mLineWidth - mLineMargin.right, Infinity]])
            multiZoomRect.call(multi_zoom.transform, d3.zoomIdentity);

            // tipBox = mLineSvg.selectAll()
            //     .data(mLinePlotData)
            //     .enter()
            //     .append('rect')
            //     .attr('width', mLineWidth)
            //     .attr('height', mLineHeight)
            //     .attr('opacity', 0)
            //     .on('mousemove', (d,e) => {
            //         return drawTooltip(d,e)
            //     })
            //     .on('mouseout', (d,e) =>{
            //         return removeTooltip(d,e)
            //     });

            // Adding chart label
            // g.append("text")
            //     .attr("class", "chart-label")
            //     .attr("x",  width / 4)
            //     .attr("y", 10)
            //     .text("Filtering, Brushing, Zoom & Pan")
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

    function zoomed(event) {
        try{
            if(event.transform.k <1){
                event.transform.k = 1
                return ;
            }

            let xz = event.transform.rescaleX(mLine_x);
            let yz = event.transform.rescaleY(mLine_y);

            // x axis change when zoom
            mLineg.select(".mline-axis--x")
                .call(d3.axisBottom(mLine_x).scale(xz));

            // y
            mLineg.select(".mline-axis--y")
                .call(d3.axisLeft(mLine_x).scale(yz));

            //line
            line.x(function(d) {
                return xz(d.date); })
            d3.selectAll('.line').attr("d", function(d){
                return line(d.values);
            });
        }
        catch (e){
            console.log("e",e);
        }
    }

    function highlight(selected_category) {
        let classVal = selected_category;
        let classVal2 = selected_category + "_1";
        $('.label_class').hide()
        $('.'+classVal2).css("font-weight", "bold").show()

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
            .style("stroke", mLineColor(selected_category))
            .style("opacity", "1")
    }
    function doNotHighlight() {
        d3.selectAll(".line")
            .transition().duration(200).delay(100)
            .style("stroke", function(d) {
                return (mLineColor(d.id))
            }).style("opacity", "1")

        $('.label_class').css("font-weight", "normal").show()
    }

    function type(d, _, columns) {

        for (let i = 1, n = columns.length, c; i < n; ++i)
            d[c = columns[i]] = +d[c];
        return d;
    }
}