// Ref: https://bl.ocks.org/pstuffa/fbf893deff6661f7402846b41457ebcb
async function drawSmallMultiples(data){

    let smMargin = {top: 20, right: 20, bottom: 20, left: 50},
        smWidth = 300 - smMargin.left - smMargin.right,
        smHeight = 220 - smMargin.top - smMargin.bottom;

    let smBody = d3.select("#small-multiples");
    let sMxScale = d3.scaleTime()
        .range([0, smWidth]);

    let sMyScale = d3.scaleLinear()
        .range([smHeight, 0]);

    let sMxAxis = d3.axisBottom(sMxScale)
        .ticks(d3.timeWeek)
        .tickSize(-smHeight);

    let sMyAxis = d3.axisLeft(sMyScale);

    let smLine = d3.line()
        .x(function (d) {
            return sMxScale(d.date);
        })
        .y(function (d) {
            return sMyScale(d.cumulative);
        });

    let divisionOrder = ["MISSION","SOUTHERN","NORTHERN","CENTRAL","INGLESIDE","TARAVAL","RICHMOND","TENDERLOIN","PARK","BAYVIEW"];


    data.forEach(function (d) {
        // d.win_loss = (d.result == 'W') ? 1 : -1;
        d.date = new Date(d.date);
    })

    sMxScale.domain(d3.extent(data, function (d) {
        return d.date;
    })).nice()
    sMyScale.domain([-60, 60])

    let nestedCrimeData = d3.groups(data, d => d.pddistrict, d => d.category);

    // Get cumulative win/loss
    nestedCrimeData.forEach(function (region) {
        region[1].forEach(function (crimeType) {
            let counter = 0;
            crimeType[1].forEach(function (d) {
                d.cumulative = counter + 1;
                counter = d.cumulative;
            })
        })

        // region[1].sort(function (a, b) {
        //     return
        //     divisionOrder.indexOf(a[0]) - divisionOrder.indexOf(b[0]);
        // });
    });
    nestedCrimeData=["test",nestedCrimeData]

    let leagueGroup = smBody.selectAll(".league")
        .data(nestedCrimeData)
        .enter().append("div")
        .attr("class", "league")

    leagueGroup.append("h2")
        .text(function (d) {
            return d[0];
        })

    let divisionGroup = leagueGroup.selectAll(".division")
        .data(function (d) {
            return d[1];
            // return d.map(i=>i[0]);
        })
        .enter().append("svg")
        .attr("class", "division")
        .attr("width", smWidth + smMargin.left + smMargin.right)
        .attr("height", smHeight + smMargin.top + smMargin.bottom)
        .append("g")
        .attr("transform", "translate(" + smMargin.left + "," + smMargin.top + ")")

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
        .attr("d", function (d) {
            return smLine(d[1]);
            // return smLine(d);
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