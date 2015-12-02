let cimTreeController = {
    
    setModel: function(model) {
	this.model = model;
    },

    render: function(diagramName) {
	// clear all
	d3.select("#app-spreadsheet").select(".tree").remove();
	
	let diagram = this.model.getObjects("cim:Diagram")
            .filter(el => el.getAttributes()
		    .filter(el => el.nodeName === "cim:IdentifiedObject.name")[0].textContent===decodeURI(diagramName));
	let allConnectivityNodes = this.model.getObjects("cim:ConnectivityNode");
	console.log("extracted connectivity nodes");
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
	
	// navtree
	d3.select("#app-spreadsheet")
	    .append("div")
	    .attr("class", "tree");
	
	let cimNetwork = d3.select("div.tree")
	    .append("ul")
	    .attr("class", "CIMNetwork list-group");
	this.createElements(cimNetwork, "ACLineSegment", "AC Line Segments", allACLines);
	this.createElements(cimNetwork, "ConnectivityNode", "Connectivity Nodes", allConnectivityNodes);
	
	d3.selectAll("li.ACLineSegment")
	    .on("mouseover.hover", this.hover)
	    .on("mouseout", this.mouseOut);
    },

    createElements: function(cimNetwork, name, printName, data) {
	let elementsTopContainer = cimNetwork
	    .append("li")
	    .attr("class", name + "s" + " list-group-item");
	elementsTopContainer.append("a")
	    .attr("class", "btn btn-primary btn-xs")
	    .attr("role", "button")
	    .attr("data-toggle", "collapse")
	    .attr("href", "#" + name + "sList")
	    .html(printName);
	elementsTopContainer.append("span")
	    .attr("class", "badge")
	    .html(data.length);
	let elements = elementsTopContainer
	    .append("ul")
	    .attr("id", name + "sList")
	    .attr("class", "collapse");
	let elementTopContainer = elements
	    .selectAll("li." + name)
	    .data(data)
	    .enter()
	    .append("li")
	    .attr("class", name)
	elementTopContainer.append("a")
	    .attr("class", "btn btn-primary btn-xs")
	    .attr("role", "button")
	    .attr("data-toggle", "collapse")
	    .attr("href", function(d) {return "#" + d.attributes[0].value;})
	    .html(function (d) {return d.getAttribute("cim:IdentifiedObject.name").textContent});
	let elementEnter = elementTopContainer
	    .append("ul")
	    .attr("id", function(d) {return d.attributes[0].value;})
	    .attr("class", "collapse");
	elementEnter
	    .selectAll("li")
	    .data(function(d) {return d.getAttributes();})
	    .enter()
	    .append("li")
	    .html(function (d) {return d.localName.split(".")[1] + ": " + d.innerHTML});
    },

    hover: function(hoverD) {
	/*d3.selectAll("li.ACLineSegment")
	    .filter(function (d) {return d == hoverD;})
	    .style("background", "#94B8FF");*/
	d3.selectAll("g.ACLineSegment")
	    .filter(function (d) {return d == hoverD;})
	    .style("stroke", "black")
	    .style("stroke-width", "2px");
    },

    mouseOut: function() {
	d3.selectAll("li.ACLineSegment").style("background", "white");
	d3.selectAll("g.ACLineSegment").style("stroke-width", "0px");
    }
};
