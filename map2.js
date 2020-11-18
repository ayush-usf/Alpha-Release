// Ref: http://bl.ocks.org/datamusing/5732776
let map2FilterData={}
const map2Width = 960,
    map2Height = 600,
    map2Scale = 270000,
    map2Latitude = 37.7750,
    map2Longitude = -122.4183;

let map2Svg = d3.select("#map2_div").append("svg")
    .attr("width", map2Width)
    .attr("height", map2Height);

let map2g = map2Svg.append("g")
    .attr("id", "hoods")

let circles = map2Svg.append("g")
    .attr("id", "circles");

let groupData;
let map2Colors = ['#1f77b4','#ff7f0e','#50fd50','#bcbd22','red']

// https://observablehq.com/@d3/conic-equal-area
const proj =  d3.geoConicEqualArea()
    .scale(map2Scale)
    .rotate([-1 *map2Longitude, 0])
    .center([0, map2Latitude])
    .parallels([24.6, 43.6]);

let path = d3.geoPath().projection(proj);

function drawSpreadMap(data, top_5, SFNGeojson){

    try{

        data = data.slice(0,10000)

        let markup = "";
        top_5.forEach((i,idx)=>{
            if(idx == 4){
                map2FilterData[i]=true
                markup += `<span class="map2_checkbox_span"><input type="checkbox" onclick="drawMap2Evt()" id="${i}-checkbox" checked value="">
                       <label>${i}</label></span>`

            }
            else{
                markup += `<span class="map2_checkbox_span"><input type="checkbox" onclick="drawMap2Evt()" id="${i}-checkbox" value="">
                       <label>${i}</label></span>`
                map2FilterData[i]=false
            }
        })
        $('#map2_checkbox').html(markup)

        groupData = d3.group(data, d => d.category)

        map2g.selectAll("path").data(SFNGeojson.features)
            .enter().append("path")
            .attr("d", path)
            .style("fill", function() { return "lightgrey" })
            .on("mouseover", function(e){d3.select(this).style("fill", "#f8bb26")})
            .on("mouseout", function(e){d3.select(this).style("fill", "lightgrey")})
            .attr("stroke","white")
            .attr("stroke-width", 1)

        let xy = proj([map2Longitude,map2Latitude])

        drawMap2(map2FilterData)
    }
    catch (e){
        console.log("e",e);
    }
}

function drawMap2(map2FilterData){
    circles.selectAll("circle").remove();
    // map2Svg.selectAll("rect").remove();
    map2Svg.selectAll(".legend").remove();
    let positions = []
    let form_add = []
    let title = []
    let lonlat = []

    let colorDict = {}

    Object.keys(map2FilterData).forEach((crime,idx) =>{
        if(map2FilterData[crime] == true)
            colorDict[crime]  = map2Colors[idx]
    })
    let color = Object.values(colorDict)
    let active = Object.keys(colorDict)

    let tip = d3.select('#map2-tip')
    let lpic = d3.select('#lpic')


    let legend = map2g.selectAll('g')
        .data(active)
        .enter()
        .append('g')
        .attr('class', 'legend');

    legend.append('rect')
        .attr('x', map2Width - 150)
        .attr('y', function(d, i){
            return (i *  15) + 10;})
        .attr('width', 10)
        .attr('height', 10)
        .style('fill', function(d,i) {
            return color[i];
        });

    legend.append('text')
        .attr('x', map2Width - 130)
        .attr('y', function(d, i){
            return (i *  15) + 19;})
        .attr('style',"font-size: 15px;")
        .text(function(d,i){
            return active[i];
        });

    let index = 0;
    let index2 = 0;
    for(let [key,value] of Object.entries(map2FilterData)){
        if(value == true){
            groupData.get(key).forEach((row)=>{
                row.lat = parseFloat(row.y)
                row.lon = parseFloat(row.x)
                let sub = proj([row.lon,row.lat])
                sub.push(map2Colors[index])
                sub.push(row.pddistrict)
                sub.push(row.address)
                sub.push(row.date.substring(0,10))
                sub.push(row.time)
                sub.push(color[index2])
                sub.push(key)
                positions.push(sub);
                // positions.push(proj([row.lon,row.lat]),)
                form_add.push(row.descript)
                title.push(row.category)
                lonlat.push([row.lon,row.lat])
            })
            index2++;
        }
        index++;
    }

    circles.selectAll("circle")
        .data(positions)
        .enter()
        .append("circle")
        .attr("cx", function(d,i){
            return positions[i][0];
        })
        //.transition().duration(10000).attr("cx", function(d,i){return positions[i][0];})
        .attr("cy", function(d,i) {
            return positions[i][1];
        })
        //.transition().duration(1000).attr("cy", function(d,i){return positions[i][1];})
        .attr("r",2.5)
        .attr("stroke","black")
        // .style("fill", "orange")
        .attr("fill", function(d) {
            return d[2];
        })
        .attr("id", function(d,i) {
            return title[i];
        })
        .on("mouseover",function(d,i){
            d3.select(this).style("fill"," lawngreen")
                .transition(100).attr('r',20)
            //d3.select(circles).circle.style('fill','lawngreen')
            cy = this.cy.baseVal.value;
            // console.log(form_add[i]);

            tip.style('display','inline-block')
                .style('left', event.pageX - 50 + "px")
                .style('top', event.pageY - 70 + "px")
                .style('text-align', "left")
                .html(i[3] + " district<hr>Address: " +i[4]+ "<br><br>Date: " +i[5]+ "<br>Time: " +i[6])

            circles.selectAll("circle")
                .style("fill", function(d){
                    // if(this.id == d[8])
                    if(this.id == title[i])
                        //this.parentNode.appendChild(this);
                        return "orange" ;
                    else
                        return d[7];
                })
                .transition(100).attr("r", function(d){
                // if(this.id == d[8])
                if(this.id == title[i])
                    return 8
                else
                    return 2.5;
            })
                // .transition(100).attr(
                // "r",function(d){
                // //     if(this.id == d[8])
            // if(this.id == title[i])
                //         return 4.5;
                //     else
                //         return 2.5;});
            //.sort(this.id == title[i]);
            //.parentNode.appendChild(this);
            //element.parentNode.appendChild(element)
            // circles.selectAll("circle .vertigo").style("fill","lawngreen");
        })
        .on("mouseout",function(d,i){
            circles.selectAll("circle")
                .transition()
                .delay(1000)
                .duration(1000)
            .style("fill", function(d){
                return d[7];
            })

            // d3.select(this).transition()
            //     .delay(500)
            //     .duration(500)
            //     .style("fill",i[7]);
            d3.selectAll(this.id).transition(100).attr('r',4.5)
            tip.transition()
                .delay(5000)
                .duration(1000)
                .style('display', 'none');
            // lpic.style('display', 'none');
            circles.selectAll('circle').transition(100).attr("r",2.5);
        });
}

function drawMap2Evt(){
    event.stopPropagation()
    let checkbox_id = event.target.id.split('-')[0]
    map2FilterData[checkbox_id]= map2FilterData[checkbox_id] == true ? false : true;
    let flag = Object.values(map2FilterData).some(i => i == true);
    if(flag == false){
        // $(event.target).prop( "checked",true)
        // alert("Atleast 1 crime type should be selected in Crime Spread Map (Visualization 2)")
        circles.selectAll("circle").remove();
        map2Svg.selectAll(".legend").remove();
        return
    }
    drawMap2(map2FilterData)
}