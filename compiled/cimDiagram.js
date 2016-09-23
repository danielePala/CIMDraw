riot.tag2('cimdiagram', '<cimdiagramcontrols model="{model}"></cimDiagramControls> <div class="app-diagram"> <svg> <path stroke-width="1" stroke="black" fill="none"></path> <circle r="3.5" cy="-10" cx="-10"></circle> <g> <g class="edges"></g> </g> </svg> </div>', '.app-diagram { max-height: 800px; } path.domain { fill: none; stroke: black; } g.tick > line { stroke: black; stroke-dasharray: 1 5; } svg { width: 1800px; height: 800px; } .tooltip-inner { max-width: 250px; width: 250px; }', '', function(opts) {
     "use strict";
     let self = this;
     self.model = opts.model;

     self.parent.on("showDiagram", function(file, name, element) {
	 self.parent.trigger("rendering");
	 if (decodeURI(name) !== self.diagramName) {
             self.render(name);
	 }
         if (typeof(element) !== "undefined") {
             self.moveTo(element);
         }
	 self.parent.trigger("rendered");
     });

     self.on("mount", function() {

	 let xScale = d3.scaleLinear().domain([0, 1800]).range([0,1800]);
	 let yScale = d3.scaleLinear().domain([0, 800]).range([0, 800]);
	 let yAxis = d3.axisRight(yScale);
	 let xAxis = d3.axisBottom(xScale);
	 d3.select("svg").append("g").attr("id", "yAxisG").call(yAxis);
	 d3.select("svg").append("g").attr("id", "xAxisG").call(xAxis);
     });

     self.on("transform", function() {
	 let transform = d3.zoomTransform(d3.select("svg").node());
	 let newx = transform.x;
	 let newy = transform.y;
	 let newZoom = transform.k;
	 let svgWidth = parseInt(d3.select("svg").style("width"));
	 let svgHeight = parseInt(d3.select("svg").style("height"));

	 let xScale = d3.scaleLinear().domain([-newx/newZoom, (svgWidth-newx)/newZoom]).range([0, svgWidth]);
	 let yScale = d3.scaleLinear().domain([-newy/newZoom, (svgHeight-newy)/newZoom]).range([0, svgHeight]);
	 let yAxis = d3.axisRight(yScale);
	 let xAxis = d3.axisBottom(xScale);
	 d3.select("svg").select("#yAxisG").call(yAxis);
	 d3.select("svg").select("#xAxisG").call(xAxis);
     });

     self.model.on("createObject", function(object) {
	 self.addToDiagram(object);
     });

     self.model.on("setAttribute", function(object, attrName, value) {
	 if (attrName === "cim:IdentifiedObject.name") {
	     let type = object.localName;
	     let uuid = object.attributes.getNamedItem("rdf:ID").value;

	     if (object.nodeName === "cim:BusbarSection") {
		 let terminal = self.model.getConductingEquipmentGraph([object]).map(el => el.target)[0];
		 let cn = self.model.getGraph([terminal], "Terminal.ConnectivityNode", "ConnectivityNode.Terminals").map(el => el.source)[0];
		 type = cn.localName;
		 uuid = cn.attributes.getNamedItem("rdf:ID").value;
	     }
	     let types = d3.select("svg").selectAll("svg > g > g." + type + "s");
	     let target = types.select("#" + uuid);
	     target.select("text").html(value);
	 }
     });

     self.model.on("setEdge", function(cn, term) {
	 let edgeToChange = d3.select("svg").selectAll("svg > g > g.edges > g").data().filter(el => el.target === term)[0];
	 if (typeof(edgeToChange) === "undefined") {
	     edgeToChange = {source: cn, target: term};
	     self.createEdges([edgeToChange]);
	 } else {
	     edgeToChange.source = cn;
	 }
	 if (typeof(cn.lineData) === "undefined") {
	     self.drawConnectivityNodes([cn]);
	 }
	 self.forceTick();
     });

     this.render = function(diagramName) {

	 d3.select("svg").select("g").selectAll("g:not(.edges)").remove();

	 self.model.selectDiagram(decodeURI(diagramName));
	 self.diagramName = decodeURI(diagramName);
	 let allConnectivityNodes = self.model.getConnectivityNodes();
	 console.log("[" + Date.now() + "] extracted connectivity nodes");
	 let allACLines = self.model.getGraphicObjects("cim:ACLineSegment");
	 console.log("[" + Date.now() + "] extracted acLines");
	 let allBreakers = self.model.getGraphicObjects("cim:Breaker");
	 console.log("[" + Date.now() + "] extracted breakers");
	 let allDisconnectors = self.model.getGraphicObjects("cim:Disconnector");
	 console.log("[" + Date.now() + "] extracted disconnectors");
	 let allLoadBreakSwitches = self.model.getGraphicObjects("cim:LoadBreakSwitch");
	 console.log("[" + Date.now() + "] extracted load break switches");
	 let allJumpers = self.model.getGraphicObjects("cim:Jumper");
	 console.log("[" + Date.now() + "] extracted jumpers");
	 let allEnergySources = self.model.getGraphicObjects("cim:EnergySource")
	     .concat(self.model.getGraphicObjects("cim:SynchronousMachine"));
	 console.log("[" + Date.now() + "] extracted energy sources");
	 let allEnergyConsumers = self.model.getGraphicObjects("cim:EnergyConsumer")
				      .concat(self.model.getGraphicObjects("cim:ConformLoad"))
				      .concat(self.model.getGraphicObjects("cim:NonConformLoad"));
	 console.log("[" + Date.now() + "] extracted energy consumers");
	 let allPowerTransformers = self.model.getGraphicObjects("cim:PowerTransformer");
	 console.log("[" + Date.now() + "] extracted power transformers");
	 let allBusbarSections = self.model.getGraphicObjects("cim:BusbarSection");
	 console.log("[" + Date.now() + "] extracted busbarSections");

	 let aclineEnter = self.drawACLines(allACLines);
	 console.log("[" + Date.now() + "] drawn acLines");

	 let breakerEnter = self.drawBreakers(allBreakers);
	 console.log("[" + Date.now() + "] drawn breakers");

	 let discEnter = self.drawDisconnectors(allDisconnectors);
	 console.log("[" + Date.now() + "] drawn disconnectors");

	 let lbsEnter = self.drawLoadBreakSwitches(allLoadBreakSwitches);
	 console.log("[" + Date.now() + "] drawn load break switches");

	 let jumpsEnter = self.drawJumpers(allJumpers);
	 console.log("[" + Date.now() + "] drawn jumpers");

	 let ensrcEnter = self.drawEnergySources(allEnergySources);
	 console.log("[" + Date.now() + "] drawn energy sources");

	 let enconsEnter = self.drawEnergyConsumers(allEnergyConsumers);
	 console.log("[" + Date.now() + "] drawn energy consumers");

	 let trafoEnter = self.drawPowerTransformers(allPowerTransformers);
	 console.log("[" + Date.now() + "] drawn power transformers");

	 let cnEnter = self.drawConnectivityNodes(allConnectivityNodes);
	 console.log("[" + Date.now() + "] drawn connectivity nodes");

	 let termSelection = this.createTerminals(aclineEnter);
	 this.createMeasurements(termSelection);
	 console.log("[" + Date.now() + "] drawn acline terminals");

	 this.createTerminals(breakerEnter);
	 console.log("[" + Date.now() + "] drawn breaker terminals");

	 this.createTerminals(discEnter);
	 console.log("[" + Date.now() + "] drawn disconnector terminals");

	 this.createTerminals(lbsEnter);
	 console.log("[" + Date.now() + "] drawn load break switch terminals");

	 this.createTerminals(jumpsEnter);
	 console.log("[" + Date.now() + "] drawn jumper terminals");

	 termSelection = this.createTerminals(ensrcEnter, 50);
	 this.createMeasurements(termSelection);
	 console.log("[" + Date.now() + "] drawn energy source terminals");

	 termSelection = this.createTerminals(enconsEnter);
	 this.createMeasurements(termSelection);
	 console.log("[" + Date.now() + "] drawn energy consumer terminals");

	 termSelection = this.createTerminals(trafoEnter, 50);
	 this.createMeasurements(termSelection);
	 console.log("[" + Date.now() + "] drawn power transformer terminals");

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
		 self.moveTo(d.attributes.getNamedItem("rdf:ID").value);
	     } else {

		 self.addToDiagram(d);
	     }
	 }

	 function mouseOut(d) {
	     d3.select(this).selectAll("rect").remove();
	 }

	 self.forceTick();
	 self.trigger("render");
     }.bind(this)

     this.createEdges = function(edges) {
	 d3.select("svg > g > g.edges")
	   .append("g")
	   .data(edges)
	   .attr("class", "edge")
	   .attr("id", function(d) {
	       return d.source.attributes.getNamedItem("rdf:ID").value+d.target.attributes.getNamedItem("rdf:ID").value;
	   })
	   .append("path")
	   .attr("fill", "none")
	   .attr("stroke", "black")
	   .attr("stroke-width", 1);
     }.bind(this)

     this.createMeasurements = function(termSelection) {
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
		     let value = "n.a."
		     if (typeof(valueObject) !== "undefined") {
			 if(typeof(self.model.getAttribute(valueObject, "cim:AnalogValue.value")) !== "undefined") {
			     value = self.model.getAttribute(valueObject, "cim:AnalogValue.value").textContent;
			 }
		     }
		     actLine = actLine + type;
		     actLine = actLine + " (phase: " + phases + ")";
		     actLine = actLine + ": ";
		     actLine = actLine + parseFloat(value).toFixed(2);
		     actLine = actLine + " [" + unitMultiplier + unitSymbol + "]";
		     actLine = actLine + "<br>";
		     tooltipLines.push(actLine);
		 }
		 tooltipLines.sort();
		 for (let i in tooltipLines) {
		     tooltip = tooltip + tooltipLines[i];
		 }

		 d3.select(this)
		   .select("circle")
		   .style("fill","white")
		   .style("stroke", "black");
	     }

	     let svs = self.model.getGraph([d], "Terminal.SvPowerFlow", "SvPowerFlow.Terminal").map(el => el.source);
	     if (svs.length > 0) {
		 if (measurements.length > 0) {
		     tooltip = tooltip + "<br>";
		 }
		 tooltip = tooltip + "<b>Power flow results</b><br><br>";
		 for (let sv of svs) {
		     let p = 0.0, q = 0.0;
		     if (typeof(self.model.getAttribute(sv, "cim:SvPowerFlow.p")) !== "undefined") {
			 p = self.model.getAttribute(sv, "cim:SvPowerFlow.p").textContent;
		     }
		     if (typeof(self.model.getAttribute(sv, "cim:SvPowerFlow.q")) !== "undefined") {
			 q = self.model.getAttribute(sv, "cim:SvPowerFlow.q").textContent;
		     }
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
     }.bind(this)

     this.createSelection = function(type, data) {
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
		     let seqNum = 1;
		     let seqAttr = self.model.getAttribute(points[point], "cim:DiagramObjectPoint.sequenceNumber");
		     if (typeof(seqAttr) !== "undefined") {
			 seqNum = parseInt(seqAttr.innerHTML);
		     }
		     lineData.push({
			 x: parseInt(self.model.getAttribute(points[point], "cim:DiagramObjectPoint.xPosition").innerHTML) - d.x,
			 y: parseInt(self.model.getAttribute(points[point], "cim:DiagramObjectPoint.yPosition").innerHTML) - d.y,
			 seq: seqNum
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

	 let menu = [
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
		     d3.select("svg").selectAll("svg > g > g.edges > g").filter(function(d) {
			 return selection.data().indexOf(d.source) > -1 || terminals.indexOf(d.target) > -1;
		     }).remove();
		     selection.remove();

		     self.model.deleteObject(selection.datum());
		 }
	     }
	 ];

	 let selection = d3.select("svg").select("g." + types).selectAll("g." + type)
			   .data(data, function(d) {
			       return d.attributes.getNamedItem("rdf:ID").value;
			   })
			   .enter()
			   .append("g")
			   .attr("class", type)
			   .attr("id", function(d) {
			       return d.attributes.getNamedItem("rdf:ID").value;
			   })
			   .on("contextmenu", d3.contextMenu(menu));
	 return selection;
     }.bind(this)

     this.drawACLines = function(allACLines) {
	 let line = d3.line()
		      .x(function(d) { return d.x; })
		      .y(function(d) { return d.y; });

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
     }.bind(this)

     this.drawBreakers = function(allBreakers) {
	 return this.drawSwitches(allBreakers, "Breaker", "green");
     }.bind(this)

     this.drawDisconnectors = function(allDisconnectors) {
	 return this.drawSwitches(allDisconnectors, "Disconnector", "blue");
     }.bind(this)

     this.drawLoadBreakSwitches = function(allLoadBreakSwitches) {
	 return this.drawSwitches(allLoadBreakSwitches, "LoadBreakSwitch", "black");
     }.bind(this)

     this.drawJumpers = function(allJumpers) {
	 return this.drawSwitches(allJumpers, "Jumper", "steelblue");
     }.bind(this)

     this.drawSwitches = function(allSwitches, type, color) {
	 let line = d3.line()
		      .x(function(d) { return d.x; })
		      .y(function(d) { return d.y; });

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
		    let value = "0";

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
     }.bind(this)

     this.drawEnergySources = function(allEnergySources) {
	 let ensrcEnter = this.createSelection("EnergySource", allEnergySources);

	 ensrcEnter.append("circle")
		   .attr("r", 25)
		   .attr("cx", 0)
		   .attr("cy", -25)
		   .attr("fill", "white")
		   .attr("stroke", "blue")
		   .attr("stroke-width", 4);
	 ensrcEnter.append("text")
		   .style("text-anchor", "middle")
		   .attr("font-size", 8)
		   .attr("x", 0)
		   .attr("y", -60)
		   .text(function(d) {
		       let name = self.model.getAttribute(d, "cim:IdentifiedObject.name");
		       if (typeof(name) !== "undefined") {
			   return name.innerHTML;
		       }
		       return "";
		   });
	 ensrcEnter.append("text")
	           .style("text-anchor", "middle")
	           .attr("font-size", 64)
	           .attr("x", 0)
	           .attr("y", -4)
	           .text("~");
	 return ensrcEnter;
     }.bind(this)

     this.drawEnergyConsumers = function(allEnergyConsumers) {
	 let line = d3.line()
		      .x(function(d) { return d.x; })
		      .y(function(d) { return d.y; });
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
     }.bind(this)

     this.drawPowerTransformers = function(allPowerTransformers) {
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
     }.bind(this)

     this.drawEquipmentContainer = function(container) {
	 let type = container.localName;
	 let substations = d3.select("svg").select("g").select("g." + type + "s");
	 if (substations.empty()) {
	     substations = d3.select("svg").select("g").append("g")
			.attr("class", type + "s");
	 }

	 let selection = substations.selectAll("g#" + container.attributes.getNamedItem("rdf:ID").value);
	 if (selection.empty()) {
	     selection = substations.selectAll("g#" + container.attributes.getNamedItem("rdf:ID").value)
				    .data([container], function(d) {
				        return d.attributes.getNamedItem("rdf:ID").value;
				    })
				    .enter()
	                            .append("g")
	                            .attr("class", type)
	                            .attr("id", function(d) {
					self.calculateContainer(d);
					return d.attributes.getNamedItem("rdf:ID").value;
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
     }.bind(this)

     this.highlightEquipments = function(d) {
	 let allChildNodes = [];
	 let equipments = self.model.getGraph([d], "EquipmentContainer.Equipments", "Equipment.EquipmentContainer").map(el => el.source);
	 for (let equipment of equipments) {
	     let childNode = d3.select("svg").select("#" + equipment.attributes.getNamedItem("rdf:ID").value);
	     childNode.select("path").attr("stroke-width", 30);
	     allChildNodes.push(childNode.node());
	 }
	 d.x = d3.min(allChildNodes.filter(el => el !== null), function(dd) {return dd.getBBox().x+d3.select(dd).datum().x}) - 30;
	 d.y = d3.min(allChildNodes.filter(el => el !== null), function(dd) {return dd.getBBox().y+d3.select(dd).datum().y}) - 30;
     }.bind(this)

     this.calculateContainer = function(d) {
	 let allChildNodes = [];
	 let equipments = self.model.getGraph([d], "EquipmentContainer.Equipments", "Equipment.EquipmentContainer").map(el => el.source);
	 for (let equipment of equipments) {

	     if (equipment.nodeName === "cim:BusbarSection") {
		 let terminal = self.model.getConductingEquipmentGraph([equipment]).map(el => el.target)[0];
		 if (typeof(terminal) === "undefined") {
		     continue;
		 }
		 let cn = self.model.getGraph([terminal], "Terminal.ConnectivityNode", "ConnectivityNode.Terminals").map(el => el.source)[0];
		 equipment = cn;
	     }
	     allChildNodes.push(d3.select("svg").select("#" + equipment.attributes.getNamedItem("rdf:ID").value).node());
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
     }.bind(this)

     this.createTerminals = function(eqSelection, heigth) {
	 if (arguments.length === 1) {
	     heigth = 30;
	 }
	 let termSelection = eqSelection.selectAll("g")
					.data(function(d) {

					    return self.model.getTerminals([d]);
					})
					.enter()
					.append("g")
					.each(function(d, i) {
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

					    let eqRot = d3.select(this.parentNode).datum().rotation;
					    let terminals = self.model.getTerminals(d3.select(this.parentNode).data());
					    if (typeof(cn) !== "undefined" && terminals.length > 1) {
						let dist1 = 0;
						let dist2 = 0;

						if (eqRot > 0) {
						    let startRot = self.rotate(start, eqRot);
						    let endRot = self.rotate(end, eqRot);
						    dist1 = Math.pow((eqX+startRot.x-cn.x), 2)+Math.pow((eqY+startRot.y-cn.y), 2);
						    dist2 = Math.pow((eqX+endRot.x-cn.x), 2)+Math.pow((eqY+endRot.y-cn.y), 2);
						} else {
						    dist1 = Math.pow((eqX+start.x-cn.x), 2)+Math.pow((eqY+start.y-cn.y), 2);
						    dist2 = Math.pow((eqX+end.x-cn.x), 2)+Math.pow((eqY+end.y-cn.y), 2);
						}

						if (dist2 < dist1) {
						    d.x = eqX + end.x;
						    d.y = eqY + end.y;
						} else {
						    d.x = eqX + start.x;
						    d.y = eqY + start.y;
						}

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
					    if (typeof(cn) !== "undefined" && typeof(cn.lineData) !== "undefined") {
						let newEdge = {source: cn, target: d};
						self.createEdges([newEdge]);
					    }
					})
					.attr("id", function(d) {
					    return d.attributes.getNamedItem("rdf:ID").value;
					})
					.attr("class", function(d) {
					    return d.localName;
					});
	 termSelection.append("circle")
		      .attr("r", 5)
		      .style("fill","black")
		      .attr("cx", function(d, i) {
			  return d3.select(this.parentNode).datum().x - d3.select(this.parentNode.parentNode).datum().x;
		      })
		      .attr("cy", function(d, i) {
			  return d3.select(this.parentNode).datum().y - d3.select(this.parentNode.parentNode).datum().y;
		      });

	 function checkTerminals(terminals, d, cn, eqX, eqY, start, end) {
	     let otherTerm = terminals.filter(term => term !== d)[0];

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
	     }
	 }

	 return termSelection;
     }.bind(this)

     this.drawConnectivityNodes = function(allConnectivityNodes) {
	 let line = d3.line()
		      .x(function(d) { return d.x; })
		      .y(function(d) { return d.y; });

	 for (let d of allConnectivityNodes) {
	     d.x = undefined;
	     d.y = undefined;
	     d.rotation = 0;
	     let lineData = [];
	     let xcalc = 0;
	     let ycalc = 0;

	     let equipments = self.model.getEquipments(d).filter(el => typeof(el.lineData) !== "undefined" || el.localName === "BusbarSection");

	     let busbarSection = equipments.filter(el => el.localName === "BusbarSection")[0];
	     let dobjs = self.model.getDiagramObjectGraph([d]).map(el => el.target);
	     if (dobjs.length === 0) {
		 if (typeof(busbarSection) !== "undefined") {
		     dobjs = self.model.getDiagramObjectGraph([busbarSection]).map(el => el.target);
		     let rotation = self.model.getAttribute(dobjs[0], "cim:DiagramObject.rotation");
		     if (typeof(rotation) !== "undefined") {
			 d.rotation = parseInt(rotation.innerHTML);
		     }
		 } else if (equipments.length > 0) {
		     let points = [];
		     for (let eq of equipments) {
			 let endx = eq.x + eq.lineData[eq.lineData.length-1].x;
			 let endy = eq.y + eq.lineData[eq.lineData.length-1].y;
			 points.push({x: eq.x + eq.lineData[0].x, y: eq.y + eq.lineData[0].y, eq: eq}, {x: endx, y: endy, eq: eq});
		     }
		     let min = Infinity;
		     let p1min = points[0], p2min = points[0];
		     for (let p1 of points) {
			 for (let p2 of points) {
			     if (p1.eq === p2.eq) {
				 continue;
			     }
			     let dist = self.distance2(p1, p2);
			     if (dist < min) {
				 min = dist;
				 p1min = p1;
				 p2min = p2;
			     }
			 }
		     }
		     xcalc = (p1min.x+p2min.x)/2;
		     ycalc = (p1min.y+p2min.y)/2;
		 }
	     } else {
		 let rotation = self.model.getAttribute(dobjs[0], "cim:DiagramObject.rotation");
		 if (typeof(rotation) !== "undefined") {
		     d.rotation = parseInt(rotation.innerHTML);
		 }
	     }
	     let points = self.model.getDiagramObjectPointGraph(dobjs).map(el => el.target);
	     if (points.length > 0) {
		 for (let point of points) {
		     let seqNum = self.model.getAttribute(point, "cim:DiagramObjectPoint.sequenceNumber");
		     if (typeof(seqNum) === "undefined") {
			 seqNum = 1;
		     } else {
			 seqNum = parseInt(seqNum.innerHTML);
		     }
		     lineData.push({
			 x: parseInt(self.model.getAttribute(point, "cim:DiagramObjectPoint.xPosition").innerHTML),
			 y: parseInt(self.model.getAttribute(point, "cim:DiagramObjectPoint.yPosition").innerHTML),
			 seq: seqNum
		     });
		 }
		 lineData.sort(function(a, b){return a.seq-b.seq});
		 d.x = lineData[0].x;
		 d.y = lineData[0].y;

		 for (let point of lineData) {
		     point.x = point.x - d.x;
		     point.y = point.y - d.y;
		 }
	     } else {
		 lineData.push({x:-1, y:-1, seq:1});
		 lineData.push({x:1, y:-1, seq:2});
		 lineData.push({x:1, y:1, seq:3});
		 lineData.push({x:-1, y:1, seq:4});
		 lineData.push({x:-1, y:-1, seq:5});
		 d.x = xcalc;
		 d.y = ycalc;
	     }
	     d.lineData = lineData;
	 }

	 if (d3.select("svg").select("g.ConnectivityNodes").empty()) {
	     d3.select("svg").select("g").append("g")
	       .attr("class", "ConnectivityNodes");
	 }

	 let cnUpdate = d3.select("svg")
			  .select("g.ConnectivityNodes")
			  .selectAll("g.ConnectivityNode")
			  .data(allConnectivityNodes, function (d) {
			      return d.attributes.getNamedItem("rdf:ID").value;
			  });

	 let cnEnter = cnUpdate.enter()
			       .append("g")
			       .attr("class", "ConnectivityNode")
			       .attr("id", function(d) {
				   return d.attributes.getNamedItem("rdf:ID").value;
			       });

	 cnUpdate.select("path").attr("d", function(d) {
	     return line(d3.select(this.parentNode).datum().lineData);
	 });

	 cnEnter.append("path")
		.attr("d", function(d) {
		    return line(d3.select(this.parentNode).datum().lineData);
		})
		.attr("stroke", "black")
		.attr("stroke-width", 2)
		.attr("fill", "none");

	 cnEnter.append("text")
	        .style("text-anchor", "end")
	        .attr("font-size", 8);
	 updateText(cnEnter.select("text"));
	 updateText(cnUpdate.select("text"));

	 function updateText(selection) {
	     selection.filter(function(d) {
		 let equipments = self.model.getEquipments(d);

		 let busbarSection = equipments.filter(el => el.localName === "BusbarSection")[0];
		 return typeof(busbarSection) !== "undefined";
	     })
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

		    let busbarSection = equipments.filter(el => el.localName === "BusbarSection")[0];
		    if (typeof(busbarSection) !== "undefined") {
			let name = self.model.getAttribute(busbarSection, "cim:IdentifiedObject.name");
			if (typeof(name) !== "undefined") {
			    return name.innerHTML;
			}
		    }
		    return "";
		})
	 };

	 return cnEnter;
     }.bind(this)

     this.hover = function(hoverD) {
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
     }.bind(this)

     this.moveTo = function(uuid) {

	 d3.select("svg").selectAll("svg > g > g.Substations > g").remove();
	 d3.select("svg").selectAll("svg > g > g.ACLineSegments > g > path").attr("stroke-width", 2);
	 d3.select("svg").selectAll("svg > g > g > g").selectAll("rect").remove();
	 let hoverD = this.model.getObject(uuid);

	 if (hoverD.nodeName === "cim:BusbarSection") {
	     let terminal = self.model.getConductingEquipmentGraph([hoverD]).map(el => el.target)[0];
	     let cn = self.model.getGraph([terminal], "Terminal.ConnectivityNode", "ConnectivityNode.Terminals").map(el => el.source)[0];
	     hoverD = cn;
	 }

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
	 var t = d3.zoomIdentity.translate(newx, newy).scale(1);
	 d3.selectAll("svg").select("g").attr("transform", t);
	 d3.zoom().transform(d3.selectAll("svg"), t);
	 self.trigger("transform");
	 self.hover(hoverD);
     }.bind(this)

     this.closestPoint = function(source, point) {
         let line = d3.line()
	              .x(function(d) { return d.x; })
	              .y(function(d) { return d.y; });

	 let pathNode = d3.select(document.createElementNS('http://www.w3.org/2000/svg', 'svg')).append("path").attr("d", line(source.lineData)).node();

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
     }.bind(this)

     this.forceTick = function(selection) {
	 if (arguments.length === 0 || selection.alpha !== undefined) {

	     selection = d3.select("svg").selectAll("svg > g > g:not(.edges) > g");
	 }

	 let transform = d3.zoomTransform(d3.select("svg").node());
	 let xoffset = transform.x;
	 let yoffset = transform.y;
	 let svgZoom = transform.k;
	 updateElements(selection);

	 if (arguments.length === 1) {
	     let terminals = self.model.getTerminals(selection.data());
	     let links = d3.select("svg").selectAll("svg > g > g.edges > g").filter(function(d) {
		 return selection.data().indexOf(d.source) > -1 || terminals.indexOf(d.target) > -1;
	     });
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
			  return d.attributes.getNamedItem("rdf:ID").value;
		      });
	 };
     }.bind(this)

     this.addToDiagram = function(object) {
	 let m = d3.mouse(d3.select("svg").node());
	 let transform = d3.zoomTransform(d3.select("svg").node());
	 let xoffset = transform.x;
	 let yoffset = transform.y;
	 let svgZoom = transform.k;
	 object.x = (m[0] - xoffset) / svgZoom;
	 object.px = object.x;
	 object.y = (m[1] - yoffset) / svgZoom;
	 object.py = object.y;
	 let selection = null;

	 let lineData = [{x: 0, y: 0, seq:1}];
	 if (object.nodeName === "cim:ACLineSegment" || object.nodeName === "cim:BusbarSection") {
	     lineData.push({x: 150, y: 0, seq:2});
	 }
	 self.model.addToActiveDiagram(object, lineData);

	 if (object.nodeName === "cim:ACLineSegment") {
	     selection = self.drawACLines([object]);
	 }
	 if (object.nodeName === "cim:Breaker") {
	     selection = self.drawBreakers([object]);
	 }
	 if (object.nodeName === "cim:Disconnector") {
	     selection = self.drawDisconnectors([object]);
	 }
         if (object.nodeName === "cim:LoadBreakSwitch") {
	     selection = self.drawLoadBreakSwitches([object]);
	 }
	 if (object.nodeName === "cim:EnergySource" || object.nodeName === "cim:SynchronousMachine") {
	     selection = self.drawEnergySources([object]);
	 }
	 if (object.nodeName === "cim:EnergyConsumer"|| object.nodeName === "cim:ConformLoad" || object.nodeName === "cim:NonConformLoad") {
	     selection = self.drawEnergyConsumers([object]);
	 }
	 if (object.nodeName === "cim:PowerTransformer") {
	     selection = self.drawPowerTransformers([object]);
	 }

	 if (selection !== null) {
	     handleTerminals(selection);
	     selection.on("mouseover.hover", self.hover)
		      .on("mouseout", mouseOut);
	 }

	 if (object.nodeName === "cim:BusbarSection") {
	     let terminal = self.model.getGraph([object], "ConductingEquipment.Terminals", "Terminal.ConductingEquipment", true).map(el => el.target);
	     let cn = self.model.getGraph(terminal, "Terminal.ConnectivityNode", "ConnectivityNode.Terminals").map(el => el.source)[0];
	     selection = self.drawConnectivityNodes([cn]);
	     selection.on("mouseover.hover", self.hover)
		      .on("mouseout", mouseOut);

	     let equipments = self.model.getEquipments(cn).filter(eq => eq !== object);
	     let eqTerminals = self.model.getTerminals(equipments);
	     for (let eqTerminal of eqTerminals) {
		 let eqCn = self.model.getGraph([eqTerminal], "Terminal.ConnectivityNode", "ConnectivityNode.Terminals").map(el => el.source)[0];
		 if (eqCn === cn) {
		     let newEdge = {source: cn, target: eqTerminal};
		     self.createEdges([newEdge]);
		 }
	     }
	 }

	 self.forceTick();
	 self.trigger("addToDiagram");

	 function handleTerminals(selection) {
	     let terminals = self.model.getTerminals([object]);
	     for (let terminal of terminals) {
		 let cn = self.model.getGraph([terminal], "Terminal.ConnectivityNode", "ConnectivityNode.Terminals").map(el => el.source)[0];
		 if (typeof(cn) !== "undefined") {
		     let equipments = self.model.getEquipments(cn);

		     let busbarSection = equipments.filter(el => el.localName === "BusbarSection")[0];
		     equipments = equipments.filter(el => el !== busbarSection);
		     if (equipments.length > 1) {
			 self.drawConnectivityNodes([cn]);

			 let eqTerminals = self.model.getTerminals(equipments);
			 for (let eqTerminal of eqTerminals) {
			     let eqCn = self.model.getGraph([eqTerminal], "Terminal.ConnectivityNode", "ConnectivityNode.Terminals").map(el => el.source)[0];
			     if (eqCn === cn) {
				 let newEdge = {source: cn, target: eqTerminal};
				 self.createEdges([newEdge]);
			     }
			 }

		     }
		 }
	     }
	     self.createTerminals(selection);
	 }

	 function mouseOut(d) {
	     d3.select(this).selectAll("rect").remove();
	 }
     }.bind(this)

     this.updateEdges = function(xoffset, yoffset, svgZoom, links) {
	 let line = d3.line()
		      .x(function(d) { return d.x; })
		      .y(function(d) { return d.y; });
	 if (arguments.length === 3) {
	     links = d3.select("svg").selectAll("svg > g > g.edges > g");
	 }

	 links.select("path")
	       .attr("d", function(d) {
		   let tarRot = {x: d.target.x, y: d.target.y};
		   if (d.target.rotation > 0) {
		       tarRot = rotateTerm(d.target);
		   }
		   d.p = self.closestPoint(d.source, tarRot);
		   let lineData = [{x: d.p[0] + d.source.x, y: d.p[1] + d.source.y}, tarRot];
		   return line(lineData);
	       });

	 function rotateTerm(term) {
	     let equipment = self.model.getGraph([term], "Terminal.ConductingEquipment", "ConductingEquipment.Terminals").map(el => el.source)[0];
	     let baseX = equipment.x;
	     let baseY = equipment.y;
	     let cRot = self.rotate({x: term.x-baseX, y: term.y-baseY}, term.rotation);
	     let newX = baseX + cRot.x;
	     let newY = baseY + cRot.y;
	     return {x: newX, y: newY};
	 }

     }.bind(this)

     this.rotate = function(p, rotation) {
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
     }.bind(this)

     this.distance2 = function(p1, p2) {
	 let dx = p1.x - p2.x,
	     dy = p1.y - p2.y;
	 return dx * dx + dy * dy;
     }.bind(this)
});

