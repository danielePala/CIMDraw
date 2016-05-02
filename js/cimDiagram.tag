<cimDiagram>
    <cimDiagramControls model={model}></cimDiagramControls>
    <div class="app-diagram">
	<svg>
	    <path stroke-width="1" stroke="black" fill="none"></path>
	    <circle r="3.5" cy="-10" cx="-10"></circle>
	    <g>
		<g class="edges"></g>
	    </g>
	</svg>
    </div>

    <script>
     "use strict";
     let self = this;
     self.model = opts.model;
     self.nodes = [];
     self.edges = [];
     self.nodeGraphic = new Map(); // map connectivy nodes to their SVG elements 
     self.termGraphic = new Map(); // map terminals to their SVG elements
     self.edgeGraphic = new Map(); // map edges to their SVG elements

     // listen to 'showDiagram' event from parent
     self.parent.on("showDiagram", function(file, name, element) {
	 if (name !== self.diagramName) {
             self.render(name);
	 }
         if (typeof(element) !== "undefined") {
             self.moveTo(element);
         }
     });

     // listen to 'mount' event
     self.on("mount", function() {
	 // setup xy axes
	 let xScale = d3.scale.linear().domain([0, 1800]).range([0,1800]);
	 let yScale = d3.scale.linear().domain([0, 800]).range([0,800]);
	 let yAxis = d3.svg.axis().scale(yScale).orient("right");
	 let xAxis = d3.svg.axis().scale(xScale).orient("bottom");
	 d3.select("svg").append("g").attr("id", "yAxisG").call(yAxis);
	 d3.select("svg").append("g").attr("id", "xAxisG").call(xAxis);
     });
     
     // listen to 'transform' event
     self.on("transform", function() {
	 let transform = d3.transform(d3.select("svg").select("g").attr("transform"));
	 let newx = transform.translate[0];
	 let newy = transform.translate[1];
	 let newZoom = transform.scale[0];
	 let svgWidth = parseInt(d3.select("svg").style("width"));
	 let svgHeight = parseInt(d3.select("svg").style("height"));

	 // manage axes
	 let xScale = d3.scale.linear().domain([-newx/newZoom, (svgWidth-newx)/newZoom]).range([0,svgWidth]);
	 let yScale = d3.scale.linear().domain([-newy/newZoom, (svgHeight-newy)/newZoom]).range([0,svgHeight]);
	 let yAxis = d3.svg.axis().scale(yScale).orient("right");
	 let xAxis = d3.svg.axis().scale(xScale).orient("bottom");
	 d3.select("svg").selectAll("#yAxisG").call(yAxis);
	 d3.select("svg").selectAll("#xAxisG").call(xAxis);
	 self.updateEdges(newx, newy, newZoom, []);
     });

     // listen to 'createObject' event from model
     self.model.on("createObject", function(object) {
	 self.addToDiagram(object);
     });

     // listen to 'setAttribute' event from model
     self.model.on("setAttribute", function(object, attrName, value) {
	 if (attrName === "cim:IdentifiedObject.name") {
	     let type = object.localName;
	     let uuid = object.attributes[0].value;
	     // special case for busbars
	     if (object.nodeName === "cim:BusbarSection") {
		 let terminal = self.model.getConductingEquipmentGraph([object]).map(el => el.target)[0];
		 let cn = self.model.getGraph([terminal], "Terminal.ConnectivityNode", "ConnectivityNode.Terminals").map(el => el.source)[0];
		 type = cn.localName;
		 uuid = cn.attributes[0].value;
	     }
	     let types = d3.select("svg").selectAll("svg > g > g." + type + "s");
	     let target = types.select("#" + uuid);
	     target.select("text").html(value);
	 }
     });

     // listen to 'setEdge' event from model
     self.model.on("setEdge", function(cn, term) {
	 let edgeToChange = self.edges.filter(el => el.target === term)[0];
	 if (typeof(edgeToChange) === "undefined") {
	     edgeToChange = {source: cn, target: term};
	     self.edges.push(edgeToChange);
	     self.createEdges([edgeToChange]);
	 } else {
	     edgeToChange.source = cn;
	 }
	 edgeToChange.p = self.closestPoint(cn, term);
	 self.forceTick();
     });

     /** Main rendering function */
     render(diagramName) {
	 // clear all
	 d3.select("svg").select("g").selectAll("g:not(.edges)").remove();
	 self.nodes = [];
	 self.edges = [];
	 
	 self.model.selectDiagram(decodeURI(diagramName));
	 self.diagramName = decodeURI(diagramName);
	 let allConnectivityNodes = self.model.getConnectivityNodes();
	 console.log("extracted connectivity nodes");
	 let allACLines = self.model.getGraphicObjects("cim:ACLineSegment");
	 console.log("extracted acLines");
	 let allBreakers = self.model.getGraphicObjects("cim:Breaker");
	 console.log("extracted breakers");
	 let allDisconnectors = self.model.getGraphicObjects("cim:Disconnector");
	 console.log("extracted disconnectors");
	 let allLoadBreakSwitches = self.model.getGraphicObjects("cim:LoadBreakSwitch");
	 console.log("extracted load break switches");
	 let allEnergySources = self.model.getGraphicObjects("cim:EnergySource")
	     .concat(self.model.getGraphicObjects("cim:SynchronousMachine"));
	 console.log("extracted energy sources");
	 let allEnergyConsumers = self.model.getGraphicObjects("cim:EnergyConsumer")
				      .concat(self.model.getGraphicObjects("cim:ConformLoad"))
				      .concat(self.model.getGraphicObjects("cim:NonConformLoad"));
	 console.log("extracted energy consumers");
	 let allPowerTransformers = self.model.getGraphicObjects("cim:PowerTransformer");
	 console.log("extracted power transformers");
	 let allBusbarSections = self.model.getGraphicObjects("cim:BusbarSection");
	 console.log("extracted busbarSections");

	 // AC Lines
	 let aclineEnter = this.drawACLines(allACLines);
	 console.log("drawn acLines");
	 // breakers
	 let breakerEnter = this.drawBreakers(allBreakers);
	 console.log("drawn breakers");
	 // disconnectors
	 let discEnter = this.drawDisconnectors(allDisconnectors);
	 console.log("drawn disconnectors");
	 // load break switches
	 let lbsEnter = this.drawLoadBreakSwitches(allLoadBreakSwitches);
	 console.log("drawn load break switches");
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

	 this.nodes = allConnectivityNodes
		.concat(allACLines)
		.concat(allBreakers)
		.concat(allDisconnectors)
		.concat(allLoadBreakSwitches)
		.concat(allEnergySources)
		.concat(allEnergyConsumers)
		.concat(allPowerTransformers);

	 // ac line terminals
	 let termSelection = this.createTerminals(aclineEnter);
	 this.createMeasurements(termSelection);
	 console.log("drawn acline terminals");
	 // breaker terminals
	 this.createTerminals(breakerEnter);
	 console.log("drawn breaker terminals");
	 // disconnector terminals
	 this.createTerminals(discEnter);
	 console.log("drawn disconnector terminals");
	 // load break switch terminals
	 this.createTerminals(lbsEnter);
	 console.log("drawn load break switch terminals");
	 // energy source terminals
	 termSelection = this.createTerminals(ensrcEnter, 50);
	 this.createMeasurements(termSelection);
	 console.log("drawn energy source terminals");
	 // energy consumer terminals
	 termSelection = this.createTerminals(enconsEnter);
	 this.createMeasurements(termSelection);
	 console.log("drawn energy consumer terminals");
	 // power transformer terminals
	 termSelection = this.createTerminals(trafoEnter, 50);
	 this.createMeasurements(termSelection);
	 console.log("drawn power transformer terminals");

	 // handle mouseover
	 d3.select("svg").selectAll("svg > g > g:not(.edges) > g")
			    .on("mouseover.hover", self.hover)
			    .on("mouseout", mouseOut);
	 d3.select("svg").on("mouseover", function() {
	     self.model.on("dragend", dragend);
	 }).on("mouseout",function() {
	     self.model.off("dragend", dragend);
	 });

	 function dragend(d) {
	     let dobjs = self.model.getDiagramObjectGraph([d]);
	     if (dobjs.length > 0) {
		 self.moveTo(d.attributes[0].value);
	     } else {
		 // add object to diagram
		 self.addToDiagram(d);
	     }
	 }

	 function mouseOut(d) {
	     d3.select(this).selectAll("rect").remove();	     
	 }

	 // create edges
	 self.createEdges(self.edges);
	 self.forceTick();

	 self.trigger("render");
     }

     createEdges(edges) {
	 d3.select("svg").select("g > g.edges")
	   .selectAll("g.edge")
	   .data(edges, function(d) {
	       return d.source.attributes[0].value+d.target.attributes[0].value;
	   })
	   .enter()
	   .append("g")
	   .attr("class", "edge")
	   .attr("id", function(d) {
	       self.edgeGraphic.set(d, this);
	       return d.source.attributes[0].value+d.target.attributes[0].value;
	   })
	   .append("path")
	   .attr("fill", "none")
	   .attr("stroke", "black")
	   .attr("stroke-width", 1);
     }

     createMeasurements(termSelection) {
	 termSelection.attr("data-toggle", "tooltip");	 
	 termSelection.each(function(d) {
	     let tooltip = "";
	     let measurements = self.model.getGraph([d], "Terminal.Measurements", "Measurement.Terminal").map(el => el.source);
	     if (measurements.length > 0) {
		 let tooltipLines = ["<b>Measurements</b><br><br>"];
		 for (let measurement of measurements) {
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
			 actLine = actLine + parseFloat(value).toFixed(2);
			 actLine = actLine + " [" + unitMultiplier + unitSymbol + "]";
			 actLine = actLine + "<br>";
			 tooltipLines.push(actLine);
		     }
		 }
		 tooltipLines.sort();
		 for (let i in tooltipLines) {
		     tooltip = tooltip + tooltipLines[i];
		 }
		 // change terminal appearance
		 d3.select(this)
		   .select("circle")
		   .style("fill","white")
		   .style("stroke", "black");
	     }

	     // power flow results
	     let svs = self.model.getGraph([d], "Terminal.SvPowerFlow", "SvPowerFlow.Terminal").map(el => el.source);
	     if (svs.length > 0) {
		 if (measurements.length > 0) {
		     tooltip = tooltip + "<br>";
		 }
		 tooltip = tooltip + "<b>Power flow results</b><br><br>";
		 for (let sv of svs) {
		     let p = self.model.getAttribute(sv, "cim:SvPowerFlow.p").textContent;
		     let q = self.model.getAttribute(sv, "cim:SvPowerFlow.q").textContent;
		     let actLine = "Active Power: " + parseFloat(p).toFixed(2) + " [kW]";
		     actLine = actLine + "<br>";
		     actLine = actLine + "Reactive power: " + parseFloat(q).toFixed(2) + " [kVAr]";
		     actLine = actLine + "<br>";
		     tooltip = tooltip + actLine;
		 }	 
	     }
	 
	     $(this).tooltip({title: tooltip,
			      container: "body",
			      html: true,
			      placement: "auto right"
	     });
	 });
     }

     // bind data to an x,y array from Diagram Object Points
     createSelection(type, data) {
	 let types = type + "s";
	 if (d3.select("svg").select("g." + types).empty()) {
	     d3.select("svg").select("g").append("g")
	       .attr("class", types);
	 }

	 for (let d of data) {
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
		 self.model.addToActiveDiagram(d, lineData);
	     }
	     d.lineData = lineData;
	 }

	 var menu = [
	     {
		 title: 'Rotate',
		 action: function(elm, d, i) {
		     let selection = d3.select(elm);
		     let terminals = self.model.getTerminals(selection.data());
		     terminals.forEach(function (terminal) {
			 terminal.rotation = terminal.rotation + 90;
		     });
		     d.rotation = d.rotation + 90;
		     self.forceTick(selection);
		 }
	     },
	     {
		 title: 'Delete',
		 action: function(elm, d, i) {
		     let selection = d3.select(elm);
		     let terminals = self.model.getTerminals(selection.data());
		     let links = self.edges.filter(el => selection.data().indexOf(el.source) > -1 || terminals.indexOf(el.target) > -1);
		     links.forEach(function (link) {
			 let graphicEdge = self.edgeGraphic.get(link);
			 d3.select(graphicEdge).remove();
		     });
		     selection.remove();
		 }
	     }
	 ]
	 
	 let selection = d3.select("svg").select("g." + types).selectAll("g." + type)
			   .data(data, function(d) {
			       return d.attributes[0].value;
			   })
			   .enter()
			   .append("g")
			   .attr("class", type)
			   .attr("id", function(d) {
			       return d.attributes[0].value;
			   })
			   .on("contextmenu", d3.contextMenu(menu));
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
			let name = self.model.getAttribute(d, "cim:IdentifiedObject.name");
			if (typeof(name) !== "undefined") {
			    return name.innerHTML;
			}
			return "";
		    });
	 return aclineEnter;
     }

     // Draw all Breakers
     drawBreakers(allBreakers) {
	 return this.drawSwitches(allBreakers, "Breaker", "green");
     }

     // Draw all Disconnectors
     drawDisconnectors(allDisconnectors) {
	 return this.drawSwitches(allDisconnectors, "Disconnector", "blue");
     }

     // Draw all load break switches
     drawLoadBreakSwitches(allLoadBreakSwitches) {
	 return this.drawSwitches(allLoadBreakSwitches, "LoadBreakSwitch", "black");
     }

     drawSwitches(allSwitches, type, color) {
	 let line = d3.svg.line()
		      .x(function(d) { return d.x; })
		      .y(function(d) { return d.y; })
		      .interpolate("linear");

	 let swEnter = this.createSelection(type, allSwitches);
	 
	 swEnter.append("path")
		.attr("d", function(d) {
		    return line([{x:-9, y:6, seq:1},
				 {x:9, y:6, seq:2},
				 {x:9, y:24, seq:3},
				 {x:-9, y:24, seq:4},
				 {x:-9, y:6, seq:5}]);		    
		})
		.attr("fill", function(d) {
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
			return "white";
		    } else {
			return "black";
		    }
		})
		.attr("stroke", color)
		.attr("stroke-width", 2);
	 swEnter.append("text")
		.style("text-anchor", "end")
		.attr("font-size", 8)
		.attr("x", function(d) {
		    let lineData = d3.select(this.parentNode).datum().lineData;
		    let end = lineData[lineData.length-1];
		    return ((lineData[0].x + end.x)/2) - 10;
		})
		.attr("y", function(d) {
		    let lineData = d3.select(this.parentNode).datum().lineData;
		    let end = lineData[lineData.length-1];
		    return ((lineData[0].y + end.y)/2) + 15;
		})
		.text(function(d) {
		    let name = self.model.getAttribute(d, "cim:IdentifiedObject.name");
		    if (typeof(name) !== "undefined") {
			return name.innerHTML;
		    }
		    return "";
		});
	 return swEnter;
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
		       let name = self.model.getAttribute(d, "cim:IdentifiedObject.name");
		       if (typeof(name) !== "undefined") {
			   return name.innerHTML;
		       }
		       return "";
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
			let name = self.model.getAttribute(d, "cim:IdentifiedObject.name");
			if (typeof(name) !== "undefined") {
			    return name.innerHTML;
			}
			return "";
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
		       let name = self.model.getAttribute(d, "cim:IdentifiedObject.name");
		       if (typeof(name) !== "undefined") {
			   return name.innerHTML;
		       }
		       return "";
		   });
	 return trafoEnter;
     }

     // Draw an EquipmentContainer
     drawEquipmentContainer(container) {
	 let type = container.localName;
	 let substations = d3.select("svg").select("g").select("g." + type + "s");
	 if (substations.empty()) {
	     substations = d3.select("svg").select("g").append("g")
			.attr("class", type + "s");
	 }

	 let selection = substations.selectAll("g#" + container.attributes[0].value);
	 if (selection.empty()) {
	     selection = substations.selectAll("g#" + container.attributes[0].value)
				    .data([container], function(d) {
				        return d.attributes[0].value;
				    })
				    .enter()
	                            .append("g")
	                            .attr("class", type)
	                            .attr("id", function(d) {
					self.calculateContainer(d);
					return d.attributes[0].value;
				    });

	     	 selection.append("rect")
		  .attr("x", function(d) {
		      return d.x;
		  })
		  .attr("y", function(d) {
		      return d.y;
		  })
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
		  .attr("x", function(d) {
		      return d.x;
		  })
		  .attr("y", function(d) {
		      return d.y;
		  })
		  .text(function(d) {
		      let name = self.model.getAttribute(d, "cim:IdentifiedObject.name");
		      if (typeof(name) !== "undefined") {
			   return name.innerHTML;
		      }
		      return "";
		  });
	 } 
     }

     highlightEquipments(d) {
	 let allChildNodes = [];
	 let equipments = self.model.getGraph([d], "EquipmentContainer.Equipments", "Equipment.EquipmentContainer").map(el => el.source);
	 for (let equipment of equipments) {
	     let childNode = d3.select("svg").select("#" + equipment.attributes[0].value);
	     childNode.select("path").attr("stroke-width", 30);
	     allChildNodes.push(childNode.node());
	 }
	 d.x = d3.min(allChildNodes.filter(el => el !== null), function(dd) {return dd.getBBox().x+d3.select(dd).datum().x}) - 30;
	 d.y = d3.min(allChildNodes.filter(el => el !== null), function(dd) {return dd.getBBox().y+d3.select(dd).datum().y}) - 30;    
     }

     calculateContainer(d) {
	 let allChildNodes = [];	 
	 let equipments = self.model.getGraph([d], "EquipmentContainer.Equipments", "Equipment.EquipmentContainer").map(el => el.source);
	 for (let equipment of equipments) {
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
     }

     createTerminals(eqSelection, heigth) {
	 if (arguments.length === 1) {
	     heigth = 30;
	 }
	 let termSelection = eqSelection.selectAll("g")
					.data(function(d) {
					    return self.model.getTerminals([d]);
					})
					.enter()
					.append("g")
					.attr("id", function(d, i) {
					    let cn = self.model.getGraph([d], "Terminal.ConnectivityNode", "ConnectivityNode.Terminals").map(el => el.source)[0];
					    let lineData = d3.select(this.parentNode).datum().lineData;
					    let start = lineData[0];
					    let end = lineData[lineData.length-1];
					    let eqX = d3.select(this.parentNode).datum().x;
					    let eqY = d3.select(this.parentNode).datum().y;
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
					    d.rotation = d3.select(this.parentNode).datum().rotation;
					    self.nodes.push(d);
					    if (typeof(cn) !== "undefined") {
						let newEdge = {source: cn, target: d};
						self.edges.push(newEdge); // add a new edge to the connectivity graph
						self.createEdges([newEdge]);
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
			  return d3.select(this.parentNode).datum().x-d3.select(this.parentNode.parentNode).datum().x; 
		      })
		      .attr("cy", function(d, i) {
			  return d3.select(this.parentNode).datum().y-d3.select(this.parentNode.parentNode).datum().y;
		      });

	 function checkTerminals(terminals, d, cn, eqX, eqY, start, end) {
	     let otherTerm = terminals.filter(term => term !== d)[0];
	     // we need to check if the other terminal must be moved
	     let otherCn = self.model.getGraph([otherTerm], "Terminal.ConnectivityNode", "ConnectivityNode.Terminals").map(el => el.source)[0];
	     let termToChange = otherTerm;
	     let cnToChange = otherCn;
	     if(typeof(otherCn) !== "undefined") {
		 let equipments = self.model.getEquipments(otherCn);
		 if (equipments.length > 1) {
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

	 termSelection.each(function(d) {
	     self.termGraphic.set(d, this);
	 });
	 
	 return termSelection;
     }

     // Draw all ConnectivityNodes
     drawConnectivityNodes(allConnectivityNodes) {
	 let line = d3.svg.line()
		      .x(function(d) { return d.x; })
		      .y(function(d) { return d.y; })
		      .interpolate("linear");
	 let self = this;

	 if (d3.select("svg").select("g.ConnectivityNodes").empty()) {
	     d3.select("svg").select("g").append("g")
	       .attr("class", "ConnectivityNodes");
	 }
	 
	 let cnUpdate = d3.select("svg").select("g.ConnectivityNodes").selectAll("g.ConnectivityNode")
			 .data(allConnectivityNodes, function (d) {
			     d.rotation = 0;
			     let lineData = [];
			     let xcalc = 0;
			     let ycalc = 0;
			     let equipments = self.model.getEquipments(d);
			     // let's try to get a busbar section
			     let busbarSection = equipments.filter(el => el.localName === "BusbarSection")[0];
			     let dobjs = self.model.getDiagramObjectGraph([d]).map(el => el.target);
			     if (dobjs.length === 0) {
				 if (typeof(busbarSection) != "undefined") {
				     dobjs = self.model.getDiagramObjectGraph([busbarSection]).map(el => el.target);
				     let rotation = self.model.getAttribute(dobjs[0], "cim:DiagramObject.rotation");
				     if (typeof(rotation) !== "undefined") {
					 d.rotation = parseInt(rotation.innerHTML);
				     }
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
				 for (let point in points) {
				     let seqNum = self.model.getAttribute(points[point], "cim:DiagramObjectPoint.sequenceNumber");
				     if (typeof(seqNum) === "undefined") {
					 seqNum = 0;
				     } else {
					 seqNum = parseInt(seqNum.innerHTML);
				     }
				     lineData.push({
					 x: parseInt(self.model.getAttribute(points[point], "cim:DiagramObjectPoint.xPosition").innerHTML),
					 y: parseInt(self.model.getAttribute(points[point], "cim:DiagramObjectPoint.yPosition").innerHTML),
					 seq: seqNum
				     });
				 }
				 lineData.sort(function(a, b){return a.seq-b.seq});
				 d.x = lineData[0].x;
				 d.y = lineData[0].y;
				 // relative values
				 for (let point of lineData) {
				     point.x = point.x - d.x;
				     point.y = point.y - d.y;
				 }
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
			 });

	 let cnEnter = cnUpdate.enter()
			 .append("g")
			 .attr("class", "ConnectivityNode")
			 .attr("id", function(d) {
			     return d.attributes[0].value;
			 });

	 cnUpdate.select("path").attr("d", function(d) {
	     return line(d3.select(this.parentNode).datum().lineData);
	 });
	 
	 cnEnter.append("path")
		.attr("d", function(d) {
		    return line(d3.select(this.parentNode).datum().lineData);
		})
		.attr("stroke", "black")
		.attr("stroke-width", 2);

	 cnEnter.append("text")
	        .style("text-anchor", "end")
	        .attr("font-size", 8)
	        .attr("x", function(d) {
		    let lineData = d3.select(this.parentNode).datum().lineData;
		    let end = lineData[lineData.length-1];
		    return ((lineData[0].x + end.x)/2) - 10;
		})
	        .attr("y", function(d) {
		    let lineData = d3.select(this.parentNode).datum().lineData;
		    let end = lineData[lineData.length-1];
		    return ((lineData[0].y + end.y)/2) + 15;
		})
	        .text(function(d) {
		    let equipments = self.model.getEquipments(d);
		    // let's try to get a busbar section
		    let busbarSection = equipments.filter(el => el.localName === "BusbarSection")[0];
		    if (typeof(busbarSection) != "undefined") {    
			let name = self.model.getAttribute(busbarSection, "cim:IdentifiedObject.name");
			if (typeof(name) !== "undefined") {
			    return name.innerHTML;
			}
		    }
		    return "";
		});
	 
	 cnEnter.each(function(d) {
	     self.nodeGraphic.set(d, this);
	 });
	 return cnEnter;
     }

     hover(hoverD) {
	 d3.select("svg").selectAll("svg > g > g:not(.edges) > g")
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
	 // clear substations and lines
	 d3.select("svg").selectAll("svg > g > g.Substations > g").remove();
	 d3.select("svg").selectAll("svg > g > g.ACLineSegments > g > path").attr("stroke-width", 2);
	 let hoverD = this.model.getObject(uuid);
	 // handle busbars
	 if (hoverD.nodeName === "cim:BusbarSection") {
	     let terminal = self.model.getConductingEquipmentGraph([hoverD]).map(el => el.target)[0];
	     let cn = self.model.getGraph([terminal], "Terminal.ConnectivityNode", "ConnectivityNode.Terminals").map(el => el.source)[0];
	     hoverD = cn;
	 }

	 // handle substations and lines
	 if (hoverD.nodeName === "cim:Substation") {
	     this.drawEquipmentContainer(hoverD);
	 }
	 if (hoverD.nodeName === "cim:Line") {
	     this.highlightEquipments(hoverD);
	 }
	 
	 if (typeof(hoverD.x) === "undefined" || typeof(hoverD.y) === "undefined") {
	     return;
	 }
	 
	 let svgWidth = parseInt(d3.select("svg").style("width"));
	 let svgHeight = parseInt(d3.select("svg").style("height"));
	 let newZoom = 1;
	 let newx = -hoverD.x*newZoom + (svgWidth/2);
	 let newy = -hoverD.y*newZoom + (svgHeight/2);
	 d3.selectAll("svg").select("g").attr("transform", "translate(" + [newx, newy] + ")scale(" + newZoom + ")");
	 self.trigger("transform");
	 self.hover(hoverD);
     }

     /** Calculate the closest point on a given busbar relative to a given point (a terminal) */
     closestPoint(source, point) {
	 let pathNode = d3.select(self.nodeGraphic.get(source)).select("path").node();
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
	 for (let scanLength = 0; scanLength <= pathLength; scanLength += precision) {
	     let scan = pathNode.getPointAtLength(scanLength);
	     if (source.rotation > 0) {
		 scan = self.rotate(scan, source.rotation);
	     }
	     let scanDistance = distance2(scan);
	     if (scanDistance < bestDistance) {
		 best = scan;
		 bestLength = scanLength;
		 bestDistance = scanDistance;
	     }
	 }

	 // binary search for precise estimate
	 precision *= .5;
	 while (precision > .5) {
	     let beforeLength = bestLength - precision;
	     if (beforeLength >= 0) {
		 let before = pathNode.getPointAtLength(beforeLength);
		 if (source.rotation > 0) {
		     before = self.rotate(before, source.rotation);
		 }
		 let beforeDistance = distance2(before);
		 
		 if (beforeDistance < bestDistance) {
		     best = before;
		     bestLength = beforeLength;
		     bestDistance = beforeDistance;
		     continue;
		 }
	     } 
	     let afterLength = bestLength + precision;
	     if (afterLength <= pathLength) {
		 let after = pathNode.getPointAtLength(afterLength);
		 if (source.rotation > 0) {
		     after = self.rotate(after, source.rotation);
		 }
		 let afterDistance = distance2(after);
		 if (afterDistance < bestDistance) {
		     best = after;
		     bestLength = afterLength;
		     bestDistance = afterDistance;
		     continue;
		 }
	     }
	     precision *= .5;	     
	 }

	 best = [best.x, best.y];
	 return best;

	 function distance2(p) {
	     let dx = p.x + source.x - point.x, 
		 dy = p.y + source.y - point.y; 
	     return dx * dx + dy * dy;
	 }	 
     }

     /** Update the diagram based on x and y values of data */
     forceTick(selection) {
	 if (arguments.length === 0 || selection.alpha !== undefined) {
	     // update everything
	     selection = d3.select("svg").selectAll("svg > g > g:not(.edges) > g");
	 }
	     
	 let transform = d3.transform(d3.select("svg").select("g").attr("transform"));
	 let xoffset = transform.translate[0];
	 let yoffset = transform.translate[1];
	 let svgZoom = transform.scale[0];
	 updateElements(selection);

	 if (arguments.length === 1) {
	     let terminals = self.model.getTerminals(selection.data());
	     let links = self.edges.filter(el => selection.data().indexOf(el.source) > -1 || terminals.indexOf(el.target) > -1);
	     self.updateEdges(xoffset, yoffset, svgZoom, links);
	 } else {
	     self.updateEdges(xoffset, yoffset, svgZoom);
	 }
	 
	 function updateElements(selection) {
	     selection.attr("transform", function (d) {
		 self.model.updateActiveDiagram(d, d.lineData);
		 return "translate("+d.x+","+d.y+") rotate("+d.rotation+")";
	     }).selectAll("g")
		      .attr("id", function(d, i) {
			  d.x = d3.select(this.parentNode).datum().x + parseInt(d3.select(this.firstChild).attr("cx"));
			  d.y = d3.select(this.parentNode).datum().y + parseInt(d3.select(this.firstChild).attr("cy"));
			  return d.attributes[0].value;
		      });
	 };
     }

     addToDiagram(object) {
	 let m = d3.mouse(d3.select("svg").node());
	 let transform = d3.transform(d3.select("svg").select("g").attr("transform"));
	 let xoffset = transform.translate[0];
	 let yoffset = transform.translate[1];
	 let svgZoom = transform.scale[0];
	 object.x = (m[0] - transform.translate[0]) / svgZoom;
	 object.px = object.x;
	 object.y = (m[1] - transform.translate[1]) / svgZoom;
	 object.py = object.y;
	 
	 let lineData = [{x: object.x, y: object.y, seq:1}]; // always OK except acline and busbar
	 if (object.nodeName === "cim:ACLineSegment") {
	     lineData.push({x: object.x + 150, y: object.y, seq:2});
	     self.model.addToActiveDiagram(object, lineData);
	     let aclineEnter = self.drawACLines([object]);
	     handleTerminals(aclineEnter);
	     aclineEnter.on("mouseover.hover", self.hover)
			.on("mouseout", mouseOut);
	 }
	 if (object.nodeName === "cim:Breaker") {
	     self.model.addToActiveDiagram(object, lineData);
	     let breakerEnter = self.drawBreakers([object]);
	     handleTerminals(breakerEnter);
	 }
	 if (object.nodeName === "cim:Disconnector") {
	     self.model.addToActiveDiagram(object, lineData);
	     let discEnter = self.drawDisconnectors([object]);
	     handleTerminals(discEnter);
	 }
         if (object.nodeName === "cim:LoadBreakSwitch") {
	     self.model.addToActiveDiagram(object, lineData);
	     let lbsEnter = self.drawLoadBreakSwitches([object]);
	     handleTerminals(lbsEnter);
	 }
	 if (object.nodeName === "cim:EnergySource" || object.nodeName === "cim:SynchronousMachine") {
	     self.model.addToActiveDiagram(object, lineData);
	     let ensrcEnter = self.drawEnergySources([object]);
	     handleTerminals(ensrcEnter);
	 }
	 if (object.nodeName === "cim:EnergyConsumer"|| object.nodeName === "cim:ConformLoad" || object.nodeName === "cim:NonConformLoad") {
	     self.model.addToActiveDiagram(object, lineData);
	     let enconsEnter = self.drawEnergyConsumers([object]);
	     handleTerminals(enconsEnter);
	 }
	 if (object.nodeName === "cim:PowerTransformer") {
	     self.model.addToActiveDiagram(object, lineData);
	     let trafoEnter = self.drawPowerTransformers([object]);
	     handleTerminals(trafoEnter);
	 }
	 // handle busbars
	 if (object.nodeName === "cim:BusbarSection") {
	     lineData.push({x: object.x + 150, y: object.y, seq:2});
	     self.model.addToActiveDiagram(object, lineData);
	     let terminal = self.model.getGraph([object], "ConductingEquipment.Terminals", "Terminal.ConductingEquipment", true).map(el => el.target);
	     let cn = self.model.getGraph(terminal, "Terminal.ConnectivityNode", "ConnectivityNode.Terminals").map(el => el.source)[0];
	     self.drawConnectivityNodes([cn]);
	     self.edges.forEach(function (link) {
		 link.p = self.closestPoint(link.source, link.target);
	     });
	 }
	 
	 self.forceTick();

	 function handleTerminals(selection) {
	     let terminals = self.model.getTerminals([object]);
	     for (let terminal of terminals) {
		 let cn = self.model.getGraph([terminal], "Terminal.ConnectivityNode", "ConnectivityNode.Terminals").map(el => el.source)[0];
		 if (typeof(cn) !== "undefined") {
		     self.drawConnectivityNodes([cn]);
		 }
	     }
	     self.createTerminals(selection);
	 }

	 function mouseOut(d) {
	     d3.select(this).selectAll("rect").remove();	     
	 }
     }

     /** Update the given links. If links is absent, update all links */     
     updateEdges(xoffset, yoffset, svgZoom, links) {
	 let line = d3.svg.line()
		      .x(function(d) { return d.x; })
		      .y(function(d) { return d.y; })
		      .interpolate("linear");
	 if (arguments.length === 3) {
	     links = self.edges;
	 }
	 links.forEach(function (link) {
	     let graphicEdge = self.edgeGraphic.get(link);
	     d3.select(graphicEdge)
	       .select("path")
	       .attr("d", function(d) {
		   let tarRot = {x: d.target.x, y: d.target.y};
		   if (link.target.rotation > 0) {
		       tarRot = rotateTerm(link.target);
		   }
		   d.p = self.closestPoint(d.source, tarRot);
		   let lineData = [{x: d.p[0] + d.source.x, y: d.p[1] + d.source.y}, tarRot];
		   return line(lineData);
	       });
	 });

	 function rotateTerm(term) {
	     let graphicTerm = self.termGraphic.get(term);
	     let circle = d3.select(graphicTerm).select("circle");
	     let cx = circle.attr("cx");
	     let cy = circle.attr("cy");
	     let baseX = term.x - cx;
	     let baseY = term.y - cy;
	     let cRot = self.rotate({x: cx, y: cy}, term.rotation);
	     let newX = baseX + cRot.x;
	     let newY = baseY + cRot.y;
	     return {x: newX, y: newY};
	 }	 
     }

     /** rotate a point of a given amount (in degrees) */
     rotate(p, rotation) {
	 let svgroot = d3.select("svg").node();
	 let pt = svgroot.createSVGPoint();
	 pt.x = p.x;
	 pt.y = p.y;
	 if (rotation === 0) {
	     return pt;
	 }
	 let rotate = svgroot.createSVGTransform();
	 rotate.setRotate(rotation,0,0);
	 return pt.matrixTransform(rotate.matrix);
     }
    </script>

</cimDiagram>

