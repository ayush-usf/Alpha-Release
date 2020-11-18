// Obtaining the data
let input_data;
let crime_types;
let crime_groups;
// const limit = 150
const limit = 100000
// const limit = 23000

let selectedYear = 2014
const dataSetUrl = "https://data.sfgov.org/resource/tmnf-yvry.json?"
const aggFilterUrl = "&$select=category,COUNT(category)&$group=category"
const limitUrl = `$limit=${limit}`
const map1LowestColor = '#ffedd8';
const map1HighestColor = '#e0791f';

const map1SvgWidth = 700
const map1SvgHeight = 600

const fixed_top_7 = ["LARCENY/THEFT", "ASSAULT", "DRUG/NARCOTIC", "VEHICLE THEFT", "VANDALISM", "BURGLARY", "ROBBERY"]
let top_5;

const map1Latitude = 37.7750,
    map1Longitude = -122.4183;

let map1Svg = d3.select("#map_div").append("svg")
    .attr("width", map1SvgWidth)
    .attr("height", map1SvgHeight);

// let map1g = map1Svg.append("g")
//     .attr("id", "hoods")

let map1g = map1Svg.append("g")
    .attr("class", "map1-g")

const map1Projection = d3.geoConicEqualArea()
    .parallels([map1Latitude, map1Longitude])
    .rotate([122, 0]);

const map1Path = d3.geoPath().projection(map1Projection);
let districtCrimeGroup;

async function changeOverallYear(){
    const year = document.getElementById("year_select").value;
    d3.select("#map_div svg").selectAll("path").remove("*")
    d3.select("#map2_div svg").selectAll("path").remove("*")
    d3.select("#multi_line_div svg").selectAll("path").remove("*")
    d3.select(".heatmap_svg").remove("*")
    d3.select(".m_line_svg").remove("*")
    d3.select(".bar-svg").remove();
    d3.select(".map1-legend").remove();
    await renderVisualizations(+year)
}

async function renderVisualizations (selectedYear){
    try {

        // SODA Developers : https://dev.socrata.com/foundry/data.sfgov.org/tmnf-yvry

        const dateUrl = `&$where=date between '${selectedYear}-01-01T00:00:00' AND '${selectedYear}-12-31T11:59:59'`
        const crimeCatGroupCountUrl = dataSetUrl + limitUrl + aggFilterUrl + dateUrl

        // sfpd_districts geojson - https://dev.socrata.com/foundry/data.sfgov.org/q52f-skbd
        const promiseRes = await Promise.all([d3.json(crimeCatGroupCountUrl),d3.json("https://data.sfgov.org/resource/q52f-skbd.geojson"), d3.json("SFN.geojson")]);
        const crimeCatGroupCount = promiseRes[0];

        // Will work with this later
        let map1geoJson =  promiseRes[1]
        const SFNGeojson =  promiseRes[2]

        let crime_cases_count = {}
        let totalCrimeCasesForYr = 0
        crimeCatGroupCount.forEach(i=>{
            const key = i["category"]
            const val = +i["COUNT_category"]
            totalCrimeCasesForYr += val
            if(key=="OTHER OFFENSES" || key == "NON-CRIMINAL" || key == "WARRANTS" || key == "SUSPICIOUS OCC")
                return ;
            crime_cases_count[key]=val
        })

        $('.top_header').html(`Total Crime Cases reported in Year ${selectedYear}:`)
        $('.top_header_span').html(totalCrimeCasesForYr)

        console.log("crime_cases_count",crime_cases_count);
        let sorted = Object.keys(crime_cases_count).sort((a, b) => crime_cases_count[b] - crime_cases_count[a]);

        top_5 = sorted.slice(0, 5);
        top_15 = sorted.slice(0, 25);
        let top5_sum = 0
        let top_5_crimes_dict = {}
        let categoryUrl = " AND ( "
        top_5.forEach((i,idx)=>{
            top_5_crimes_dict[i] = crime_cases_count[i]
            top5_sum += crime_cases_count[i]
            if(idx == 4)
                categoryUrl += ` category = '${i}'`
            else
                categoryUrl += ` category = '${i}' OR`
        })
        categoryUrl += ")"
        let top_5_crimes = top_5.join(", ")
        console.log("top_5_crimes_dict",top_5_crimes_dict);
        console.log("top_5_crimes",top_5_crimes);

        $('.top_header_top_5_crime').html(`Top 5 reported crimes:`)
        $('.top_header_span_top_5_crime').html(top_5_crimes)

        console.log("Top 5 crime cases count",top5_sum);
        console.log("categoryUrl",categoryUrl);

        map1g.append("text").attr("id", "map1tooltip");

        const crimeDataUrl = dataSetUrl + limitUrl  + dateUrl + categoryUrl

        // Getting all the data with filtering
        const data = await d3.json(crimeDataUrl)
        // console.log("data",data);


        // const crime_groups = d3.group(input_data, d => d.category)
        // Grouping district, category wise, Merging all the cases with same Incident Numbers
        districtCrimeGroup = d3.rollup(data,
                            v=>v.length,
                            d=> d.pddistrict, // group 1
                            d => d.category);  // group 2


        // console.log("districtCrimeGroup",districtCrimeGroup);

        const districtCrimeCount = d3.rollup(data,
                                v=>v.length,
                                d => d.pddistrict); // group 1

        const districtCrimeCountObj = Array.from(districtCrimeCount).reduce((districtCrimeCountObj, [key, value]) => (
            Object.assign(districtCrimeCountObj, { [key]: value })
        ), {})
        console.log("districtCrimeCountObj",districtCrimeCountObj);
        let districtCrimePercentObj = {}
        let districtCrimeTop5PercentObj = {}
        let crimeCnt = 0
        for ([key, value] of Object.entries(districtCrimeCountObj)){
            if(value > crimeCnt){
                crimeCnt = value
                highestCrimeDistrict = key
            }
            const top5distPer = value/top5_sum * 100
            districtCrimeTop5PercentObj[key] = top5distPer
            districtCrimePercentObj[key] = value/totalCrimeCasesForYr * 100
        }

        let dataToPlotMap1 = Object.values(districtCrimeCountObj)
        let minValMap1 = d3.min(dataToPlotMap1)
        let maxValMap1 = d3.max(dataToPlotMap1)

        // d3.schemeBlues TODO
        let map1Scale = d3.scaleLinear()
                    .domain([minValMap1, maxValMap1])
                    .range([map1LowestColor, map1HighestColor])

        console.log("districtCrimePercentObj",districtCrimePercentObj);
        console.log("districtCrimeTop5PercentObj",districtCrimeTop5PercentObj);



        // TODO: http://bl.ocks.org/datamusing/5732776
        map1Projection.fitSize([map1SvgWidth, map1SvgHeight], map1geoJson);

        // const proj =  d3.geoConicEqualArea()
        //     .scale(map2Scale)
        //     .rotate([-1 *map2Longitude, 0])
        //     .center([0, map2Latitude])
        //     .parallels([24.6, 43.6])


        if(map1geoJson){
            map1geoJson.features.forEach(i =>{
                // Stroring data for tooltips and annotation
                const district = i.properties.district
                i.properties["total"] = districtCrimeCountObj[district]
                i.properties["top5_p"] = districtCrimeTop5PercentObj[district]
                i.properties["overall_p"] = districtCrimePercentObj[district]
                let k = 1;
                for (let [key, value] of districtCrimeGroup.get(district)) {
                    i.properties["crime_key"+k] = key
                    i.properties["crime_val"+k] = value
                    k++
                }
            })
        }

        // Clearing the area
        // Ref: data-viz-assignment-8 - g.selectAll("*").remove();
        map1g.selectAll("path").remove();

        const map1Viz = map1Svg.append("g").selectAll("path.land")
            .data(map1geoJson.features)
            .enter()
            .append("path")
            .attr("d", map1Path)
            .attr("class", "land")
            .style("fill", function(d) {
                return map1Scale(d.properties.total)
            })

        map1Svg.append("g").selectAll("path.outline")
            .data(map1geoJson.features)
            .enter()
            .append("path")
            .attr("d", map1Path)
            .attr("class", "outline")
            .style("fill", function(d) {
                return map1Scale(d.properties.total)
            })
            .style("stroke", "black")
            .style("stroke-width", 0.5)
            .each(function(d) {
                // save selection in data for interactivity
                // saves search time finding the right outline later
                d.properties.outline = this;
            })
            .on("mousemove", function(d,e) {

                let newLabel = e.properties.district
                // Ref: https://bl.ocks.org/dnprock/b48388ee8bc5582947b6
                let html = "";
                html += "<div class=\"tooltip_kv\">";
                html += "<span class=\"tooltip_header\">";
                html +=  newLabel.charAt(0) + newLabel.substr(1,e.properties.district.length).toLowerCase() + " district";
                html += "</span>";
                html += "</div>";
                html += "<div class=\"tooltip_kv\">";
                html += "<span class='tooltip_key'>";
                html += "Total Cases Reported";
                html += "</span>";
                html += "<span class=\"tooltip_value\">";
                html += e.properties.total;
                html += "</span>";
                html += "</div>";
                html += "<div class=\"tooltip_kv\">";
                html += "<span class='tooltip_key'>";
                html += "Total Crime Cases Share";
                html += "</span>";
                html += "<span class=\"tooltip_value\">";
                html += e.properties.overall_p.toFixed(2) + "%";
                html += "</span>";
                html += "</div>";
                html += "<div class=\"tooltip_kv\">";
                html += "<span class='tooltip_key'>";
                html += "Top 5 Crime Share";
                html += "</span>";
                html += "<span class=\"tooltip_value\">";
                html += e.properties.top5_p.toFixed(2) + "%";
                html += "</span>";
                html += "</div>";
                html += "<br>";
                html += "Distribution";
                html += "<hr>";
                for (let k = 1; k<=5;k++) {
                    let newLabel = e.properties["crime_key"+k]
                    html += "<div class=\"tooltip_kv\">";
                    html += "<span class='tooltip_key'>";
                    html += newLabel.charAt(0) + newLabel.substr(1,e.properties["crime_key"+k].length).toLowerCase();
                    html += "</span>";
                    html += "<span class=\"tooltip_value\">";
                    html += e.properties["crime_val"+k];
                    html += "</span>";
                    html += "</div>";
                }

                $("#map1-tooltip-container").html(html);
                $(this).attr("fill-opacity", "0.7");
                $("#map1-tooltip-container").show();

                const map_width = $('#map_div')[0].getBoundingClientRect().width;

                if (d.layerX < map_width / 2) {
                    d3.select("#map1-tooltip-container")
                        .style("top", (d.layerY + 15) + "px")
                        .style("left", (d.layerX + 15) + "px");
                } else {
                    var tooltip_width = $("#map1-tooltip-container").width();
                    d3.select("#map1-tooltip-container")
                        .style("top", (d.layerY + 15) + "px")
                        .style("left", (d.layerX - tooltip_width - 30) + "px");
                }
            })
            .on("mouseout", function() {
                $(this).attr("fill-opacity", "1.0");
                $("#map1-tooltip-container").hide();
            });

        drawBarChart(crime_cases_count, top_15, selectedYear)
        drawMultiLine(data,top_5)
        drawHeatMap(data,top_5)
        drawSpreadMap(data,top_5,SFNGeojson)


        // reset legend
        d3.select("body").selectAll("#maplegend").remove();

        // add a legend
        var legendwidth = 20,
            legendheight = 400;

        var legendsvg = d3.select("#map_div")
            .append("svg")
            .attr("width", legendwidth + 100)
            .attr("height", legendheight)
            .attr("id", "maplegend")
            .attr("class", "map1-legend");

        var legend = legendsvg.append("defs")
            .append("svg:linearGradient")
            .attr("id", "gradient")
            .attr("x1", "100%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "100%")
            .attr("spreadMethod", "pad");

        legend.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", map1HighestColor)
            .attr("stop-opacity", 1);

        legend.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", map1LowestColor)
            .attr("stop-opacity", 1);

        legendsvg.append("rect")
            .attr("width", legendwidth)
            .attr("height", legendheight)
            .style("fill", "url(#gradient)")
            .attr("transform", "translate(0,10)");

        var y = d3.scaleLinear()
            .range([legendheight, 0])
            .domain([0, maxValMap1]);

        var yAxis = d3.axisRight(y)
            .tickFormat(function(d) {
                return d + "%";
            }).tickSizeOuter(0);

        legendsvg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(20,10)")
            .call(yAxis)
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 30)
            .attr("dy", ".71em")
            // .attr("dy", "11.36px")
            .style("text-anchor", "end")
            .text("% Crime Rate(Missing person)")
            .style("fill", "black");

    }
    catch (e){
        console.log("Exception ",e );
    }
 
}

renderVisualizations(selectedYear)
