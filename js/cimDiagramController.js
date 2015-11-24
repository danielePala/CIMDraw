let zoomComp = d3.behavior.zoom();
let zoomEnabled = false;
let xoffset = 0;
let yoffset = 0;
let svgZoom = 1;
let tickFunction = function(){};
let zoomFunction = function(){};
let force = d3.layout.force().charge(-900)
    .gravity(0.9)
    .size([1200,800])
    .linkDistance(20);

let cimDiagramController = {
    
    setModel: function(model) {
	console.log(this);
	this.model = model;
    },

    render: function(diagramName) {
	// clear all
	d3.select("svg").select("g").selectAll("g").remove();
	d3.select("svg").selectAll("#yAxisG").remove();
	d3.select("svg").selectAll("#xAxisG").remove();
	
	let diagram = this.model.getObjects("cim:Diagram")
            .filter(el => el.getAttributes()
		    .filter(el => el.nodeName === "cim:IdentifiedObject.name")[0].textContent===decodeURI(diagramName));
	let allTerminals = this.model.getObjects("cim:Terminal");
	console.log("extracted terminals");
	let allConnectivityNodes = this.model.getObjects("cim:ConnectivityNode");
	console.log("extracted connectivity nodes");
	let allACLines = this.model.getObjects("cim:ACLineSegment");
	console.log("extracted acLines");
	let allBreakers = this.model.getObjects("cim:Breaker");
	console.log("extracted breakers");
	let allDisconnectors = this.model.getObjects("cim:Disconnector");
	console.log("extracted disconnectors");
	let allDiagramObjects = this.model.getObjects("cim:DiagramObject");
	console.log("extracted diagramObjects");
	if (diagram.length > 0) {
	    allDiagramObjects = allDiagramObjects.filter(el => el.getLinks().filter(el => el.localName === "DiagramObject.Diagram")[0].attributes[0].value === "#" + diagram[0].attributes[0].value);
	}
	let allDiagramObjectPoints = this.model.getObjects("cim:DiagramObjectPoint");
	console.log("extracted diagramObjectPoints");
	let allBusbarSections = this.model.getObjects("cim:BusbarSection");
	console.log("extracted busbarSections");
	// Build graph
	let edges = this.model.getGraph(allTerminals, "Terminal.ConnectivityNode");
	let ceEdges = this.model.getGraph(allTerminals, "Terminal.ConductingEquipment");
	let ioEdges = this.model.getGraph(allDiagramObjects, "DiagramObject.IdentifiedObject");
	let doEdges = this.model.getGraph(allDiagramObjectPoints, "DiagramObjectPoint.DiagramObject");
	console.log(ioEdges[0]);
	console.log(doEdges[0]);

	for (i in allTerminals) {
	    if (typeof(allTerminals[i].x) != "undefined") {
		// reset all terminals
		delete allTerminals[i].x;
		delete allTerminals[i].y;
	    }
	}
	
	if (diagram.length > 0) {
	    let graphicObjects = ioEdges.map(el => el.source);
	    allACLines = allACLines.filter(acl => graphicObjects.indexOf(acl) > -1);
	    allBreakers = allBreakers.filter(breaker => graphicObjects.indexOf(breaker) > -1);
	    allDisconnectors = allDisconnectors.filter(disc => graphicObjects.indexOf(disc) > -1);
	    ceEdges = ceEdges.filter(el => graphicObjects.indexOf(el.source) > -1);
	}
	
	let nodes = allTerminals
	    .concat(allConnectivityNodes)
	    .concat(allACLines)
	    .concat(allBreakers)
	    .concat(allDisconnectors);
	
	// AC Lines
	let aclineEnter = this.drawACLines(allACLines, ioEdges, doEdges);
	console.log("drawn acLines");
	// breakers
	let breakerEnter = this.drawBreakers(allBreakers, ioEdges, doEdges);
	console.log("drawn breakers");
	// disconnectors
	let discEnter = this.drawDisconnectors(allDisconnectors, ioEdges, doEdges);
	console.log("drawn disconnectors");
	// Connectivity Nodes
	let cnEnter = this.drawConnectivityNodes(allConnectivityNodes, edges, ceEdges, ioEdges, doEdges);
	console.log("drawn connectivity nodes");
	// ac line terminals
	this.createTwoTerminals(aclineEnter, edges, ceEdges);
	console.log("drawn acline terminals");
	// breaker terminals
	this.createTwoTerminals(breakerEnter, edges, ceEdges);
	console.log("drawn breaker terminals");
	// disconnector terminals
	this.createTwoTerminals(discEnter, edges, ceEdges);
	console.log("drawn disconnector terminals");
	tickFunction = forceTick(edges);
	zoomFunction = zooming(edges);
	force = force
	    .nodes(nodes)
	    .links(edges)
	    .on("tick", tickFunction);

	disableForce();
	disableZoom();
	enableDrag();
	tickFunction();
	// setup xy axes
	let xScale = d3.scale.linear().domain([0, 1800]).range([0,1800]);
	let yScale = d3.scale.linear().domain([0, 800]).range([0,800]);
	let yAxis = d3.svg.axis().scale(yScale).orient("right");
	let xAxis = d3.svg.axis().scale(xScale).orient("bottom");
	d3.select("svg").append("g").attr("id", "yAxisG").call(yAxis);
	d3.select("svg").append("g").attr("id", "xAxisG").call(xAxis);

	// click test
	/*aclineEnter.on("click", function(d) {
	  console.log("You clicked: ", d);
	  });*/
	// tooltip test
	aclineEnter.attr("title", function(d) {
	    let attributes = d.getAttributes();
	    let tooltip = "";
	    for (i in attributes) {
		tooltip = tooltip + attributes[i].localName + ": " + attributes[i].textContent + "\n";
	    }
	    return tooltip;
	});
	cnEnter.attr("title", function(d) {
	    let attributes = d.getAttributes();
	    let tooltip = "";
	    for (i in attributes) {
		tooltip = tooltip + attributes[i].localName + ": " + attributes[i].textContent + "\n";
	    }
	    return tooltip;
	});
	// add element test
	/*newElement = data.createElement("cim:Breaker");
	  data.children[0].appendChild(newElement); 
	  // serialize test
	  var oSerializer = new XMLSerializer();
	  var sXML = oSerializer.serializeToString(data);
	  console.log(sXML);*/
	// spreadsheet test
	if (allACLines.length > 0) {
	    d3.selectAll("g.ACLineSegment")
		.on("mouseover.hover", this.hover)
		.on("mouseout", this.mouseOut);
	    d3.selectAll("li.ACLineSegment")
	        .on("click.moveTo", this.moveTo(edges));
	}
    },

    // bind data to an x,y array from Diagram Object Points
    createSelection: function(type, data, ioEdges, doEdges) {
	let types = type + "s";
	d3.select("svg").select("g").append("g")
            .attr("class", types);
	
	let selection = d3.select("svg").select("g."+types).selectAll("g."+type)
	    .data(data, function(d) {
		let lineData = [];
		let dobjs = ioEdges.filter(el => el.source === d).map(el => el.target);
		let points = doEdges.filter(el => dobjs.indexOf(el.source) > -1).map(el => el.target);
		if (points.length > 0) {
		    d.x = parseInt(points[0].getAttributes().filter(el => el.localName === "DiagramObjectPoint.xPosition")[0].innerHTML);
		    d.y = parseInt(points[0].getAttributes().filter(el => el.localName === "DiagramObjectPoint.yPosition")[0].innerHTML);
		    for (point in points) {
			lineData.push({
			    x: parseInt(points[point].getAttributes().filter(el => el.localName === "DiagramObjectPoint.xPosition")[0].innerHTML) - d.x,
			    y: parseInt(points[point].getAttributes().filter(el => el.localName === "DiagramObjectPoint.yPosition")[0].innerHTML) - d.y,
			    seq: parseInt(points[point].getAttributes().filter(el => el.localName === "DiagramObjectPoint.sequenceNumber")[0].innerHTML)
			});
		    }
		    lineData.sort(function(a, b){return a.seq-b.seq});
		} else {
		    lineData.push({x:0, y:0, seq:1});
		    d.x = 0;
		    d.y = 0;
		}
		d.lineData = lineData;
		return d.attributes[0].value;
	    })
	    .enter()
	    .append("g")
	    .attr("class", type)
	    .attr("id", function(d) { return d.attributes[0].value;});

	return selection; 
    },

    // Draw all ACLineSegments
    drawACLines: function(allACLines, ioEdges, doEdges) {
	let line = d3.svg.line()
            .x(function(d) { return d.x; })
            .y(function(d) { return d.y; })
            .interpolate("linear");

	let aclineEnter = this.createSelection("ACLineSegment", allACLines, ioEdges, doEdges);
	
	aclineEnter.append("path")
            .attr("d", function(d) {
		if (this.parentNode.__data__.lineData.length === 1) {
		    this.parentNode.__data__.lineData.push({x:150, y:0, seq:2});
		}
		return line(this.parentNode.__data__.lineData);
	    })
	    .attr("fill", "none")
	    .attr("stroke", "darkred")
	    .attr("stroke-width", 2);
	aclineEnter.append("text")
	    .style("text-anchor", "middle")
	    .attr("x", function(d) {
		let lineData = this.parentNode.__data__.lineData;
		let end = lineData[lineData.length-1];
		return end.x/2;
	    })
	    .attr("y", function(d) {
		let lineData = this.parentNode.__data__.lineData;
		let end = lineData[lineData.length-1];
		return end.y/2;
	    })
	    .text(function(d) {
		return d.getAttributes().filter(el => el.localName === "IdentifiedObject.name")[0].innerHTML;
	    });
	return aclineEnter;
    },

    // Draw all Breakers
    drawBreakers: function(allBreakers, ioEdges, doEdges) {
	let line = d3.svg.line()
            .x(function(d) { return d.x; })
            .y(function(d) { return d.y; })
            .interpolate("linear");

	let breakerEnter = this.createSelection("Breaker", allBreakers, ioEdges, doEdges);
	
	breakerEnter.append("path")
            .attr("d", function(d) {
		return line([{x: 0, y:0, seq:1}, {x:30, y:0, seq:2}]);
	    })
	    .attr("fill", "none")
	    .attr("stroke", "green")
	    .attr("stroke-width", 4);
	breakerEnter.append("text")
	    .style("text-anchor", "middle")
	    .attr("x", function(d) {
		let lineData = this.parentNode.__data__.lineData;
		let end = lineData[lineData.length-1];
		return end.x/2;
	    })
	    .attr("y", function(d) {
		let lineData = this.parentNode.__data__.lineData;
		let end = lineData[lineData.length-1];
		return end.y/2;
	    })
	    .text(function(d) {
		return d.getAttributes().filter(el => el.localName === "IdentifiedObject.name")[0].innerHTML;
	    });
	return breakerEnter;
    },

    // Draw all Disconnectors
    drawDisconnectors: function(allDisconnectors, ioEdges, doEdges) {
	let line = d3.svg.line()
            .x(function(d) { return d.x; })
            .y(function(d) { return d.y; })
            .interpolate("linear");

	let discEnter = this.createSelection("Disconnector", allDisconnectors, ioEdges, doEdges);
	
	discEnter.append("path")
            .attr("d", function(d) {
		return line([{x: 0, y:0, seq:1}, {x:24, y:18, seq:2}]);
	    })
	    .attr("fill", "none")
	    .attr("stroke", "blue")
	    .attr("stroke-width", 4);
	discEnter.append("text")
	    .style("text-anchor", "middle")
	    .attr("x", function(d) {
		let lineData = this.parentNode.__data__.lineData;
		let end = lineData[lineData.length-1];
		return end.x/2;
	    })
	    .attr("y", function(d) {
		let lineData = this.parentNode.__data__.lineData;
		let end = lineData[lineData.length-1];
		return end.y/2;
	    })
	    .text(function(d) {
		return d.getAttributes().filter(el => el.localName === "IdentifiedObject.name")[0].innerHTML;
	    });
	return discEnter;
    },

    createTwoTerminals: function(eqSelection, edges, ceEdges) {
	let termSelection = eqSelection.selectAll("g")
	    .data(function(d) {
		return ceEdges.filter(el => el.source === d).map(el => el.target);
	    })
	    .enter()
	    .append("g")
	    .attr("id", function(d, i) {
		let cn = edges
		    .filter(el => el.target === d)
		    .map(el => el.source)[0];
		
		let lineData = this.parentNode.__data__.lineData;
		let start = lineData[0];
		let end = lineData[lineData.length-1];
		let eqX = this.parentNode.__data__.x;
		let eqY = this.parentNode.__data__.y;
		if (typeof(cn) !== "undefined" && lineData.length > 1) {
		    let dist1 = Math.pow((eqX+start.x-cn.x), 2)+Math.pow((eqY+start.y-cn.y), 2);
		    let dist2 = Math.pow((eqX+end.x-cn.x), 2)+Math.pow((eqY+end.y-cn.y), 2);
		    if (dist2 < dist1) {
			d.x = eqX + end.x;
			d.y = eqY + end.y;
		    } else {
			d.x = eqX + start.x;
			d.y = eqY + start.y;
		    }
		    // be sure we don't put two terminals on the same side of the equipment
		    let terminals = d3.select(this.parentNode).selectAll("g").data();
		    if (terminals.length > 1) {
			let otherTerm = terminals.filter(term => term !== d)[0];
			if (otherTerm.x === d.x && otherTerm.y === d.y) {
			    if (d.x === eqX + end.x && d.y === eqY + end.y) {
				d.x = eqX + start.x;
				d.y = eqY + start.y;
			    } else {
				d.x = eqX + end.x;
				d.y = eqY + end.y;			
			    }
			}
		    }
		} else {
		    if (lineData.length === 1) {
			d.x = eqX + 30*i;
			d.y = eqY;
		    } else {
			d.x = eqX + start.x*(1-i)+end.x*i;
			d.y = eqY + start.y*(1-i)+end.y*i;
		    }
		}
		return d.attributes[0].value;
	    })
	    .attr("class", function(d) {
		return d.localName;
	    });
	termSelection.append("circle")
            .attr("r", 5)
            .style("fill","black")
	    .attr("cx", function(d, i) {	    
		return this.parentNode.__data__.x-this.parentNode.parentNode.__data__.x; 
	    })
	    .attr("cy", function(d, i) {
		return this.parentNode.__data__.y-this.parentNode.parentNode.__data__.y;
	    });
    },

    // Draw all ConnectivityNodes
    drawConnectivityNodes: function(allConnectivityNodes, edges, ceEdges, ioEdges, doEdges) {
	let line = d3.svg.line()
            .x(function(d) { return d.x; })
            .y(function(d) { return d.y; })
            .interpolate("linear");
	
	d3.select("svg").select("g").append("g")
            .attr("class", "ConnectivityNodes");
	let cnEnter = d3.select("svg").select("g.ConnectivityNodes").selectAll("g.ConnectivityNode")
	    .data(allConnectivityNodes, function (d) {
		d.ok = false;
		let lineData = [];
		let xcalc = 0;
		let ycalc = 0;
		let cnTerminals = edges
		    .filter(el => el.source === d)
		    .map(el => el.target);
		// let's try to get some equipment
		let equipments = ceEdges
	            .filter(el => cnTerminals.indexOf(el.target) > -1)
	            .map(el => el.source);
		// let's try to get a busbar section
		let busbarSection = equipments
		    .filter(el => el.localName === "BusbarSection")[0];
		
		let dobjs = ioEdges.filter(el => el.source === d).map(el => el.target);
		let positionCalculated = false;
		if (dobjs.length === 0) {
		    if (typeof(busbarSection) != "undefined") {
			positionCalculated = true;
			dobjs = ioEdges.filter(el => el.source === busbarSection).map(el => el.target);
		    } else if (equipments.length > 0) {
			positionCalculated = true;
			if (equipments.length === 1) {
			    xcalc = equipments[0].lineData[0].x + equipments[0].x;
			    ycalc = equipments[0].lineData[0].y + equipments[0].y;
			} else {
			    let x1 = equipments[0].x;
			    let y1 = equipments[0].y;
			    let x2 = equipments[1].x;
			    let y2 = equipments[1].y;
			    let start1 = equipments[0].lineData[0];
			    let end1 = equipments[0].lineData[equipments[0].lineData.length-1];
			    let start2 = equipments[1].lineData[0];
			    let end2 = equipments[1].lineData[equipments[1].lineData.length-1];

			    let start1x = start1.x + x1;
			    let start1y = start1.y + y1;
			    let end1x = end1.x + x1;
			    let end1y = end1.y + y1;
			    let start2x = start2.x + x2;
			    let start2y = start2.y + y2;
			    let end2x = end2.x + x2;
			    let end2y = end2.y + y2;

			    let d1 = ((start1x-start2x)*(start1x-start2x))+((start1y-start2y)*(start1y-start2y));
			    let d2 = ((start1x-end2x)*(start1x-end2x))+((start1y-end2y)*(start1y-end2y));
			    let d3 = ((end1x-start2x)*(end1x-start2x))+((end1y-start2y)*(end1y-start2y));
			    let d4 = ((end1x-end2x)*(end1x-end2x))+((end1y-end2y)*(end1y-end2y));

			    let min = Math.min(d1, d2, d3, d4);
			    if (min === d1) {
				xcalc = (start1x+start2x)/2;
				ycalc = (start1y+start2y)/2;
			    } else if (min === d2) {
				xcalc = (start1x+end2x)/2;
				ycalc = (start1y+end2y)/2;
			    } else if (min === d3) {
				xcalc = (end1x+start2x)/2;
				ycalc = (end1y+start2y)/2;
			    } else if (min === d4) {
				xcalc = (end1x+end2x)/2;
				ycalc = (end1y+end2y)/2;
			    }
			}
		    }
		}

		let points = doEdges.filter(el => dobjs.indexOf(el.source) > -1).map(el => el.target);
		if (points.length > 0) {
		    let startx = parseInt(points[0].getAttributes().filter(el => el.localName === "DiagramObjectPoint.xPosition")[0].innerHTML);
		    let endx = parseInt(points[points.length-1].getAttributes().filter(el => el.localName === "DiagramObjectPoint.xPosition")[0].innerHTML);
		    d.x = (startx+endx)/2;
		    let starty = parseInt(points[0].getAttributes().filter(el => el.localName === "DiagramObjectPoint.yPosition")[0].innerHTML);
		    let endy = parseInt(points[points.length-1].getAttributes().filter(el => el.localName === "DiagramObjectPoint.yPosition")[0].innerHTML);
		    d.y = (starty+endy)/2;
		    for (point in points) {
			let seqNum = points[point].getAttributes().filter(el => el.localName === "DiagramObjectPoint.sequenceNumber")[0];
			if (typeof(seqNum) === "undefined") {
			    seqNum = 0;
			} else {
			    seqNum = parseInt(seqNum.innerHTML);
			}
			lineData.push({
			    x: parseInt(points[point].getAttributes().filter(el => el.localName === "DiagramObjectPoint.xPosition")[0].innerHTML) - d.x,
			    y: parseInt(points[point].getAttributes().filter(el => el.localName === "DiagramObjectPoint.yPosition")[0].innerHTML) - d.y,
			    seq: seqNum
			});
		    }
		    lineData.sort(function(a, b){return a.seq-b.seq});
		    d.ok = true;
		} else if (positionCalculated) {
		    d.ok = true;
		    lineData.push({x:-5, y:-5, seq:1});
		    lineData.push({x:5, y:-5, seq:2});
		    lineData.push({x:5, y:5, seq:3});
		    lineData.push({x:-5, y:5, seq:4});
		    lineData.push({x:-5, y:-5, seq:5});
		    d.x = xcalc;
		    d.y = ycalc;
		}
		d.lineData = lineData;
		return d.attributes[0].value;
	    })/*.filter(function(d) {console.log(d); return d.ok === true;})*/
	    .enter()
	    .append("g")
	    .attr("class", "ConnectivityNode")
	    .attr("id", function(d) { return d.attributes[0].value;});

	cnEnter.append("path")
            .attr("d", function(d) {
		return line(this.parentNode.__data__.lineData);
	    })
	    .attr("stroke", "black")
	    .attr("stroke-width", 2);
	
	return cnEnter;
    },

    hover: function(hoverD) {
        d3.selectAll("li.ACLineSegment")
	    .filter(function (d) {return d == hoverD;})
	    .style("background", "#94B8FF");
	d3.selectAll("g.ACLineSegment")
	    .filter(function (d) {return d == hoverD;})
	    .style("stroke", "black")
	    .style("stroke-width", "2px");
    },

    moveTo: function(edges) {
	return function(hoverD) {
	    console.log("ciao");
	    let svgWidth = d3.select("svg").node().width.baseVal.value;
	    let svgHeight = d3.select("svg").node().height.baseVal.value;
	    let newZoom = zoomComp.scale();
	    let newx = -hoverD.x*newZoom + (svgWidth/2);
	    let newy = -hoverD.y*newZoom + (svgHeight/2);
	    d3.select("svg").select("g").attr("transform", "translate(" + [newx, newy] + ")scale(" + newZoom + ")");

	    let context = d3.select("canvas").node().getContext("2d");
	    context.save();
	    context.clearRect(0, 0, d3.select("canvas").node().width, d3.select("canvas").node().height);
	    context.translate(newx, newy);
	    context.scale(newZoom, newZoom);
	    edges.forEach(function (link) {
		context.beginPath();
		context.moveTo(link.source.x,link.source.y)
		context.lineTo(link.target.x,link.target.y)
		context.stroke();
	    });
	    context.restore();
	    // update zoomComp
	    xoffset = newx;
	    yoffset = newy;
	    zoomComp.translate([xoffset, yoffset]);
	    // update axes
	    let xScale = d3.scale.linear().domain([-newx/newZoom, (svgWidth-newx)/newZoom]).range([0,svgWidth]);
	    let yScale = d3.scale.linear().domain([-newy/newZoom, (svgHeight-newy)/newZoom]).range([0,svgHeight]);
	    let yAxis = d3.svg.axis().scale(yScale).orient("right");
	    let xAxis = d3.svg.axis().scale(xScale).orient("bottom");
	    d3.select("svg").selectAll("#yAxisG").call(yAxis);
	    d3.select("svg").selectAll("#xAxisG").call(xAxis);
	} 
    },

    mouseOut: function() {
	d3.selectAll("li.ACLineSegment").style("background", "white");
	d3.selectAll("g.ACLineSegment").style("stroke-width", "0px");
    }
};

    
function enableDrag() {
    let drag = d3.behavior.drag().origin(function(d) { return d; })
        .on("drag", function(d,i) {
	    d.x = d3.event.x;
	    d.px = d.x;
	    d.y = d3.event.y;
	    d.py = d.y;
	    tickFunction();
	});
    d3.select("g.ACLineSegments").selectAll("g.ACLineSegment").call(drag);
    d3.select("g.ConnectivityNodes").selectAll("g.ConnectivityNode").call(drag);
    d3.select("g.Breakers").selectAll("g.Breaker").call(drag);
    d3.select("g.Disconnectors").selectAll("g.Disconnector").call(drag);
}

function disableDrag() {
    let drag = d3.behavior.drag()
        .on("drag", null);
    d3.select("g.ACLineSegments").selectAll("g.ACLineSegment").call(drag);
    d3.select("g.ConnectivityNodes").selectAll("g.ConnectivityNode").call(drag);
    d3.select("g.Breakers").selectAll("g.Breaker").call(drag);
    d3.select("g.Disconnectors").selectAll("g.Disconnector").call(drag);
}

function enableForce() {
    d3.select("g.ConnectivityNodes").selectAll("g.ConnectivityNode").call(force.drag());
    d3.select("g.ACLineSegments").selectAll("g.ACLineSegment").call(force.drag());
    d3.select("g.Breakers").selectAll("g.Breaker").call(force.drag());
    d3.select("g.Disconnectors").selectAll("g.Disconnector").call(force.drag());
    d3.select("g.ConnectivityNodes").selectAll("g.ConnectivityNode").on("click", fixNode);
    d3.select("g.ACLineSegments").selectAll("g.ACLineSegment").on("click", fixNode);
    d3.select("g.Breakers").selectAll("g.Breaker").call(fixNode);
    d3.select("g.Disconnectors").selectAll("g.Disconnector").call(fixNode);
    
    function fixNode(d) {
	d.fixed = true;
    };
    force.start();
}

function disableForce() {
    force.stop();    
}

function enableZoom() {
    zoomComp = d3.behavior.zoom();
    zoomComp.on("zoom", zoomFunction);
    d3.select("svg").call(zoomComp);
    zoomComp.translate([xoffset, yoffset]);
    zoomComp.scale(svgZoom);
    zoomEnabled = true;
}

function disableZoom() {
    if (zoomEnabled===true) {
	zoomComp.on("zoom", null);
	d3.select("svg").select("g").call(zoomComp);
	xoffset = zoomComp.translate()[0];
	yoffset = zoomComp.translate()[1];
	svgZoom = zoomComp.scale();
	tickFunction();
	zoomEnabled = false;
    }
}

function zooming(edges) {
    return function() {
	let newx = zoomComp.translate()[0];
	let newy = zoomComp.translate()[1];
	let newZoom = zoomComp.scale();
	let svgWidth = d3.select("svg").node().width.baseVal.value;
	let svgHeight = d3.select("svg").node().height.baseVal.value;

	// manage axes
	let xScale = d3.scale.linear().domain([-newx/newZoom, (svgWidth-newx)/newZoom]).range([0,svgWidth]);
	let yScale = d3.scale.linear().domain([-newy/newZoom, (svgHeight-newy)/newZoom]).range([0,svgHeight]);
	let yAxis = d3.svg.axis().scale(yScale).orient("right");
	let xAxis = d3.svg.axis().scale(xScale).orient("bottom");
	d3.select("svg").selectAll("#yAxisG").call(yAxis);
	d3.select("svg").selectAll("#xAxisG").call(xAxis);
	
	d3.select("svg").select("g").attr("transform", "translate(" + [newx, newy] + ")scale(" + newZoom + ")");
	
	let context = d3.select("canvas").node().getContext("2d");
	context.save();
	context.clearRect(0, 0, d3.select("canvas").node().width, d3.select("canvas").node().height);
	context.translate(newx, newy);
	context.scale(newZoom, newZoom);
	edges.forEach(function (link) {
	    context.beginPath();
	    context.moveTo(link.source.x,link.source.y)
	    context.lineTo(link.target.x,link.target.y)
	    context.stroke();
	});
	context.restore();
    }
}

function forceTick(edges) {
    return function() {
	let cnEnter = d3.select("g.ConnectivityNodes").selectAll("g.ConnectivityNode")
	    .attr("transform", function (d) {
		return "translate("+d.x+","+d.y+")";
	    });
	// get status from Webdis
	/*cnEnter.data().forEach(function(d, index, array) {
	    let cnName = d.getAttribute("cim:IdentifiedObject.name").textContent;
	    d3.json("http://127.0.0.1:7379/GET/" + cnName + "_breaker_status")
		.get(function(error, data) {
		    let ret = "green";
		    if (data !== null) {
			if (data.GET === "1") {
			    ret = "red";
			}
		    }
		    cnEnter.filter(function (cnD) {return d == cnD;})
			.attr("fill", function(d) {
			    return ret;
			});
		});
	});*/

	
	d3.select("g.ACLineSegments").selectAll("g.ACLineSegment")
	    .attr("transform", function (d) {
		return "translate("+d.x+","+d.y+")";
	    })
	    .selectAll("g")
	    .attr("id", function(d, i) {
		d.x = this.parentNode.__data__.x + parseInt(d3.select(this.firstChild).attr("cx"));
		d.y = this.parentNode.__data__.y + parseInt(d3.select(this.firstChild).attr("cy"));
		return d.attributes[0].value;
	    });
	d3.select("g.Breakers").selectAll("g.Breaker")
	    .attr("transform", function (d) {
		return "translate("+d.x+","+d.y+")";
	    })
	    .selectAll("g")
	    .attr("id", function(d, i) {
		d.x = this.parentNode.__data__.x + parseInt(d3.select(this.firstChild).attr("cx"));
		d.y = this.parentNode.__data__.y + parseInt(d3.select(this.firstChild).attr("cy"));
		return d.attributes[0].value;
	    });
	d3.select("g.Disconnectors").selectAll("g.Disconnector")
	    .attr("transform", function (d) {
		return "translate("+d.x+","+d.y+")";
	    })
	    .selectAll("g")
	    .attr("id", function(d, i) {
		d.x = this.parentNode.__data__.x + parseInt(d3.select(this.firstChild).attr("cx"));
		d.y = this.parentNode.__data__.y + parseInt(d3.select(this.firstChild).attr("cy"));
		return d.attributes[0].value;
	    });
	let context = d3.select("canvas").node().getContext("2d");
	context.clearRect(0, 0, d3.select("canvas").node().width, d3.select("canvas").node().height);
	context.lineWidth = 1;
	context.strokeStyle = "rgba(0, 0, 0, 0.5)";
	edges.forEach(function (link) {
	    context.beginPath();
	    context.moveTo((link.source.x*svgZoom)+xoffset,(link.source.y*svgZoom)+yoffset)
	    context.lineTo((link.target.x*svgZoom)+xoffset,(link.target.y*svgZoom)+yoffset)
	    context.stroke();
	});
    }
};

