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
const map1SvgHeight = 500

const fixed_top_7 = ["LARCENY/THEFT", "ASSAULT", "DRUG/NARCOTIC", "VEHICLE THEFT", "VANDALISM", "BURGLARY", "ROBBERY"]
let top_5;

const map1Width = 960,
    map1Height = 600,
    map1Latitude = 37.7750,
    map1Longitude = -122.4183;

let map1Svg = d3.select("#map_div").append("svg")
    .attr("width", map1Width)
    .attr("height", map1Height);

// let map1g = map1Svg.append("g")
//     .attr("id", "hoods")

let map1g = map1Svg.append("g")
    .attr("class", "map1-g")

const map1Projection = d3.geoConicEqualArea()
    .parallels([37.692514, 37.840699])
    .rotate([122, 0]);

const map1Path = d3.geoPath().projection(map1Projection);

async function changeOverallYear(){
    const year = document.getElementById("year_select").value;
    d3.select("#map_div svg").selectAll("path").remove("*")
    d3.select("#map2_div svg").selectAll("path").remove("*")
    d3.select("#multi_line_div svg").selectAll("path").remove("*")
    d3.select(".heatmap_svg").remove("*")
    d3.select(".m_line_svg").remove("*")
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
        console.log("Total crime cases count",totalCrimeCasesForYr);

        console.log("crime_cases_count",crime_cases_count);
        let sorted = Object.keys(crime_cases_count).sort((a, b) => crime_cases_count[b] - crime_cases_count[a]);

        top_5 = sorted.slice(0, 5);
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
        console.log("Top 5 crime cases count",top5_sum);
        console.log("categoryUrl",categoryUrl);

        const crimeDataUrl = dataSetUrl + limitUrl  + dateUrl + categoryUrl

        // Getting all the data with filtering
        const data = await d3.json(crimeDataUrl)
        // console.log("data",data);


        // const crime_groups = d3.group(input_data, d => d.category)
        // Grouping district, category wise, Merging all the cases with same Incident Numbers
        const districtCrimeGroup = d3.rollup(data,
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
                // i.properties["top5_p"] = districtCrimeTop5PercentObj[district]
                // i.properties["overall_p"] = districtCrimePercentObj[district]
                // console.log("i",i);
            })
        }

        // Clearing the area
        // Ref: data-viz-assignment-8 - g.selectAll("*").remove();
        map1g.selectAll("path").remove();

        const basemap = map1Svg.append("g").selectAll("path.land")
            .data(map1geoJson.features)
            .enter()
            .append("path")
            .attr("d", map1Path)
            .attr("class", "land")
            .style("fill", function(d) {
                return map1Scale(d.properties.total)
            });

        map1Svg.append("g").selectAll("path.neighborhood")
            .data(map1geoJson.features)
            .enter()
            .append("path")
            .attr("d", map1Path)
            .attr("class", "neighborhood")
            .style("fill", function(d) {
                return map1Scale(d.properties.total)
            })
            .style("stroke", "black")
            .style("stroke-width", 0.5)
            .each(function(d) {
                // save selection in data for interactivity
                // saves search time finding the right outline later
                d.properties.outline = this;
            });

        drawMultiLine(data,top_5)
        drawHeatMap(data,top_5)
        drawSpreadMap(data,top_5,SFNGeojson)

        // add highlight
        basemap.on("mouseover.highlight", function(d) {
            d3.select(d.properties.outline).raise();
            d3.select(d.properties.outline).classed("active", true);
        })
            .on("mouseout.highlight", function(d) {
                d3.select(d.properties.outline).classed("active", false);
            });

        // add tooltip
        basemap.on("mouseover.tooltip", function(d) {
            tip.text(d.properties.district);
            tip.style("visibility", "visible");
            showLabel(d, year);
        })
            .on("mousemove.tooltip", function(d) {
                const coords = d3.mouse(g.basemap.node());
                tip.attr("x", coords[0]);
                tip.attr("y", coords[1]);
                moveLabel();
            })
            .on("mouseout.tooltip", function(d) {
                tip.style("visibility", "hidden");
                hideLabel();
            });

        basemap.on("click", function(d) {
            clicked(d, filtereddataset, year);
        });

        // reset legend
        d3.select("body").selectAll("#maplegend").remove();

        // add a legend
        var legendwidth = 20,
            legendheight = 300;

        var legendsvg = d3.select("body").select("#map1_div")
            .append("svg")
            .attr("width", legendwidth + 100)
            .attr("height", legendheight)
            .attr("id", "maplegend")
            .attr("class", "legend");

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
            .attr("stop-color", highColor)
            .attr("stop-opacity", 1);

        legend.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", lowColor)
            .attr("stop-opacity", 1);

        legendsvg.append("rect")
            .attr("width", legendwidth)
            .attr("height", legendheight)
            .style("fill", "url(#gradient)")
            .attr("transform", "translate(0,10)");

        var y = d3.scaleLinear()
            .range([legendheight, 0])
            .domain([0, maxVal]);

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
            .style("text-anchor", "end")
            .text("% Crime Rate(Missing person)")
            .style("fill", "black");

    }
    catch (e){
        console.log("Exception ",e );
    }
 
}

renderVisualizations(selectedYear)
