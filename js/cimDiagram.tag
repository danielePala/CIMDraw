<cimDiagram>
    <div class="container-fluid">
	<div class="row center-block">
	    <div class="col-md-12">		
		<div class="btn-group" data-toggle="buttons" id="cim-diagram-controls">
		    <label class="btn btn-default active" id="selectLabel">
			<input type="radio" id="select" name="tool" value="select" autocomplete="off" checked>select</input>
		    </label>
		    <label class="btn btn-default">
			<input type="radio" id="force" name="tool" value="force" autocomplete="off">force (auto-layout)</input>
		    </label>
		    <label class="btn btn-default">
			<input type="radio" id="pan" name="tool" value="pan" autocomplete="off">pan+zoom</input>
		    </label>
		    <label class="btn btn-default">
			<input type="radio" id="connect" name="tool" value="connect" autocomplete="off">edit connections</input>
		    </label>
		</div>
	    </div>
	</div>
    </div>
    
    <div class="app-diagram">
	<canvas height="800" width="1800"></canvas>
	<svg>
	    <g></g>
	</svg>
    </div>

    <script>
     "use strict";
     
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

     this.on("mount", function() {
	 $("#select").change(function() {
	     self.disableForce();
	     self.disableZoom();
	     self.disableConnect();
	     self.enableDrag();
	 });
	 
	 $("#force").change(function() {
	     self.disableZoom();
	     self.disableDrag();
	     self.disableConnect();
	     self.enableForce();
	 });

	 $("#pan").change(function() {
	     self.disableForce();
	     self.disableDrag();
	     self.disableConnect();
	     self.enableZoom();
	 });

	 $("#connect").change(function() {
	     self.disableForce();
	     self.disableDrag();
	     self.disableZoom();
	     self.enableConnect();
	 });
	 
     });

     this.model = opts.model;
     this.edges = [];
     
     render(diagramName) {
	 // clear all
	 d3.select("svg").select("g").selectAll("g").remove();
	 d3.select("svg").selectAll("#yAxisG").remove();
	 d3.select("svg").selectAll("#xAxisG").remove();

	 this.model.selectDiagram(decodeURI(diagramName));
	 let allConnectivityNodes = this.model.getConnectivityNodes();
	 console.log("extracted connectivity nodes");
	 let allACLines = this.model.getGraphicObjects("cim:ACLineSegment");
	 console.log("extracted acLines");
	 let allBreakers = this.model.getGraphicObjects("cim:Breaker");
	 console.log("extracted breakers");
	 let allDisconnectors = this.model.getGraphicObjects("cim:Disconnector");
	 console.log("extracted disconnectors");
	 let allEnergySources = this.model.getGraphicObjects("cim:EnergySource")
	     .concat(this.model.getGraphicObjects("cim:SynchronousMachine"));
	 console.log("extracted energy sources");
	 let allEnergyConsumers = this.model.getGraphicObjects("cim:EnergyConsumer")
				      .concat(this.model.getGraphicObjects("cim:ConformLoad"))
				      .concat(this.model.getGraphicObjects("cim:NonConformLoad"));
	 console.log("extracted energy consumers");
	 let allPowerTransformers = this.model.getGraphicObjects("cim:PowerTransformer");
	 console.log("extracted power transformers");
	 let allBusbarSections = this.model.getGraphicObjects("cim:BusbarSection");
	 console.log("extracted busbarSections");
	 let allTerminals = this.model.getTerminals(allACLines
	                 .concat(allBreakers)
	                 .concat(allDisconnectors)
	                 .concat(allEnergySources)
	                 .concat(allEnergyConsumers)
			 .concat(allPowerTransformers));
	 console.log("extracted terminals");
	 let allSubstations = this.model.getObjects("cim:Substation"); // TODO: filter substations
	 console.log("extracted substations");

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
	 // power transformers
	 let trafoEnter = this.drawPowerTransformers(allPowerTransformers);
	 console.log("drawn power transformers");
	 // connectivity nodes
	 let cnEnter = this.drawConnectivityNodes(allConnectivityNodes);
	 console.log("drawn connectivity nodes");

	 this.edges = this.edges.filter(el => allTerminals.indexOf(el.target) > -1);
	 
	 // ac line terminals
	 let termSelection = this.createTwoTerminals(aclineEnter);
	 this.createMeasurements(termSelection);
	 console.log("drawn acline terminals");
	 // breaker terminals
	 this.createTwoTerminals(breakerEnter);
	 console.log("drawn breaker terminals");
	 // disconnector terminals
	 this.createTwoTerminals(discEnter);
	 console.log("drawn disconnector terminals");
	 // energy source terminals
	 termSelection = this.createTwoTerminals(ensrcEnter, 50);
	 this.createMeasurements(termSelection);
	 console.log("drawn energy source terminals");
	 // energy consumer terminals
	 termSelection = this.createTwoTerminals(enconsEnter);
	 this.createMeasurements(termSelection);
	 console.log("drawn energy consumer terminals");
	 // power transformer terminals
	 termSelection = this.createTwoTerminals(trafoEnter, 50);
	 this.createMeasurements(termSelection);
	 console.log("drawn power transformer terminals");

	 // substations
	 /*this.drawSubstations(allSubstations);
	 console.log("drawn substations");*/

	 let nodes = allConnectivityNodes
		.concat(allACLines)
		.concat(allBreakers)
		.concat(allDisconnectors)
		.concat(allEnergySources)
		.concat(allEnergyConsumers)
		.concat(allPowerTransformers);
	 tickFunction = this.forceTick;
	 zoomFunction = this.zooming;
	 force = force
		.nodes(nodes)
		.links(this.edges)
		.on("tick", this.forceTick);
	 console.log("Routing links...");
	 this.edges.forEach(function (link) {
	     link.p = self.closestPoint(link.source, link.target);
	 });
	 // setup diagram buttons
	 this.disableForce();
	 this.disableZoom();
	 this.enableDrag();

	 tickFunction();
	 // setup xy axes
	 let xScale = d3.scale.linear().domain([0, 1800]).range([0,1800]);
	 let yScale = d3.scale.linear().domain([0, 800]).range([0,800]);
	 let yAxis = d3.svg.axis().scale(yScale).orient("right");
	 let xAxis = d3.svg.axis().scale(xScale).orient("bottom");
	 d3.select("svg").append("g").attr("id", "yAxisG").call(yAxis);
	 d3.select("svg").append("g").attr("id", "xAxisG").call(xAxis);
	 
	 // add tooltips
	 /*cnEnter.attr("title", function(d) {
	     let attributes = d.getAttributes();
	     let tooltip = "";
	     for (let i in attributes) {
		 tooltip = tooltip + attributes[i].localName + ": " + attributes[i].textContent + "\n";
	     }
	     return tooltip;
	 });*/
	 // add element test
	 /*newElement = data.createElement("cim:Breaker");
	    data.children[0].appendChild(newElement); 
	    // serialize test
	    var oSerializer = new XMLSerializer();
	    var sXML = oSerializer.serializeToString(data);
	    console.log(sXML);*/
	 // handle mouseover
	 d3.select("svg").selectAll("svg > g > g > g")
		  .on("mouseover.hover", this.hover)
		  .on("mouseout", this.mouseOut);
     }

     createMeasurements(termSelection) {
	 termSelection.attr("title", function(d) {
	     let tooltip = "";
	     let tooltipLines = [];
	     let measurements = self.model.getGraph([d], "Terminal.Measurements", "Measurement.Terminal").map(el => el.source);
	     for (let i in measurements) {
		 let measurement = measurements[i];
		 let type = self.model.getAttribute(measurement, "cim:Measurement.measurementType").textContent;
		 let phases = self.model.getEnum(measurement, "cim:Measurement.phases").attributes[0].textContent.split("#")[1].split(".")[1];
		 let unitMultiplier = self.model.getEnum(measurement, "cim:Measurement.unitMultiplier").attributes[0].textContent.split("#")[1].split(".")[1];
		 if (unitMultiplier === "none") {
		     unitMultiplier = "";
		 }
		 let unitSymbol = self.model.getEnum(measurement, "cim:Measurement.unitSymbol").attributes[0].textContent.split("#")[1].split(".")[1];
		 let valueObject = self.model.getGraph([measurement], "Analog.AnalogValues", "AnalogValue.Analog").map(el => el.source)[0];
		 let actLine = "";
		 if (typeof(valueObject) !== "undefined") {
		     let value = "n.a."
		     if(typeof(self.model.getAttribute(valueObject, "cim:AnalogValue.value")) !== "undefined") {
			 value = self.model.getAttribute(valueObject, "cim:AnalogValue.value").textContent;
		     }
		     
		     actLine = actLine + type;
		     actLine = actLine + " (phase: " + phases + ")";
		     actLine = actLine + ": ";
		     actLine = actLine + value;
		     actLine = actLine + " [" + unitMultiplier + unitSymbol + "]";
		     actLine = actLine + "\n";
		     tooltipLines.push(actLine);
		 }
	     }
	     tooltipLines.sort();
	     for (let i in tooltipLines) {
		 tooltip = tooltip + tooltipLines[i];
	     }
	     if (tooltip === "") {
		 tooltip = "No measurements available.";
	     }
	     return tooltip;
	 });
     }

     // bind data to an x,y array from Diagram Object Points
     createSelection(type, data) {
	 let types = type + "s";
	 d3.select("svg").select("g").append("g")
	   .attr("class", types);

	 let selection = d3.select("svg").select("g."+types).selectAll("g."+type)
			   .data(data, function(d) {
			       let lineData = [];
			       let dobjs = self.model.getDiagramObjectGraph([d]).map(el => el.target);
			       d.rotation = 0;
			       if (dobjs.length > 0) {
				   let rotation = self.model.getAttribute(dobjs[0], "cim:DiagramObject.rotation");
				   if (typeof(rotation) !== "undefined") {
				       d.rotation = parseInt(rotation.innerHTML);
				   }
			       } 
			       let points = self.model.getGraph(dobjs, "DiagramObject.DiagramObjectPoints", "DiagramObjectPoint.DiagramObject").map(el => el.source);
			       if (points.length > 0) {
				   d.x = parseInt(self.model.getAttribute(points[0], "cim:DiagramObjectPoint.xPosition").innerHTML);
				   d.y = parseInt(self.model.getAttribute(points[0], "cim:DiagramObjectPoint.yPosition").innerHTML);
				   for (let point in points) {
				       lineData.push({
					   x: parseInt(self.model.getAttribute(points[point], "cim:DiagramObjectPoint.xPosition").innerHTML) - d.x,
					   y: parseInt(self.model.getAttribute(points[point], "cim:DiagramObjectPoint.yPosition").innerHTML) - d.y,
					   seq: parseInt(self.model.getAttribute(points[point], "cim:DiagramObjectPoint.sequenceNumber").innerHTML)
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
		    .attr("font-size", 8)
		    .attr("x", function(d) {
			let lineData = this.parentNode.__data__.lineData;
			let end = lineData[lineData.length-1];
			return (lineData[0].x + end.x)/2;
		    })
		    .attr("y", function(d) {
			let lineData = this.parentNode.__data__.lineData;
			let end = lineData[lineData.length-1];
			return (lineData[0].y + end.y)/2;
		    })
		    .text(function(d) {
			return self.model.getAttribute(d, "cim:IdentifiedObject.name").innerHTML;
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
			 return line([{x: 0, y:0, seq:1}, {x:0, y:30, seq:2}]);
		     })
		     .attr("fill", "none")
		     .attr("stroke", "green")
		     .attr("stroke-width", 4);
	 breakerEnter.append("text")
		     .style("text-anchor", "end")
		     .attr("font-size", 8)
		     .attr("x", function(d) {
			 let lineData = this.parentNode.__data__.lineData;
			 let end = lineData[lineData.length-1];
			 return ((lineData[0].x + end.x)/2) - 10;
		     })
		     .attr("y", function(d) {
			 let lineData = this.parentNode.__data__.lineData;
			 let end = lineData[lineData.length-1];
			 return ((lineData[0].y + end.y)/2) + 15;
		     })
		     .text(function(d) {
			 return self.model.getAttribute(d, "cim:IdentifiedObject.name").innerHTML;
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
		      let value = "0"; // default is OPEN
		      // check the status of this disconnector
		      let measurement = self.model.getGraph([d], "PowerSystemResource.Measurements", "Measurement.PowerSystemResource").map(el => el.source)[0];
		      if (typeof(measurement) !== "undefined") {
			  let valueObject = self.model.getGraph([measurement], "Discrete.DiscreteValues", "DiscreteValue.Discrete").map(el => el.source)[0];
			  if (typeof(valueObject) !== "undefined") {
			      value = self.model.getAttribute(valueObject, "cim:DiscreteValue.value").textContent;
			  }
		      }
		      if (value === "0") {
			  return line([{x: 0, y:0, seq:1}, {x:18, y:24, seq:2}]);
		      } else {
			  return line([{x: 0, y:0, seq:1}, {x:0, y:30, seq:2}]);
		      }
		  })
		  .attr("fill", "none")
		  .attr("stroke", "blue")
		  .attr("stroke-width", 4);
	 discEnter.append("text")
		  .style("text-anchor", "end")
		  .attr("font-size", 8)
		  .attr("x", function(d) {
		      let lineData = this.parentNode.__data__.lineData;
		      let end = lineData[lineData.length-1];
		      return ((lineData[0].x + end.x)/2) - 10;
		  })
		  .attr("y", function(d) {
		      let lineData = this.parentNode.__data__.lineData;
		      let end = lineData[lineData.length-1];
		      return ((lineData[0].y + end.y)/2) + 15;
		  })
		  .text(function(d) {
 		      return self.model.getAttribute(d, "cim:IdentifiedObject.name").innerHTML;
		  });
	 return discEnter;
     }

     // Draw all EnergySources
     drawEnergySources(allEnergySources) {
	 let ensrcEnter = this.createSelection("EnergySource", allEnergySources);
	 
	 ensrcEnter.append("circle")
		   .attr("r", 25)
		   .attr("cx", 0) 
		   .attr("cy", 25)
		   .attr("fill", "white")
		   .attr("stroke", "blue")
		   .attr("stroke-width", 4);
	 ensrcEnter.append("text")
		   .style("text-anchor", "middle")
		   .attr("font-size", 8)
		   .attr("x", 0)
		   .attr("y", -10)
		   .text(function(d) {
		       return self.model.getAttribute(d, "cim:IdentifiedObject.name").innerHTML;
		   });
	 return ensrcEnter;
     }

     // Draw all EnergyConsumers
     drawEnergyConsumers(allEnergyConsumers) {
	 let line = d3.svg.line()
		      .x(function(d) { return d.x; })
		      .y(function(d) { return d.y; })
		      .interpolate("linear");
	 let enconsEnter = this.createSelection("EnergyConsumer", allEnergyConsumers);

	 enconsEnter.append("path")
		     .attr("d", function(d) {
			 return line([{x: -15, y:0, seq:1}, {x:15, y:0, seq:2}, {x:0, y:20, seq:3}, {x: -15, y:0, seq:4}]);
		     })
		     .attr("fill", "white")
		     .attr("stroke", "black")
		     .attr("stroke-width", 4);
	 enconsEnter.append("text")
		    .style("text-anchor", "middle")
		    .attr("font-size", 8)
		    .attr("x", 0) 
		    .attr("y", 30)
		    .text(function(d) {
			return self.model.getAttribute(d, "cim:IdentifiedObject.name").innerHTML;
		    });
	 return enconsEnter;
     }

     // Draw all PowerTransformers
     drawPowerTransformers(allPowerTransformers) {
	 let trafoEnter = this.createSelection("PowerTransformer", allPowerTransformers);
	 
	 trafoEnter.append("circle")
		   .attr("r", 15)
		   .attr("cx", 0) 
		   .attr("cy", 15)
		   .attr("fill", "none")
		   .attr("stroke", "black")
		   .attr("stroke-width", 4);
	 trafoEnter.append("circle")
	           .attr("r", 15)
	           .attr("cx", 0)
	           .attr("cy", 35)
	           .attr("fill", "none")
	           .attr("stroke", "black")
	           .attr("stroke-width", 4);
	 trafoEnter.append("text")
		   .style("text-anchor", "end")
		   .attr("font-size", 8)
		   .attr("x", -25)
		   .attr("y", 25)
		   .text(function(d) {
		       return self.model.getAttribute(d, "cim:IdentifiedObject.name").innerHTML;
		   });
	 return trafoEnter;
     }

     // Draw all Substations
     drawSubstations(allSubstations) {
	 let substations = d3.select("svg").select("g").append("g")
	   .attr("class", "Substations");
	 
	 let selection = substations.selectAll("g.Substation")
				    .data(allSubstations)
				    .enter()
	                            .append("g")
	                            .attr("class", "Substation")
	                            .attr("id", function(d) {
					let allChildNodes = [];	 
					let equipments = self.model.getGraph([d], "EquipmentContainer.Equipments", "Equipment.EquipmentContainer").map(el => el.source);
					for (i in equipments) {
					    let equipment = equipments[i];
					    // handle busbars
					    // TODO: duplicate code in moveTo()
						if (equipment.nodeName === "cim:BusbarSection") {
						    let terminal = self.model.getConductingEquipmentGraph([equipment]).map(el => el.target)[0];
						    if (typeof(terminal) === "undefined") {
							continue;
						    }
						    let cn = self.model.getGraph([terminal], "Terminal.ConnectivityNode", "ConnectivityNode.Terminals").map(el => el.source)[0];
						    equipment = cn;
						}
					    allChildNodes.push(d3.select("svg").select("#" + equipment.attributes[0].value).node());
					}
					d.x = d3.min(allChildNodes.filter(el => el !== null), function(dd) {return dd.getBBox().x+d3.select(dd).datum().x}) - 30;
					d.y = d3.min(allChildNodes.filter(el => el !== null), function(dd) {return dd.getBBox().y+d3.select(dd).datum().y}) - 30;
					d.width = d3.max(allChildNodes.filter(el => el !== null), function(dd) {
					    var bb = dd.getBBox();
					    return (bb.x + d3.select(dd).datum().x + bb.width) - d.x + 60;
					});
					d.height = d3.max(allChildNodes.filter(el => el !== null), function(dd) {
					    var bb = dd.getBBox();
					    return (bb.y + d3.select(dd).datum().y + bb.height) - d.y + 60;
					});
					d.rotation = 0;
					return d.attributes[0].value;
				    });
	 
	 selection.append("rect")
		  .attr("x", 0)
		  .attr("y", 0)  
		  .attr("width", function(d) {
		      return d.width;
		  })  
		  .attr("height",  function(d) {
		      return d.height;
		  })  
		  .attr("stroke", "blue")
		  .attr("stroke-width", 4)
		  .attr("fill", "none");
	 selection.append("text")
		  .style("text-anchor", "middle")
		  .attr("x", 0)
		  .attr("y", 0)
		  .text(function(d) {
		      return self.model.getAttribute(d, "cim:IdentifiedObject.name").innerHTML;
		  });
     }

     createTwoTerminals(eqSelection, heigth) {
	 if (arguments.length === 1) {
	     heigth = 30;
	 }
	 let termSelection = eqSelection.selectAll("g")
					.data(function(d) {
					    return self.model.getConductingEquipmentGraph([d]).map(el => el.target);
					})
					.enter()
					.append("g")
					.attr("id", function(d, i) {
					    let cn = self.model.getGraph([d], "Terminal.ConnectivityNode", "ConnectivityNode.Terminals").map(el => el.source)[0];
					    let lineData = this.parentNode.__data__.lineData;
					    let start = lineData[0];
					    let end = lineData[lineData.length-1];
					    let eqX = this.parentNode.__data__.x;
					    let eqY = this.parentNode.__data__.y;
					    if (lineData.length === 1) {
						start = {x:0, y:0};
						end = {x:0, y:heigth};
					    }
					    let terminals = self.model.getTerminals(d3.select(this.parentNode).data());
					    if (typeof(cn) !== "undefined" && terminals.length > 1) {
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
						checkTerminals(terminals, d, cn, eqX, eqY, start, end);
					    } else {
						if (lineData.length === 1) {
						    d.x = eqX;
						    d.y = eqY + heigth*i;						    
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

	 function checkTerminals(terminals, d, cn, eqX, eqY, start, end) {
	     let otherTerm = terminals.filter(term => term !== d)[0];
	     // we need to check if the other terminal must be moved
	     let otherCn = self.model.getGraph([otherTerm], "Terminal.ConnectivityNode", "ConnectivityNode.Terminals").map(el => el.source)[0];
	     let termToChange = otherTerm;
	     let cnToChange = otherCn;
	     if(typeof(otherCn) !== "undefined") {
		 let edges = self.model.getGraph([otherCn], "ConnectivityNode.Terminals", "Terminal.ConnectivityNode", true);
		 let cnTerminals = edges.map(el => el.target);
		 // let's try to get some equipment
		 let equipments = self.model.getGraph(cnTerminals, "Terminal.ConductingEquipment", "ConductingEquipment.Terminals").map(el => el.source);
		 equipments = self.model.getConductingEquipmentGraph(equipments).map(el => el.source);
		 equipments = new Set(equipments); // we want uniqueness
		 if (equipments.size > 1) {
		     termToChange = d;
		     cnToChange = cn;
		 }
	     } 
	     
	     if (otherTerm.x === d.x && otherTerm.y === d.y) {
		 if (d.x === eqX + end.x && d.y === eqY + end.y) {
		     termToChange.x = eqX + start.x;
		     termToChange.y = eqY + start.y;
		 } else {
		     termToChange.x = eqX + end.x;
		     termToChange.y = eqY + end.y;			
		 }
		 if(typeof(cnToChange) !== "undefined") {
		     cnToChange.x = termToChange.x;
		     cnToChange.y = termToChange.y + 20;
		 }
	     }
	 }
	 
	 return termSelection;
     }

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
			     d.rotation = 0;
			     let lineData = [];
			     let xcalc = 0;
			     let ycalc = 0;
			     let edges = self.model.getGraph([d], "ConnectivityNode.Terminals", "Terminal.ConnectivityNode", true);
			     let cnTerminals = edges.map(el => el.target);
			     // let's try to get some equipment
			     let equipments = self.model.getGraph(cnTerminals, "Terminal.ConductingEquipment", "ConductingEquipment.Terminals").map(el => el.source);
			     equipments = self.model.getConductingEquipmentGraph(equipments).map(el => el.source);
			     // let's try to get a busbar section
			     let busbarSection = equipments.filter(el => el.localName === "BusbarSection")[0];
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
			     } else {
				 let rotation = self.model.getAttribute(dobjs[0], "cim:DiagramObject.rotation"); 
				 if (typeof(rotation) !== "undefined") {
				     d.rotation = parseInt(rotation.innerHTML);
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
	 d3.select("svg").selectAll("svg > g > g > g")
	   .filter(function (d) {
	       return d === hoverD;
	   }).each(function (d) {
	       d3.select(this).append("rect")
		 .attr("x", this.getBBox().x)
		 .attr("y", this.getBBox().y)
		 .attr("width", this.getBBox().width)
		 .attr("height", this.getBBox().height)
		 .attr("stroke", "black")
		 .attr("stroke-width", 2)
		 .attr("stroke-dasharray", "5,5")
		 .attr("fill", "none");	       
	   });
     }

     moveTo(uuid) {
	 let hoverD = this.model.getObject(uuid);
	 // handle busbars
	 if (hoverD.nodeName === "cim:BusbarSection") {
	     let terminal = self.model.getConductingEquipmentGraph([hoverD]).map(el => el.target)[0];
	     let cn = self.model.getGraph([terminal], "Terminal.ConnectivityNode", "ConnectivityNode.Terminals").map(el => el.source)[0];
	     hoverD = cn;
	 }

	 if (typeof(hoverD.x) === "undefined" || typeof(hoverD.y) === "undefined") {
	     return;
	 }
	 
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
	 this.edges.forEach(function (link) {
	     context.beginPath();
	     context.moveTo(link.p[0] + d3.select(link.source).datum().x, link.p[1] + d3.select(link.source).datum().y);
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
	 d3.select("svg").selectAll("svg > g > g > g").selectAll("rect").remove();
     }

     enableDrag() {
	 $("#select").click();
	 this.status = "DRAG";
	 let model = this.model;
	 let drag = d3.behavior.drag()
		      .origin(function(d) {
			  return d;
		      })
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
				  let seq = 1;
				  let seqObject = self.model.getAttribute(points[point], "cim:DiagramObjectPoint.sequenceNumber");
				  if (typeof(seqObject) !== "undefined") {
				      seq = parseInt(seqObject.innerHTML);
				  }
				  let actLineData = d.lineData.filter(el => el.seq === seq)[0];
				  self.model.getAttribute(points[point], "cim:DiagramObjectPoint.xPosition").innerHTML = actLineData.x + d.x;
				  self.model.getAttribute(points[point], "cim:DiagramObjectPoint.yPosition").innerHTML = actLineData.y + d.y;
			      }
			  }
			  
			  tickFunction();
		      });
	 d3.select("svg").selectAll("svg > g > g > g").call(drag);
     }

     disableDrag() {
	 let drag = d3.behavior.drag()
		      .on("drag", null);
	 d3.select("svg").selectAll("svg > g > g > g").call(drag);
     }

     enableForce() {
	 $("#force").click();
	 this.status = "FORCE";
	 d3.select("svg").selectAll("svg > g > g > g").call(force.drag()).on("click", fixNode);
	 
	 function fixNode(d) {
	     d.fixed = true;
	 };
	 force.start();
     }

     disableForce() {
	 force.stop();    
     }
     
     enableZoom() {
	 $("#zoom").click();
	 this.status = "ZOOM";
	 d3.select("svg").selectAll("svg > g > g > g")
	   .on("click", function (d) {
	       let hashComponents = window.location.hash.substring(1).split("/");
	       let basePath = hashComponents[0] + "/" + hashComponents[1];
	       if (window.location.hash.substring(1) !== basePath + "/" + d.attributes[0].value) {
		       riot.route(basePath + "/" + d.attributes[0].value);
	       }
	   });
	 zoomComp = d3.behavior.zoom();
	 zoomComp.on("zoom", zoomFunction);
	 d3.select("svg").call(zoomComp);
	 zoomComp.translate([xoffset, yoffset]);
	 zoomComp.scale(svgZoom);
	 zoomEnabled = true;
     }

     disableZoom() {
	 if (zoomEnabled===true) {
	     d3.select("svg").selectAll("svg > g > g > g").on("click", null);
	     zoomComp.on("zoom", null);
	     d3.select("svg").select("g").call(zoomComp);
	     xoffset = zoomComp.translate()[0];
	     yoffset = zoomComp.translate()[1];
	     svgZoom = zoomComp.scale();
	     tickFunction();
	     zoomEnabled = false;
	 }
     }

     zooming() {
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

     enableConnect() {
         $("#connect").click();
	 this.status = "CONNECT";
	 d3.select("svg").selectAll("svg > g > g > g > g.Terminal")
	   .on("click", function (d) {
	       console.log(d);
	   });
	 
     }

     disableConnect() {
	 d3.select("svg").selectAll("svg > g > g > g > g.Terminal")
	                .on("click", null);
     }

     forceTick() {
	 updateElements(d3.select("svg").selectAll("svg > g > g > g"));
	 
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

	 function updateElements(selection) {
	     selection.attr("transform", function (d) {
		 return "translate("+d.x+","+d.y+") rotate("+d.rotation+")";
	     }).selectAll("g")
		      .attr("id", function(d, i) {
			  d.x = this.parentNode.__data__.x + parseInt(d3.select(this.firstChild).attr("cx"));
			  d.y = this.parentNode.__data__.y + parseInt(d3.select(this.firstChild).attr("cy"));
			  return d.attributes[0].value;
		      });
	 };
     }

     closestPoint(source, point) {
	 let pathNode = d3.select(source).select("path").node();
	 if (pathNode === null) {
	     return [0, 0];
	 }

	 // TODO: pathNode.pathSegList is deprecated in Chrome 48, we use a polyfill
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
	 for (let scan, scanLength = 0, scanDistance; scanLength <= pathLength; scanLength += precision) {
	     if ((scanDistance = distance2(scan = pathNode.getPointAtLength(scanLength))) < bestDistance) {
		 best = scan, bestLength = scanLength, bestDistance = scanDistance;
	     }
	 }

	 // binary search for precise estimate
	 precision *= .5;
	   while (precision > .5) {
	       let before,
		   after, beforeLength,
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
	   }

	 best = [best.x, best.y];
	 return best;

	 function distance2(p) {
	     let dx = p.x + d3.select(source).datum().x - point.x, 
		 dy = p.y + d3.select(source).datum().y - point.y; 
	     return dx * dx + dy * dy;
	 }
     }

    </script>

</cimDiagram>

