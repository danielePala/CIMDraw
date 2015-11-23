let cimTreeController = {
    
    setModel: function(model) {
	this.model = model;
    },

    render: function(diagramName) {
	// clear all
	d3.select("#app-spreadsheet").select(".table").remove();
	
	let diagram = this.model.getObjects("cim:Diagram")
            .filter(el => el.getAttributes()
		    .filter(el => el.nodeName === "cim:IdentifiedObject.name")[0].textContent===decodeURI(diagramName));
	let allACLines = this.model.getObjects("cim:ACLineSegment");
	console.log("extracted acLines");
	let allDiagramObjects = this.model.getObjects("cim:DiagramObject");
	console.log("extracted diagramObjects");
	if (diagram.length > 0) {
	    allDiagramObjects = allDiagramObjects.filter(el => el.getLinks().filter(el => el.localName === "DiagramObject.Diagram")[0].attributes[0].value === "#" + diagram[0].attributes[0].value);
	}
	let ioEdges = this.model.getGraph(allDiagramObjects, "DiagramObject.IdentifiedObject");
	if (diagram.length > 0) {
	    let graphicObjects = ioEdges.map(el => el.source);
	    allACLines = allACLines.filter(acl => graphicObjects.indexOf(acl) > -1);
	}
	let nodes = allACLines;
	
	// spreadsheet test
	if (allACLines.length > 0) {
	    var keyValues = allACLines[0].getAttributes().map(el => el.localName);

	    d3.select("#app-spreadsheet")
		.append("div")
		.attr("class", "table")

	    d3.select("div.table")
		.append("div")
		.attr("class", "head")
		.selectAll("div.data")
		.data(keyValues)
		.enter()
		.append("div")
		.attr("class", "data")
		.html(function (d) {return d})
		.style("left", function(d,i) {return (i * 200) + "px"});

	    d3.select("div.table")
		.selectAll("div.datarow")
		.data(allACLines)
		.enter()
		.append("div")
		.attr("class", "datarow")
		.style("top", function(d,i) {return (40 + (i * 40)) + "px"});

	    d3.selectAll("div.datarow")
		.selectAll("div.data")
		.data(function(d) {return d.getAttributes()})
		.enter()
		.append("div")
		.attr("class", "data")
		.html(function (d) {return d.innerHTML})
		.style("left", function(d,i,j) {return (i * 200) + "px"});

	    d3.selectAll("div.datarow")
		.on("mouseover.hover", this.hover)
		.on("mouseout", this.mouseOut);
	}
    },

    hover: function(hoverD) {
	d3.selectAll("div.datarow")
	    .filter(function (d) {return d == hoverD;})
	    .style("background", "#94B8FF");
	d3.selectAll("g.ACLineSegment")
	    .filter(function (d) {return d == hoverD;})
	    .style("stroke", "black")
	    .style("stroke-width", "2px");
    },

    mouseOut: function() {
	d3.selectAll("div.datarow").style("background", "white");
	d3.selectAll("g.ACLineSegment").style("stroke-width", "0px");
    }
};
