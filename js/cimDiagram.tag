<cimDiagram>
    <div class="app-diagram">
	<canvas height="800" width="1800"></canvas>
	<svg>
	    <g></g>
	</svg>
    </div>

    <script>
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
     let subRoute = riot.route.create();
     let self = this;
     
     subRoute("/diagrams/*", function(name) {
	 self.render(name);
     });

     subRoute("/diagrams/*/*", function(name, element) {
	 self.moveTo(element);
     });

     this.model = opts.model;
     this.edges = [];
     
     render(diagramName) {
	 // clear all
	 d3.select("svg").select("g").selectAll("g").remove();
	 d3.select("svg").selectAll("#yAxisG").remove();
	 d3.select("svg").selectAll("#xAxisG").remove();

	 this.model.selectDiagram(decodeURI(diagramName));
	 let allTerminals = this.model.getObjects("cim:Terminal");
	 console.log("extracted terminals");
	 let allConnectivityNodes = this.model.getConnectivityNodes();
	 console.log("extracted connectivity nodes");
	 let allACLines = this.model.getConductingEquipments("cim:ACLineSegment");
	 console.log("extracted acLines");
	 let allBreakers = this.model.getConductingEquipments("cim:Breaker");
	 console.log("extracted breakers");
	 let allDisconnectors = this.model.getConductingEquipments("cim:Disconnector");
	 console.log("extracted disconnectors");
	 let allEnergySources = this.model.getConductingEquipments("cim:EnergySource");
	 console.log("extracted energy sources");
	 let allEnergyConsumers = this.model.getConductingEquipments("cim:EnergyConsumer")
				      .concat(this.model.getConductingEquipments("cim:ConformLoad"))
				      .concat(this.model.getConductingEquipments("cim:NonConformLoad"));
	 console.log("extracted energy consumers");
	 let allBusbarSections = this.model.getConductingEquipments("cim:BusbarSection");
	 console.log("extracted busbarSections");

	 // reset all terminals
	 for (let i in allTerminals) {
	     if (typeof(allTerminals[i].x) != "undefined") {
		 delete allTerminals[i].x;
		 delete allTerminals[i].y;
	     }
	 }
	 
	 // AC Lines
	 let aclineEnter = this.drawACLines(allACLines);
	 console.log("drawn acLines");
	 // breakers
	 let breakerEnter = this.drawBreakers(allBreakers);
	 console.log("drawn breakers");
	 // disconnectors
	 let discEnter = this.drawDisconnectors(allDisconnectors);
	 console.log("drawn disconnectors");
	 // energy sources
	 let ensrcEnter = this.drawEnergySources(allEnergySources);
	 console.log("drawn energy sources");
	 // energy consumers
	 let enconsEnter = this.drawEnergyConsumers(allEnergyConsumers);
	 console.log("drawn energy consumers");
	 // connectivity nodes
	 let cnEnter = this.drawConnectivityNodes(allConnectivityNodes);
	 console.log("drawn connectivity nodes");
	 let edges = this.model.getGraph(allConnectivityNodes, "ConnectivityNode.Terminals", "Terminal.ConnectivityNode", true);

	 // ac line terminals
	 this.createTwoTerminals(aclineEnter, edges);
	 console.log("drawn acline terminals");
	 // breaker terminals
	 this.createTwoTerminals(breakerEnter, edges);
	 console.log("drawn breaker terminals");
	 // disconnector terminals
	 this.createTwoTerminals(discEnter, edges);
	 console.log("drawn disconnector terminals");
	 // energy source terminals
	 this.createTwoTerminals(ensrcEnter, edges);
	 console.log("drawn energy source terminals");
	 // energy consumer terminals
	 this.createTwoTerminals(enconsEnter, edges);
	 console.log("drawn energy consumer terminals");

	 let nodes = allConnectivityNodes
		.concat(allACLines)
		.concat(allBreakers)
		.concat(allDisconnectors)
		.concat(allEnergySources)
		.concat(allEnergyConsumers);
	 tickFunction = this.forceTick(edges);
	 zoomFunction = this.zooming(edges);
	 force = force
		.nodes(nodes)
		.links(edges)
		.on("tick", tickFunction);
	 let self = this;
	 console.log("Routing links...");
	 this.edges.forEach(function (link) {
	     link.p = self.closestPoint(link.source, link.target);
	 });
	 // setup diagram buttons
	 this.disableForce();
	 this.disableZoom();
	 this.enableDrag();
	 let controller = this;
	 $("#select").change(function() {
	     controller.disableForce();
	     controller.disableZoom();
	     controller.enableDrag();
	 });
	 $("#force").change(function() {
	     controller.disableZoom();
	     controller.disableDrag();
	     controller.enableForce();
	 });
	 $("#pan").change(function() {
	     controller.disableForce();
	     controller.disableDrag();
	     controller.enableZoom();
	 });
	 tickFunction();
	 // setup xy axes
	 let xScale = d3.scale.linear().domain([0, 1800]).range([0,1800]);
	 let yScale = d3.scale.linear().domain([0, 800]).range([0,800]);
	 let yAxis = d3.svg.axis().scale(yScale).orient("right");
	 let xAxis = d3.svg.axis().scale(xScale).orient("bottom");
	 d3.select("svg").append("g").attr("id", "yAxisG").call(yAxis);
	 d3.select("svg").append("g").attr("id", "xAxisG").call(xAxis);
	 // add tooltips 
	 aclineEnter.attr("title", function(d) {
	     let attributes = d.getAttributes();
	     let tooltip = "";
	     for (let i in attributes) {
		 tooltip = tooltip + attributes[i].localName + ": " + attributes[i].textContent + "\n";
	     }
	     return tooltip;
	 });
	 cnEnter.attr("title", function(d) {
	     let attributes = d.getAttributes();
	     let tooltip = "";
	     for (let i in attributes) {
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
	 // handle mouseover
	 d3.selectAll("g.ACLineSegment")
			    .on("mouseover.hover", this.hover)
			    .on("mouseout", this.mouseOut);
     }

     // bind data to an x,y array from Diagram Object Points
     createSelection(type, data) {
	 let types = type + "s";
	 d3.select("svg").select("g").append("g")
	   .attr("class", types);

	 let self = this;
	 let selection = d3.select("svg").select("g."+types).selectAll("g."+type)
			   .data(data, function(d) {
			       let lineData = [];
			       let dobjs = self.model.getDiagramObjectGraph([d]).map(el => el.target);
			       let points = self.model.getGraph(dobjs, "DiagramObject.DiagramObjectPoints", "DiagramObjectPoint.DiagramObject").map(el => el.source);
			       if (points.length > 0) {
				   d.x = parseInt(points[0].getAttributes().filter(el => el.localName === "DiagramObjectPoint.xPosition")[0].innerHTML);
				   d.y = parseInt(points[0].getAttributes().filter(el => el.localName === "DiagramObjectPoint.yPosition")[0].innerHTML);
				   for (let point in points) {
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
     }

     // Draw all ACLineSegments
     drawACLines(allACLines) {
	 let line = d3.svg.line()
		      .x(function(d) { return d.x; })
		      .y(function(d) { return d.y; })
		      .interpolate("linear");

	 let aclineEnter = this.createSelection("ACLineSegment", allACLines);
	 
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
     }

     // Draw all Breakers
     drawBreakers(allBreakers) {
	 let line = d3.svg.line()
		      .x(function(d) { return d.x; })
		      .y(function(d) { return d.y; })
		      .interpolate("linear");

	 let breakerEnter = this.createSelection("Breaker", allBreakers);
	 
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
     }

     // Draw all Disconnectors
     drawDisconnectors(allDisconnectors) {
	 let line = d3.svg.line()
		      .x(function(d) { return d.x; })
		      .y(function(d) { return d.y; })
		      .interpolate("linear");

	 let discEnter = this.createSelection("Disconnector", allDisconnectors);
	 
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
     }

     // Draw all EnergySources
     drawEnergySources(allEnergySources) {
	 let ensrcEnter = this.createSelection("EnergySource", allEnergySources);
	 
	 ensrcEnter.append("circle")
		   .attr("r", 25)
		   .attr("cx", 0) 
		   .attr("cy", 0)
		   .attr("fill", "white")
		   .attr("stroke", "blue")
		   .attr("stroke-width", 4);
	 ensrcEnter.append("text")
		   .style("text-anchor", "middle")
		   .attr("x", 0)
		   .attr("y", 0)
		   .text(function(d) {
		       return d.getAttributes().filter(el => el.localName === "IdentifiedObject.name")[0].innerHTML;
		   });
	 return ensrcEnter;
     }

     // Draw all EnergyConsumers
     drawEnergyConsumers(allEnergyConsumers) {
	 let enconsEnter = this.createSelection("EnergyConsumer", allEnergyConsumers);
	 
	 enconsEnter.append("circle")
		    .attr("r", 25)
		    .attr("cx", 0)
		    .attr("cy", 0) 
		    .attr("fill", "white")
		    .attr("stroke", "green")
		    .attr("stroke-width", 4);
	 enconsEnter.append("text")
		    .style("text-anchor", "middle")
		    .attr("x", 0) 
		    .attr("y", 0)
		    .text(function(d) {
			return d.getAttributes().filter(el => el.localName === "IdentifiedObject.name")[0].innerHTML;
		    });
	 return enconsEnter;
     }

     createTwoTerminals(eqSelection, edges) {
	 let ceEdges = this.model.getConductingEquipmentGraph();
	 let termSelection = eqSelection.selectAll("g")
					.data(function(d) {
					    return ceEdges.filter(el => el.source === d).map(el => el.target);
					})
					.enter()
					.append("g")
					.attr("id", function(d, i) {
					    let cn = edges.filter(el => el.target === d).map(el => el.source)[0];

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
     }

     /*filterConnectivityNodes(allConnectivityNodes) { 
	let self = this;
	return allConnectivityNodes.filter(function(d) {
	let edges = self.model.getGraph([d], "ConnectivityNode.Terminals", "Terminal.ConnectivityNode", true);
	let cnTerminals = edges.map(el => el.target);
	// let's try to get some equipment
	let equipments = self.model.getGraph(cnTerminals, "Terminal.ConductingEquipment", "ConductingEquipment.Terminals").map(el => el.source);
	equipments = self.model.getConductingEquipmentGraph(equipments).map(el => el.source);
	// let's try to get a busbar section
	let dobjs = self.model.getDiagramObjectGraph([d]).map(el => el.target); 
	let positionCalculated = false;
	if (dobjs.length === 0) {
	if (equipments.length > 0) {
	positionCalculated = true;
	}
	}
	let points = self.model.getGraph(dobjs, "DiagramObject.DiagramObjectPoints", "DiagramObjectPoint.DiagramObject").map(el => el.source);
	return ((points.length > 0) || (positionCalculated === true));
	});
	}*/

     // Draw all ConnectivityNodes
     drawConnectivityNodes(allConnectivityNodes) {
	 let line = d3.svg.line()
		      .x(function(d) { return d.x; })
		      .y(function(d) { return d.y; })
		      .interpolate("linear");
	 let self = this;
	 d3.select("svg").select("g").append("g")
	   .attr("class", "ConnectivityNodes");
	 let cnEnter = d3.select("svg").select("g.ConnectivityNodes").selectAll("g.ConnectivityNode")
			 .data(allConnectivityNodes, function (d) {
			     let lineData = [];
			     let xcalc = 0;
			     let ycalc = 0;
			     let edges = self.model.getGraph([d], "ConnectivityNode.Terminals", "Terminal.ConnectivityNode", true);
			     let cnTerminals = edges.map(el => el.target);
			     // let's try to get some equipment
			     let equipments = self.model.getGraph(cnTerminals, "Terminal.ConductingEquipment", "ConductingEquipment.Terminals").map(el => el.source);
			     equipments = self.model.getConductingEquipmentGraph(equipments).map(el => el.source);
			     // let's try to get a busbar section
			     let busbarSection = equipments
			.filter(el => el.localName === "BusbarSection")[0];
			     let dobjs = self.model.getDiagramObjectGraph([d]).map(el => el.target); 
			     if (dobjs.length === 0) {
				 if (typeof(busbarSection) != "undefined") {
				     dobjs = self.model.getDiagramObjectGraph([busbarSection]).map(el => el.target);
				 } else if (equipments.length > 0) {
				     if (equipments.length === 1) {
					 if (typeof(equipments[0].x) === "undefined") { 
					 } else {
					     xcalc = equipments[0].lineData[0].x + equipments[0].x;
					     ycalc = equipments[0].lineData[0].y + equipments[0].y;
					 }
				     } else {
					 if (typeof(equipments[0].x) === "undefined" || typeof(equipments[1].x) === "undefined") {
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
			     }
			     let points = self.model.getGraph(dobjs, "DiagramObject.DiagramObjectPoints", "DiagramObjectPoint.DiagramObject").map(el => el.source); 
			     if (points.length > 0) {
				 let startx = parseInt(points[0].getAttributes().filter(el => el.localName === "DiagramObjectPoint.xPosition")[0].innerHTML);
				 let endx = parseInt(points[points.length-1].getAttributes().filter(el => el.localName === "DiagramObjectPoint.xPosition")[0].innerHTML);
				 d.x = (startx+endx)/2;
				 let starty = parseInt(points[0].getAttributes().filter(el => el.localName === "DiagramObjectPoint.yPosition")[0].innerHTML);
				 let endy = parseInt(points[points.length-1].getAttributes().filter(el => el.localName === "DiagramObjectPoint.yPosition")[0].innerHTML);
				 d.y = (starty+endy)/2;
				 for (let point in points) {
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
			     } else {
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
			 })
			 .enter()
			 .append("g")
			 .attr("class", "ConnectivityNode")
			 .attr("id", function(d) {return d.attributes[0].value;});

	 cnEnter.append("path")
		.attr("d", function(d) {
		    let edges = self.model.getGraph([d], "ConnectivityNode.Terminals", "Terminal.ConnectivityNode", true);
		    let cnTerminals = edges.map(el => el.target);
		    for (let i in cnTerminals) {
			self.edges.push({source: this.parentNode, target: cnTerminals[i]});
		    }
		    return line(this.parentNode.__data__.lineData);
		})
		.attr("stroke", "black")
		.attr("stroke-width", 2);
	 
	 return cnEnter;
     }

     hover(hoverD) {
	 d3.selectAll("g.ACLineSegment")
	   .filter(function (d) {return d === hoverD;})
	   .style("stroke", "black")
	   .style("stroke-width", "2px");
     }

     moveTo(uuid) {
	 let hoverD = this.model.getObject(uuid);
	 if (typeof(hoverD.x) === "undefined" || typeof(hoverD.y) === "undefined") {
	     return;
	 }
	 let allTerminals = this.model.getObjects("cim:Terminal");
	 let edges = this.model.getGraph(allTerminals, "Terminal.ConnectivityNode", "ConnectivityNode.Terminals");
	 let svgWidth = parseInt(d3.select("svg").style("width"));
	 let svgHeight = parseInt(d3.select("svg").style("height"));
	 let newZoom = zoomComp.scale();
	 let newx = -hoverD.x*newZoom + (svgWidth/2);
	 let newy = -hoverD.y*newZoom + (svgHeight/2);
	 d3.selectAll("svg").select("g").attr("transform", "translate(" + [newx, newy] + ")scale(" + newZoom + ")");

	 let context = d3.selectAll("canvas").node().getContext("2d");
	 context.save();
	 context.clearRect(0, 0, svgWidth, svgHeight);
	 context.translate(newx, newy);
	 context.scale(newZoom, newZoom);
	 edges.forEach(function (link) {
	     context.beginPath();
	     context.moveTo(link.source.x,link.source.y);
	     context.lineTo(link.target.x,link.target.y);
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
	 d3.selectAll("svg").selectAll("#yAxisG").call(yAxis);
	 d3.selectAll("svg").selectAll("#xAxisG").call(xAxis);
     }

     mouseOut() {
	 d3.selectAll("li.ACLineSegment").style("background", "white");
	 d3.selectAll("g.ACLineSegment").style("stroke-width", "0px");
     }

     enableDrag() {
	 let model = this.model;
	 let drag = d3.behavior.drag().origin(function(d) { return d; })
		      .on("drag", function(d,i) {
			  d.x = d3.event.x;
			  d.px = d.x;
			  d.y = d3.event.y;
			  d.py = d.y;

			  let elem = d3.select(this);
			  if (elem.datum().nodeName === "cim:ConnectivityNode") {
			      
			  } else {

			  }

			  // just for test...very slow!!
			  let ioEdges = model.getDiagramObjectGraph(); 
			  let doEdges = model.getDiagramObjectPointGraph(); 
			  let dobjs = ioEdges.filter(el => el.source === d).map(el => el.target);
			  let points = doEdges.filter(el => dobjs.indexOf(el.source) > -1).map(el => el.target);
			  if (points.length > 0) {
			      for (let point in points) {
				  let seq = parseInt(points[point].getAttributes().filter(el => el.localName === "DiagramObjectPoint.sequenceNumber")[0].innerHTML);
				  let actLineData = d.lineData.filter(el => el.seq === seq)[0];
				  points[point].getAttributes().filter(el => el.localName === "DiagramObjectPoint.xPosition")[0].innerHTML = actLineData.x + d.x;
				  points[point].getAttributes().filter(el => el.localName === "DiagramObjectPoint.yPosition")[0].innerHTML = actLineData.y + d.y;
			      }
			  }
			  
			  tickFunction();
		      });
	 d3.select("g.ACLineSegments").selectAll("g.ACLineSegment").call(drag);
	 d3.select("g.ConnectivityNodes").selectAll("g.ConnectivityNode").call(drag);
	 d3.select("g.Breakers").selectAll("g.Breaker").call(drag);
	 d3.select("g.Disconnectors").selectAll("g.Disconnector").call(drag);
	 d3.select("g.EnergySources").selectAll("g.EnergySource").call(drag);
	 d3.select("g.EnergyConsumers").selectAll("g.EnergyConsumer").call(drag);
     }

     disableDrag() {
	 let drag = d3.behavior.drag()
		      .on("drag", null);
	 d3.select("g.ACLineSegments").selectAll("g.ACLineSegment").call(drag);
	 d3.select("g.ConnectivityNodes").selectAll("g.ConnectivityNode").call(drag);
	 d3.select("g.Breakers").selectAll("g.Breaker").call(drag);
	 d3.select("g.Disconnectors").selectAll("g.Disconnector").call(drag);
	 d3.select("g.EnergySources").selectAll("g.EnergySource").call(drag);
	 d3.select("g.EnergyConsumers").selectAll("g.EnergyConsumer").call(drag);
     }

     enableForce() {
	 d3.select("g.ConnectivityNodes").selectAll("g.ConnectivityNode").call(force.drag());
	 d3.select("g.ACLineSegments").selectAll("g.ACLineSegment").call(force.drag());
	 d3.select("g.Breakers").selectAll("g.Breaker").call(force.drag());
	 d3.select("g.Disconnectors").selectAll("g.Disconnector").call(force.drag());
	 d3.select("g.EnergySources").selectAll("g.EnergySource").call(force.drag());
	 d3.select("g.EnergyConsumers").selectAll("g.EnergyConsumer").call(force.drag());

	 d3.select("g.ConnectivityNodes").selectAll("g.ConnectivityNode").on("click", fixNode);
	 d3.select("g.ACLineSegments").selectAll("g.ACLineSegment").on("click", fixNode);
	 d3.select("g.Breakers").selectAll("g.Breaker").call(fixNode);
	 d3.select("g.Disconnectors").selectAll("g.Disconnector").call(fixNode);
	 d3.select("g.EnergySources").selectAll("g.EnergySource").call(fixNode);
	 d3.select("g.EnergyConsumers").selectAll("g.EnergyConsumer").call(fixNode);
	 
	 function fixNode(d) {
	     d.fixed = true;
	 };
	 force.start();
     }

     disableForce() {
	 force.stop();    
     }
     
     enableZoom() {
	 zoomComp = d3.behavior.zoom();
	 zoomComp.on("zoom", zoomFunction);
	 d3.select("svg").call(zoomComp);
	 zoomComp.translate([xoffset, yoffset]);
	 zoomComp.scale(svgZoom);
	 zoomEnabled = true;
     }

     disableZoom() {
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

     zooming(edges) {
	 let self = this;
	 return function() {
	     let newx = zoomComp.translate()[0];
	     let newy = zoomComp.translate()[1];
	     let newZoom = zoomComp.scale();
	     let svgWidth = parseInt(d3.select("svg").style("width"));
	     let svgHeight = parseInt(d3.select("svg").style("height"));
	     
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
	     context.clearRect(0, 0, svgWidth, svgHeight);
	     context.translate(newx, newy);
	     context.scale(newZoom, newZoom);
	     self.edges.forEach(function (link) {
		 context.beginPath();
		 context.moveTo(link.p[0] + d3.select(link.source).datum().x, link.p[1] + d3.select(link.source).datum().y);
		 context.lineTo(link.target.x,link.target.y);
		 context.stroke();
	     });
	     context.restore();
	 }
     }

     forceTick(edges) {
	 let self = this;
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
	     d3.select("g.EnergySources").selectAll("g.EnergySource")
	       .attr("transform", function (d) {
		   return "translate("+d.x+","+d.y+")";
	       })
	       .selectAll("g")
	       .attr("id", function(d, i) {
		   d.x = this.parentNode.__data__.x + parseInt(d3.select(this.firstChild).attr("cx"));
		   d.y = this.parentNode.__data__.y + parseInt(d3.select(this.firstChild).attr("cy"));
		   return d.attributes[0].value;
	       });
	     d3.select("g.EnergyConsumers").selectAll("g.EnergyConsumer")
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
	     context.clearRect(0, 0, parseInt(d3.select("svg").style("width")), parseInt(d3.select("svg").style("height")));
	     context.lineWidth = 1;
	     self.edges.forEach(function (link) {
		 context.beginPath();
		 context.moveTo(((link.p[0] + d3.select(link.source).datum().x)*svgZoom)+xoffset, ((link.p[1] + d3.select(link.source).datum().y)*svgZoom)+yoffset);
		 context.lineTo((link.target.x*svgZoom)+xoffset, (link.target.y*svgZoom)+yoffset);
		 context.stroke();
	     });
	     context.restore();
	 }
     }

     closestPoint(source, point) {
	 let pathNode = d3.select(source).select("path").node();
	 if (pathNode === null) {
	     return [0, 0];
	 }
	 let pathLength = pathNode.getTotalLength(),
	     precision = pathLength / pathNode.pathSegList.numberOfItems * .125,
	     best,
	     bestLength,
	     bestDistance = Infinity;

	 if (pathLength === 0) {
	     return [0, 0];
	 }
	 
	 if (typeof(point.x) === "undefined" || typeof(point.y) === "undefined") {
	     return [0, 0];
	 }
	 
	 // linear scan for coarse approximation
	 for (var scan, scanLength = 0, scanDistance; scanLength <= pathLength; scanLength += precision) {
	     if ((scanDistance = distance2(scan = pathNode.getPointAtLength(scanLength))) < bestDistance) {
		 best = scan, bestLength = scanLength, bestDistance = scanDistance;
	     }
	 }

	 // binary search for precise estimate
	 /*precision *= .5;
	    while (precision > .5) {
	    var before,
	    after,
	    beforeLength,
	    afterLength,
	    beforeDistance,
	    afterDistance;
	    if ((beforeLength = bestLength - precision) >= 0 && (beforeDistance = distance2(before = pathNode.getPointAtLength(beforeLength))) < bestDistance) {
	    best = before, bestLength = beforeLength, bestDistance = beforeDistance;
	    } else if ((afterLength = bestLength + precision) <= pathLength && (afterDistance = distance2(after = pathNode.getPointAtLength(afterLength))) < bestDistance) {
	    best = after, bestLength = afterLength, bestDistance = afterDistance;
	    } else {
	    precision *= .5;
	    }
	    }*/

	 best = [best.x, best.y];
	 return best;

	 function distance2(p) {
	     var dx = p.x + d3.select(source).datum().x - point.x, 
		 dy = p.y + d3.select(source).datum().y - point.y; 
	     return dx * dx + dy * dy;
	 }
     }

    </script>

</cimDiagram>

