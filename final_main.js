let crime_types;
// const limit = 150
const limit = 100000
// const limit = 23000
let allYearsData = {}
let allYearsCrimePercentage = {}
let top_5={};
let top_25={};
let map1geoJson, SFNGeojson;
const numberFormat = d3.format(",");
let selectedYear = 2014
let crime_cases_count = {}
let totalCrimeCasesForYr={}
let ulMarkup={};
let categoryUrl={};
let districtCrimeCount = {}
let districtCrimeCountObj = {}
let ulMarkup2 = {}
let parentMarkup = {}
let top5_sum = {}
let reqdKeys = ["category", "descript", "date", "time", "pddistrict", "address","x","y"]
let dataToPlotMap1 = {}
let minValMap1 = {}
let maxValMap1 = {}
let maxValMap2 = {}

// API Call Url
const dataSetUrl = "https://data.sfgov.org/resource/tmnf-yvry.json?"
const aggFilterUrl = "&$select=category,COUNT(category)&$group=category"
const limitUrl = `$limit=${limit}`

// Map 1 - Choropleth
const map1LowestColor = '#f1e4d6';
const map1HighestColor = '#ef9a4f';
const map1SvgWidth = 700
const map1SvgHeight = 600
const map1Latitude = 37.7750,
    map1Longitude = -122.4183;

let map1Svg = d3.select("#map_div").append("svg")
    .attr("width", map1SvgWidth)
    .attr("height", map1SvgHeight);

// let map1g = map1Svg.append("g")scaleExtent
//     .attr("id", "hoods")

let map1g = map1Svg.append("g")
    .attr("class", "map1-g")

const map1Projection = d3.geoConicEqualArea()
    .parallels([map1Latitude, map1Longitude])
    .rotate([122, 0]);

const map1Path = d3.geoPath().projection(map1Projection);
let districtCrimeGroup={};

async function changeOverallYear(){

    // Clearing the page/ old visualizations
    $('.first_load').hide()
    const year = document.getElementById("year_select").value;
    $('#year_selected').html(`Year : ${year}`)
    $('.top_header_span_top_5_crime2').hide()
    d3.select("#map_div svg").selectAll("path").remove("*")
    d3.select("#map2_div svg").selectAll("path").remove("*")
    d3.select(".heatmap_svg").selectAll('g').remove("*")
    d3.select("#sm_legend_svg").selectAll('g').remove("*")
    d3.select("#small-multiples").selectAll('svg').remove("*")
    d3.select(".map2-svg #hoods").remove("*")
    d3.select(".map2-svg #circles").remove("*")
    mLineSvg.selectAll("*").remove();
    d3.select(".bar-svg").selectAll('g').remove();
    d3.select(".bar-toolTip").remove();
    d3.select(".map1-map1Legend").remove();
    $('.top_header').html("")
    $('#crime_prcnt').html(`Different crime types by percentage for ${year}:`)
    $('.top_header_top_5_crime').html("")
    // $('#diff_crime').text("Different Types of Crimes Reported in "+selectedYear+":")
    $('.top_header').html(`Total Crime Cases reported :`).show()
    // $('.top_header').html(`Total Crime Cases reported in year ${year}:`).show()
    $('#heatmap_div_main').html(`Hourly Crime Variation for Year ${year}:`).show()

    await renderVisualizations(+year)
}

async function renderVisualizations (selectedYear){
    try {
        if(!totalCrimeCasesForYr[selectedYear])
            totalCrimeCasesForYr[selectedYear] = 0
        let crimeCatGroupCount;
        const dateUrl = `&$where=date between '${selectedYear}-01-01T00:00:00' AND '${selectedYear}-12-31T11:59:59'`


        // First getting all the crime types count
        if(!allYearsCrimePercentage[selectedYear]){
            // SODA Developers : https://dev.socrata.com/foundry/data.sfgov.org/tmnf-yvry
            await getOverallCrimeCnt(selectedYear,dateUrl)
        }
        crimeCatGroupCount = allYearsCrimePercentage[selectedYear]

        // Obtaining the data only one time
        if(!map1geoJson && !SFNGeojson){

            // sfpd_districts geojson - https://dev.socrata.com/foundry/data.sfgov.org/q52f-skbd
            // Getting the crime types count, geojson for map from api source, geojson from file
            const promiseRes = await Promise.all([d3.json("https://data.sfgov.org/resource/q52f-skbd.geojson"), d3.json("SFN.geojson")]);

            // Storing results
            // Will work with this later, with other visualizations
            map1geoJson =  promiseRes[0]
            SFNGeojson =  promiseRes[1]
        }

        if(!crime_cases_count[selectedYear]){
            crime_cases_count[selectedYear] ={}
        }

        if(!Object.keys(crime_cases_count[selectedYear]).length)
            calculateGroupCount(crimeCatGroupCount,selectedYear)

        // Percentage of crime, with all crime types
        renderCrimePercentage(selectedYear)

        // Extracting the top crime types
        if(!top_5[selectedYear] || !top_25[selectedYear])
            calculateTopCrimes(selectedYear)

        if(!top5_sum[selectedYear])
            top5_sum[selectedYear] = 0

        if(!ulMarkup[selectedYear])
            storeCategUrlAndTop5Crimes(selectedYear)

        $('.top_header_span_top_5_crime').html(ulMarkup[selectedYear]).show()

        // Choropleth Map
        map1g.append("text").attr("id", "map1tooltip");

        // Getting all the data with filtering
        let data;
        if(!allYearsData[selectedYear]){
            // Getting actual data for the year
            const crimeDataUrl = dataSetUrl + limitUrl  + dateUrl + categoryUrl[selectedYear]
            const rawData = await d3.json(crimeDataUrl)
            cleanStoreData(rawData,selectedYear)
        }
        data = allYearsData[selectedYear]

        drawMultiLine(data,top_5[selectedYear],selectedYear)
        drawBarChart(crime_cases_count[selectedYear], top_25[selectedYear], selectedYear)
        drawHeatMap(data,top_5[selectedYear],selectedYear)
        drawSpreadMap(data,top_5[selectedYear],SFNGeojson)
        drawSmallMultiples(data,top_5[selectedYear],selectedYear)

        // Grouping district, category wise, Merging all the cases with same Incident Numbers
        if(!districtCrimeGroup[selectedYear]){
            calculateDistrictCategory(data,selectedYear)
        }

        if(!districtCrimeCount[selectedYear]){
            calculateDistrictWiseCount(data,selectedYear)
        }

        if(!districtCrimeCountObj[selectedYear]){
            createDistrictCrimeCountObj(selectedYear)
        }

        if(!ulMarkup2[selectedYear]){
            ulMarkup2[selectedYear] = `<ul>`;
            Object.keys(districtCrimeCountObj[selectedYear]).forEach(i=>{
                ulMarkup2[selectedYear] += `<li class="crime_li"><b>${i}:</b> ${numberFormat(districtCrimeCountObj[selectedYear][i])}</li>`
            })
            ulMarkup2[selectedYear]+=`</ul>`
        }
        $('.top_header_span_top_5_crime2').html(ulMarkup2[selectedYear]).show()

        let districtCrimePercentObj = {}
        let districtCrimeTop5PercentObj = {}
        let crimeCnt = 0
        for (let [key, value] of Object.entries(districtCrimeCountObj[selectedYear])){
            if(value > crimeCnt){
                crimeCnt = value
                highestCrimeDistrict = key
            }
            districtCrimeTop5PercentObj[key] = value / top5_sum[selectedYear] * 100
            districtCrimePercentObj[key] = value/totalCrimeCasesForYr[selectedYear] * 100
        }


        // Map 1 - Choropleth
        if(!dataToPlotMap1[selectedYear]){
            dataToPlotMap1[selectedYear] = Object.values(districtCrimeCountObj[selectedYear])
            minValMap1[selectedYear] = d3.min(dataToPlotMap1[selectedYear])
            maxValMap1[selectedYear] = d3.max(dataToPlotMap1[selectedYear])
        }
        if(!maxValMap2[selectedYear])
            maxValMap2[selectedYear] = d3.max(Object.values(districtCrimePercentObj))

        let map1Scale = d3.scaleLinear()
                    .domain([minValMap1[selectedYear], maxValMap1[selectedYear]])
                    .range([map1LowestColor, map1HighestColor])


        map1Projection.fitSize([map1SvgWidth, map1SvgHeight], map1geoJson);

        map1geoJson.features.forEach(i =>{
            // Stroring data for tooltips and annotation
            const district = i.properties.district
            i.properties["total"] = districtCrimeCountObj[selectedYear][district]
            i.properties["top5_p"] = districtCrimeTop5PercentObj[district]
            i.properties["overall_p"] = districtCrimePercentObj[district]
            let k = 1;
            for (let [key, value] of districtCrimeGroup[selectedYear].get(district)) {
                i.properties["crime_key"+k] = key
                i.properties["crime_val"+k] = value
                k++
            }
        })


        // Clearing the area
        // Ref: data-viz-assignment-8 - g.selectAll("*").remove();
        map1g.selectAll("path").remove();

        map1Svg.append("g").selectAll("path.main-geo")
            .data(map1geoJson.features)
            .enter()
            .append("path")
            .attr("d", map1Path)
            .attr("class", "main-geo")
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
                html += numberFormat(e.properties.total);
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
                    html += numberFormat(e.properties["crime_val"+k]);
                    html += "</span>";
                    html += "</div>";
                }

                $("#map1-tooltip-container").html(html).show();
                $(this).attr("fill-opacity", "0.7");

                const map_width = $('#map_div')[0].getBoundingClientRect().width;
                let tip_y = event.pageY
                if(d.layerY>380){
                    tip_y -=350
                }
                else{
                    tip_y +=15
                }
                if (d.layerX < map_width / 2) {
                    d3.select("#map1-tooltip-container")
                        .style("top", (tip_y) + "px")
                        .style("left", (event.pageX + 15) + "px");
                } else {
                    let tooltip_width = $("#map1-tooltip-container").width();
                    d3.select("#map1-tooltip-container")
                        .style("top", (tip_y) + "px")
                        .style("left", (event.pageX - tooltip_width - 30) + "px");
                }
            })
            .on("mouseout", function() {
                $(this).attr("fill-opacity", "1.0");
                $("#map1-tooltip-container").hide();
            });



        // reset map1Legend
        
        d3.select("body").selectAll("#map1_map1Legend").remove();

        // add a map1Legend
        let map1LegWidth = 20,
            map1LegHeight = 400;

        let map1Lsvg = d3.select("#map_div")
            .append("svg")
            .attr("width", map1LegWidth + 100)
            .attr("height", map1LegHeight)
            .attr("id", "map1_map1Legend")
            .attr("class", "map1-map1Legend");

        let map1Legend = map1Lsvg.append("defs")
            .append("linearGradient")
            .attr("id", "gradient")
            .attr("x1", "100%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "100%")
            .attr("spreadMethod", "pad");

        map1Legend.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", map1HighestColor)
            .attr("stop-opacity", 1);

        map1Legend.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", map1LowestColor)
            .attr("stop-opacity", 1);

        map1Lsvg.append("rect")
            .attr("width", map1LegWidth)
            .attr("height", map1LegHeight)
            .style("fill", "url(#gradient)")
            .attr("transform", "translate(0,10)");

        let y = d3.scaleLinear()
            .range([map1LegHeight, 0])
            .domain([0, maxValMap2[selectedYear]]);

        let yAxis = d3.axisRight(y)
            .tickFormat(function(d) {
                return d + "%";
            }).tickSizeOuter(0);

        map1Lsvg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(20,10)")
            .call(yAxis)
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 30)
            .attr("dy", "11px")
            .style("text-anchor", "end")
            .text("Crime Rate (%)")
            .style("fill", "black");

        if(!allYearsCrimePercentage["2015"])
            await getOverallCrimeCntForYears("2015","2016","2017")

        if(!allYearsData["2015"])
            await getOverallCrimeDataForYears("2015","2016","2017")

    }
    catch (e){
        console.log("Exception ",e );
    }
 
}

async function getOverallCrimeCnt(selectedYear,dateUrl){

    const crimeCatGroupCountUrl = dataSetUrl + limitUrl + aggFilterUrl + dateUrl
    allYearsCrimePercentage[selectedYear] = await d3.json(crimeCatGroupCountUrl)
}

async function getOverallCrimeCntForYears(...years){

    let promises = []
    for(let i = 0; i< years.length;i++){
        const dateUrl = `&$where=date between '${years[i]}-01-01T00:00:00' AND '${years[i]}-12-31T11:59:59'`
        const crimeCatGroupCountUrl = dataSetUrl + limitUrl + aggFilterUrl + dateUrl
        promises.push(d3.json(crimeCatGroupCountUrl))
    }
    const promiseRes = await Promise.all(promises);
    // Rendering on total crime cases count
    $('.top_header_span').html(numberFormat(totalCrimeCasesForYr["2014"]))
    for(let i = 0; i< years.length;i++){
        allYearsCrimePercentage[years[i]] = promiseRes[i]
        calculateGroupCount(allYearsCrimePercentage[years[i]],years[i])
        $('.top_header_span_'+years[i]).html(numberFormat(totalCrimeCasesForYr[years[i]]))
        calculateTopCrimes(years[i])
        storeCategUrlAndTop5Crimes(years[i])
    }

}

async function getOverallCrimeDataForYears(...years){
    let promises = []

    for(let i = 0; i< years.length;i++){
        const dateUrl = `&$where=date between '${years[i]}-01-01T00:00:00' AND '${years[i]}-12-31T11:59:59'`
        const crimeDataUrl = dataSetUrl + limitUrl  + dateUrl + categoryUrl[selectedYear]
        promises.push(d3.json(crimeDataUrl))
    }
    const promiseRes = await Promise.all(promises);
    for(let i = 0; i< years.length;i++){
        let rawData = await promiseRes[i]
        cleanStoreData(rawData,years[i])

        calculateDistrictCategory(allYearsData[years[i]],years[i])
        calculateDistrictWiseCount(allYearsData[years[i]],years[i])
        createDistrictCrimeCountObj(years[i])
        dataToPlotMap1[years[i]] = Object.values(districtCrimeCountObj[years[i]])
        minValMap1[years[i]] = d3.min(dataToPlotMap1[years[i]])
        maxValMap1[years[i]] = d3.max(dataToPlotMap1[years[i]])
    }
}

function calculateGroupCount(crimeCatGroupCount,selectedYear){
    if(!crime_cases_count[selectedYear]){
        crime_cases_count[selectedYear]={}
    }
    if(!totalCrimeCasesForYr[selectedYear]){
        totalCrimeCasesForYr[selectedYear]=0
    }
    // Removing non-required data attributes
    crimeCatGroupCount.forEach(i=>{
        const key = i["category"]
        const val = +i["COUNT_category"]
        totalCrimeCasesForYr[selectedYear] += val
        if(key=="OTHER OFFENSES" || key == "NON-CRIMINAL" || key == "WARRANTS" || key == "SUSPICIOUS OCC")
            return ;
        crime_cases_count[selectedYear][key]=val
    })
}

function renderCrimePercentage(selectedYear){
    if(!parentMarkup[selectedYear]){
        parentMarkup[selectedYear] = ``;
        Object.keys(crime_cases_count[selectedYear]).forEach(i=>{
            parentMarkup[selectedYear]+= `<div class="col-md-4"><ul style="margin-bottom: 10px !important;"><li class=""><b>${i}</b> (${(crime_cases_count[selectedYear][i]/totalCrimeCasesForYr[selectedYear]*100).toFixed(2)} %)</li></ul></div>`
        })    
    }
    $('.stats_parent').html(parentMarkup[selectedYear])
}

function storeCategUrlAndTop5Crimes(selectedYear){
    if(!top5_sum[selectedYear])
        top5_sum[selectedYear] = 0

    let top_5_crimes_dict = {}
    categoryUrl[selectedYear] = " AND ( "
    top_5[selectedYear].forEach((i,idx)=>{
        top_5_crimes_dict[i] = crime_cases_count[selectedYear][i]
        top5_sum[selectedYear] += crime_cases_count[selectedYear][i]
        if(idx == 4)
            categoryUrl[selectedYear] += ` category = '${i}'`
        else
            categoryUrl[selectedYear] += ` category = '${i}' OR`
    })
    categoryUrl[selectedYear] += ")"

    ulMarkup[selectedYear] = `<ul>`;
    top_5[selectedYear].forEach(i=>{
        ulMarkup[selectedYear] += `<li class="crime_li"><b>${i}:</b> ${numberFormat(top_5_crimes_dict[i])}</li>`
    })
    ulMarkup[selectedYear]+=`</ul>`
}

function calculateTopCrimes(selectedYear){
    // Sorting the crime types based on their count
    let sorted = Object.keys(crime_cases_count[selectedYear]).sort((a, b) => crime_cases_count[selectedYear][b] - crime_cases_count[selectedYear][a]);
    top_5[selectedYear] = sorted.slice(0, 5);
    top_25[selectedYear] = sorted.slice(0, 25);
}

function cleanStoreData(rawData,selectedYear){
    if(!allYearsData[selectedYear]){
        rawData.forEach(i=>{
            Object.keys(i).forEach(key=>{
                if(!reqdKeys.includes(key))
                    delete i[key]
            })
        })
    }

    allYearsData[selectedYear]= rawData
}

function calculateDistrictCategory(data,selectedYear){
    districtCrimeGroup[selectedYear] = d3.rollup(data,
        v=>v.length,
        d=> d.pddistrict, // group 1
        d => d.category);  // group 2
}

function calculateDistrictWiseCount(data,selectedYear){
    districtCrimeCount[selectedYear] = d3.rollup(data,
        v=>v.length,
        d => d.pddistrict); // group 1
}

function createDistrictCrimeCountObj(selectedYear){
    let obj = Array.from(districtCrimeCount[selectedYear]).reduce((obj, [key, value]) => (
        Object.assign(obj, { [key]: value })
    ), {})
    districtCrimeCountObj[selectedYear] = obj
}

$(document).ready(function(){
    // $("#myModal").modal('show');
    $('#close_button').click(function(e) {
        e.preventDefault();
        $('#myModal').modal('toggle'); //or  $('#IDModal').modal('hide');
        return false;
    })
});
renderVisualizations(selectedYear)
