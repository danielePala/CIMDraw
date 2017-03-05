/*
 This tag renders a schematic diagram of a given CIM file.

 Copyright 2017 Daniele Pala <daniele.pala@rse-web.it>

 This file is part of CIMDraw.

 CIMDraw is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 CIMDraw is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with CIMDraw. If not, see <http://www.gnu.org/licenses/>.
*/

<cimDiagram>
    <style>
     .app-diagram {
	 max-height: 800px;
     }

     path.domain {
	 fill: none;
	 stroke: black;
     }

     g.tick > line {
	 stroke: black;
	 stroke-dasharray: 1 5;
     }

     svg {
	 width: 1200px;
	 height: 800px;
     }
 
     line.highlight {
	 stroke: red;
	 stroke-width: 1;
     }

     g.resize > rect {
	 stroke: black;
	 stroke-width: 2;
     }
    </style>
    
    <cimDiagramControls model={model}></cimDiagramControls>
    <div class="app-diagram">	
	<svg width="1200" height="800" style="border: 1px solid black;">
	    <path stroke-width="1" stroke="black" fill="none"></path>
	    <circle r="3.5" cy="-10" cx="-10"></circle>
	    <g class="brush"></g>
	    <g class="diagram-grid"></g>
	    <g class="diagram-highlight">
		<line class="highlight"></line>
	    </g>
	    <g class="diagram">
		<g class="edges"></g>
	    </g>
	</svg>
    </div>    
    <script>
     "use strict";
     const SWITCH_HEIGHT = 10; // height of switch elements
     const SWITCH_WIDTH = 10; // width of switch elements
     const SWITCH_TERMINAL_OFFSET = 1; // distance between switch element and its terminals
     const GEN_HEIGHT = 50;    // height of generator elements
     const TRAFO_HEIGHT = 50;  // height of transformer elements
     const TERMINAL_RADIUS = 2; // radius of terminals
     let self = this;
     self.model = opts.model;
     
     // listen to 'showDiagram' event from parent
     self.parent.on("showDiagram", function(file, name, element) {
	 if (decodeURI(name) !== self.diagramName) {
	     self.render(name);
	 }
         if (typeof(element) !== "undefined") {
	     self.moveTo(element);
	     self.trigger("moveTo", element);
         }
     });

     // listen to 'mount' event
     self.on("mount", function() {
	 // setup xy axes
	 let xScale = d3.scaleLinear().domain([0, 1200]).range([0,1200]);
	 let yScale = d3.scaleLinear().domain([0, 800]).range([0, 800]);
	 let yAxis = d3.axisRight(yScale);
	 let xAxis = d3.axisBottom(xScale);
	 d3.select("svg").append("g").attr("id", "yAxisG").call(yAxis);
	 d3.select("svg").append("g").attr("id", "xAxisG").call(xAxis);
	 // draw grid
	 self.drawGrid(1.0);
     });
     
     // listen to 'transform' event
     self.on("transform", function() {
	 let transform = d3.zoomTransform(d3.select("svg").node());
	 let newx = transform.x;
	 let newy = transform.y;
	 let newZoom = transform.k;
	 let svgWidth = parseInt(d3.select("svg").style("width"));
	 let svgHeight = parseInt(d3.select("svg").style("height"));
	 // manage axes
	 let xScale = d3.scaleLinear().domain([-newx/newZoom, (svgWidth-newx)/newZoom]).range([0, svgWidth]);
	 let yScale = d3.scaleLinear().domain([-newy/newZoom, (svgHeight-newy)/newZoom]).range([0, svgHeight]);
	 let yAxis = d3.axisRight(yScale);
	 let xAxis = d3.axisBottom(xScale);
	 d3.select("svg").select("#yAxisG").call(yAxis);
	 d3.select("svg").select("#xAxisG").call(xAxis);
	 //self.updateEdges(newx, newy, newZoom);
     });

     // listen to 'setAttribute' event from model
     self.model.on("setAttribute", function(object, attrName, value) {
	 switch (attrName) {
	     case "cim:IdentifiedObject.name":
		 let type = object.localName;
		 let uuid = object.attributes.getNamedItem("rdf:ID").value;
		 // special case for busbars
		 if (object.nodeName === "cim:BusbarSection") {
		     let cn = self.model.getConnectivityNode(object);
		     if (cn === null) {
			 return;
		     }
		     type = cn.localName;
		     uuid = cn.attributes.getNamedItem("rdf:ID").value;
		 }
		 let types = d3.select("svg").selectAll("svg > g.diagram > g." + type + "s");
		 let target = types.select("#" + uuid);
		 target.select("text").html(value);
		 break;
	     case "cim:AnalogValue.value":
		 let analog = self.model.getTargets(
		     [object],
		     "AnalogValue.Analog",
		     "Analog.AnalogValues");
		 let psr = self.model.getTargets(
		     analog,
		     "Measurement.PowerSystemResource",
		     "PowerSystemResource.Measurements")[0];
		 let psrUUID = psr.attributes.getNamedItem("rdf:ID").value;
		 let psrSelection = d3.select("g#" + psrUUID);
		 self.createMeasurements(psrSelection);
		 break;
	     case "cim:SvPowerFlow.p":
	     case "cim:SvPowerFlow.q":
		 let svTerminal = self.model.getTargets(
		     [object],
		     "SvPowerFlow.Terminal",
		     "Terminal.SvPowerFlow")[0];
		 if (typeof(svTerminal) !== "undefined") {
		     let psr = self.model.getTargets(
			 [svTerminal],
			 "Terminal.ConductingEquipment",
			 "ConductingEquipment.Terminals")[0];
		     let psrUUID = psr.attributes.getNamedItem("rdf:ID").value;
		     let psrSelection = d3.select("g#" + psrUUID);
		     self.createMeasurements(psrSelection);
		 }
		 break;
	 }
	 if (object.nodeName === "cim:Analog" || object.nodeName === "cim:Discrete") {
	     let psr = self.model.getTargets(
		 [object],
		 "Measurement.PowerSystemResource",
		 "PowerSystemResource.Measurements")[0];
	     if (typeof(psr) !== "undefined") {
		 // handle busbars
		 if (psr.nodeName === "cim:BusbarSection") {
		     psr = self.model.getConnectivityNode(psr);
		 }	 
		 let psrUUID = psr.attributes.getNamedItem("rdf:ID").value;
		 let psrSelection = d3.select("g#" + psrUUID);
		 self.createMeasurements(psrSelection);
	     }
	 }
     });

     // listen to 'setEnum' event from model
     self.model.on("setEnum", function(object, enumName, value) {
	 if (object.nodeName === "cim:Analog" || object.nodeName === "cim:Discrete") {
	     let psr = self.model.getTargets(
		 [object],
		 "Measurement.PowerSystemResource",
		 "PowerSystemResource.Measurements")[0];
	     if (typeof(psr) !== "undefined") {
		 // handle busbars
		 if (psr.nodeName === "cim:BusbarSection") {
		     psr = self.model.getConnectivityNode(psr);
		 }	 
		 let psrUUID = psr.attributes.getNamedItem("rdf:ID").value;
		 let psrSelection = d3.select("g#" + psrUUID);
		 self.createMeasurements(psrSelection);
	     }
	 }
     });

     // Listen to 'updateActiveDiagram' event from model.
     // This should replace the calls to 'forceTick' in other components.
     self.model.on("updateActiveDiagram", function(object) {
	 let selection = null;
	 switch (object.nodeName) {
	 case "cim:ACLineSegment":
		 selection = self.drawACLines([object])[0];
		 self.createTerminals(selection);
	     break;
	 case "cim:ConnectivityNode":
	     self.drawConnectivityNodes([object]);
	     break;
	 }
	 let type = object.localName;
	 let uuid = object.attributes.getNamedItem("rdf:ID").value;
	 let types = d3.select("svg").selectAll("svg > g.diagram > g." + type + "s");
	 let target = types.select("#" + uuid);
	 self.forceTick(target); 
     });
     
     // listen to 'addToActiveDiagram' event from model
     self.model.on("addToActiveDiagram", function(object) {
	 let selection = null;
	 switch (object.nodeName) {	 
	     case "cim:ACLineSegment":
		 selection = self.drawACLines([object])[1]; // TODO: handle correctly
		 break;
	     case "cim:Breaker":
		 selection = self.drawBreakers([object]);
		 break;
	     case "cim:Disconnector":
		 selection = self.drawDisconnectors([object]);
		 break;
             case "cim:LoadBreakSwitch":
		 selection = self.drawLoadBreakSwitches([object]);
		 break;
	     case "cim:Jumper":
		 selection = self.drawJumpers([object]);
		 break;
	     case "cim:Junction":
		 selection = self.drawJunctions([object]);
		 break;
	     case "cim:EnergySource":
		 selection = self.drawEnergySources([object]);
		 break;
	     case "cim:SynchronousMachine":
		 selection = self.drawSynchronousMachines([object]);
		 break;
	     case "cim:EnergyConsumer":
		 selection = self.drawEnergyConsumers([object]);
		 break;
	     case "cim:ConformLoad":
		 selection = self.drawConformLoads([object]);
		 break;
	     case "cim:NonConformLoad":
		 selection = self.drawNonConformLoads([object]);
		 break;
	     case "cim:PowerTransformer":
		 selection = self.drawPowerTransformers([object]);
		 break;
	     case "cim:ConnectivityNode":
		 selection = self.drawConnectivityNodes([object]);
		 break;
	 }
	 
	 if (selection !== null) {
	     handleTerminals(selection);
	 }
	 // handle busbars
	 if (object.nodeName === "cim:BusbarSection") {
	     let terminal = self.model.getTargets(
		 [object],
		 "ConductingEquipment.Terminals",
		 "Terminal.ConductingEquipment");
	     let cn = self.model.getTargets(
		 terminal,
		 "Terminal.ConnectivityNode",
		 "ConnectivityNode.Terminals")[0];
	     selection = self.drawConnectivityNodes([cn]);
	     let equipments = self.model.getEquipments(cn).filter(eq => eq !== object);
	     let eqTerminals = self.model.getTerminals(equipments);
	     for (let eqTerminal of eqTerminals) {
		 let eqCn = self.model.getTargets(
		     [eqTerminal],
		     "Terminal.ConnectivityNode",
		     "ConnectivityNode.Terminals")[0];
		 if (eqCn === cn) {
		     let newEdge = {source: cn, target: eqTerminal};
		     self.createEdges([newEdge]);
		 }
	     }   
	 }

	 if (selection !== null) {
	     self.forceTick();
	     self.trigger("addToDiagram", selection);
	 }

	 function handleTerminals(selection) {
	     let terminals = self.model.getTerminals([object]);
	     for (let terminal of terminals) {
		 let cn = self.model.getTargets(
		     [terminal],
		     "Terminal.ConnectivityNode",
		     "ConnectivityNode.Terminals")[0];
		 if (typeof(cn) !== "undefined") {
		     let equipments = self.model.getEquipments(cn);
		     // let's try to get a busbar section
		     let busbarSection = equipments.filter(el => el.localName === "BusbarSection")[0];		     
		     equipments = equipments.filter(el => el !== busbarSection);
		     if (equipments.length > 1) {
			 self.drawConnectivityNodes([cn]);

			 let eqTerminals = self.model.getTerminals(equipments);
			 for (let eqTerminal of eqTerminals) {
			     let eqCn = self.model.getTargets(
				 [eqTerminal],
				 "Terminal.ConnectivityNode",
				 "ConnectivityNode.Terminals")[0];
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
     });

     // listen to 'addLink' event from model
     // this function checks if the terminal belongs to the current diagram
     // TODO: should check also the connectivity node
     self.model.on("addLink", function(source, linkName, target) {
	 switch (linkName) {
	     case "cim:Terminal.ConnectivityNode":
	     case "cim:ConnectivityNode.Terminals":
		 let cn = undefined;
		 let term = undefined;
		 if (target.nodeName === "cim:Terminal" && source.nodeName === "cim:ConnectivityNode") {
		     cn = source;
		     term = target;
		 } else {
		     if (source.nodeName === "cim:Terminal" && target.nodeName === "cim:ConnectivityNode") {
			 term = source;
			 cn = target;
		     } else {
			 return;
		     }
		 }
		 let edgeToChange = d3.select("svg").selectAll("svg > g.diagram > g.edges > g").data().filter(el => el.target === term)[0];
		 if (typeof(edgeToChange) === "undefined") {
		     let equipment = self.model.getTargets(
			 [term],
			 "Terminal.ConductingEquipment",
			 "ConductingEquipment.Terminals");
		     let dobjs = self.model.getDiagramObjects(equipment);
		     if (dobjs.length > 0) {
			 edgeToChange = {source: cn, target: term};
			 self.createEdges([edgeToChange]);
		     }
		 } else {
		     edgeToChange.source = cn;
		 }
		 self.forceTick();
		 break;
	     case "cim:Terminal.SvPowerFlow":
	     case "cim:SvPowerFlow.Terminal":
		 // power flow results
		 let terminal = target;
		 if (source.nodeName === "cim:Terminal") {
		     terminal = source;
		 }
		 if (typeof(terminal) !== "undefined") {
		     let psr = self.model.getTargets(
			 [terminal],
			 "Terminal.ConductingEquipment",
			 "ConductingEquipment.Terminals")[0];
		     let psrUUID = psr.attributes.getNamedItem("rdf:ID").value;
		     let psrSelection = d3.select("g#" + psrUUID);
		     self.createMeasurements(psrSelection);
		 }
		 break;
	     case "cim:Measurement.Terminal":
	     case "cim:ACDCTerminal.Measurements":
	 	 let measTerminal = target;
		 if (source.nodeName === "cim:Terminal") {
		     measTerminal = source;
		 }
		 let measPsr = self.model.getTargets(
		     [measTerminal],
		     "Terminal.ConductingEquipment",
		     "ConductingEquipment.Terminals")[0];
		 let measPsrUUID = measPsr.attributes.getNamedItem("rdf:ID").value;
		 let measPsrSelection = d3.select("g#" + measPsrUUID);
		 self.createMeasurements(measPsrSelection);
		 break;
	     case "cim:Measurement.PowerSystemResource":
	     case "cim.PowerSystemResource.Measurements":
		 let psr = target;
		 if (linkName === "cim.PowerSystemResource.Measurements") {
		     psr = source;
		 }
		 if (typeof(psr) !== "undefined") {
		     // handle busbars
		     if (psr.nodeName === "cim:BusbarSection") {
			 psr = self.model.getConnectivityNode(psr);
		     }	 
		     let psrUUID = psr.attributes.getNamedItem("rdf:ID").value;
		     let psrSelection = d3.select("g#" + psrUUID);
		     self.createMeasurements(psrSelection);
		 }
		 break;
	 }
     });

     // listen to 'removeLink' event from model
     self.model.on("removeLink", function(source, linkName, target) {
	 switch (linkName) {
	     case "cim:Measurement.PowerSystemResource":
	     case "cim.PowerSystemResource.Measurements":
		 let psr = target;
		 if (linkName === "cim.PowerSystemResource.Measurements") {
		     psr = source;
		 }
		 if (typeof(psr) !== "undefined") {
		     // handle busbars
		     if (psr.nodeName === "cim:BusbarSection") {
			 psr = self.model.getConnectivityNode(psr);
		     }	 
		     let psrUUID = psr.attributes.getNamedItem("rdf:ID").value;
		     let psrSelection = d3.select("g#" + psrUUID);
		     self.createMeasurements(psrSelection);
		 }
		 break;
	 }
     });
     
     render(diagramName) {
	 let diagramRender = self.renderGenerator(diagramName);
	 function periodic() {
	     let ret = diagramRender.next().value;
	     if (typeof(ret) !== "undefined") {
		 $("#loadingDiagramMsg").append("<br>" + ret);
		 setTimeout(periodic, 1);
	     } else {
		 self.parent.trigger("loaded");
	     }
	 };
	 periodic();
     }

     /** Main rendering function */
     self.renderGenerator = function*(diagramName) {
	 // clear all
	 d3.select("svg").select("g.diagram").selectAll("g:not(.edges)").remove();

	 self.model.selectDiagram(decodeURI(diagramName));
	 self.diagramName = decodeURI(diagramName);
	 let allConnectivityNodes = self.model.getConnectivityNodes();
	 yield "[" + Date.now() + "] DIAGRAM: extracted connectivity nodes";
	 
	 let allEquipments = self.model.getGraphicObjects(
	     ["cim:ACLineSegment",
	      "cim:Breaker",
	      "cim:Disconnector",
	      "cim:LoadBreakSwitch",
	      "cim:Jumper",
	      "cim:Junction",
	      "cim:EnergySource",
	      "cim:SynchronousMachine",
	      "cim:EnergyConsumer",
	      "cim:ConformLoad",
	      "cim:NonConformLoad",
	      "cim:PowerTransformer",
	      "cim:BusbarSection"]);
	 let allACLines = allEquipments["cim:ACLineSegment"];
	 let allBreakers = allEquipments["cim:Breaker"];
	 let allDisconnectors = allEquipments["cim:Disconnector"]; 
	 let allLoadBreakSwitches = allEquipments["cim:LoadBreakSwitch"]; 
	 let allJumpers = allEquipments["cim:Jumper"]; 
	 let allJunctions = allEquipments["cim:Junction"];
	 let allEnergySources = allEquipments["cim:EnergySource"];
	 let allSynchronousMachines = allEquipments["cim:SynchronousMachine"];
	 let allEnergyConsumers = allEquipments["cim:EnergyConsumer"];
	 let allConformLoads = allEquipments["cim:ConformLoad"];
	 let allNonConformLoads = allEquipments["cim:NonConformLoad"];
	 let allPowerTransformers = allEquipments["cim:PowerTransformer"];
	 let allBusbarSections = allEquipments["cim:BusbarSection"];
	 yield "[" + Date.now() + "] DIAGRAM: extracted equipments";
	 
	 // AC Lines
	 let aclineEnter = self.drawACLines(allACLines)[1];
	 yield "[" + Date.now() + "] DIAGRAM: drawn acLines";
	 // breakers
	 let breakerEnter = self.drawBreakers(allBreakers);
	 yield "[" + Date.now() + "] DIAGRAM: drawn breakers";
	 // disconnectors
	 let discEnter = self.drawDisconnectors(allDisconnectors);
	 yield "[" + Date.now() + "] DIAGRAM: drawn disconnectors";
	 // load break switches
	 let lbsEnter = self.drawLoadBreakSwitches(allLoadBreakSwitches);
	 yield "[" + Date.now() + "] DIAGRAM: drawn load break switches";
	 // jumpers
	 let jumpsEnter = self.drawJumpers(allJumpers);
	 yield "[" + Date.now() + "] DIAGRAM: drawn jumpers";
	 // junctions
	 let junctsEnter = self.drawJunctions(allJunctions);
	 yield "[" + Date.now() + "] DIAGRAM: drawn junctions";
	 // energy sources
	 let ensrcEnter = self.drawEnergySources(allEnergySources);
	 yield "[" + Date.now() + "] DIAGRAM: drawn energy sources";
	 // synchronous machines
	 let syncEnter = self.drawSynchronousMachines(allSynchronousMachines);
	 yield "[" + Date.now() + "] DIAGRAM: drawn synchronous machines";	 
	 // energy consumers
	 let enconsEnter = self.drawEnergyConsumers(allEnergyConsumers);
	 yield "[" + Date.now() + "] DIAGRAM: drawn energy consumers";
	 // conform loads
	 let confEnter = self.drawConformLoads(allConformLoads);
	 yield "[" + Date.now() + "] DIAGRAM: drawn conform loads";
	 // non conform loads
	 let nonconfEnter = self.drawNonConformLoads(allNonConformLoads);
	 yield "[" + Date.now() + "] DIAGRAM: drawn non conform loads";
	 // power transformers
	 let trafoEnter = self.drawPowerTransformers(allPowerTransformers);
	 yield "[" + Date.now() + "] DIAGRAM: drawn power transformers";
	 // connectivity nodes
	 let cnEnter = self.drawConnectivityNodes(allConnectivityNodes);
	 self.createMeasurements(cnEnter);
	 yield "[" + Date.now() + "] DIAGRAM: drawn connectivity nodes";

	 // ac line terminals
	 let termSelection = self.createTerminals(aclineEnter);
	 self.createMeasurements(aclineEnter);
	 yield "[" + Date.now() + "] DIAGRAM: drawn acline terminals";
	 // breaker terminals
	 self.createTerminals(breakerEnter);
	 self.createMeasurements(breakerEnter);
	 yield "[" + Date.now() + "] DIAGRAM: drawn breaker terminals";
	 // disconnector terminals
	 self.createTerminals(discEnter);
	 self.createMeasurements(discEnter);
	 yield "[" + Date.now() + "] DIAGRAM: drawn disconnector terminals";
	 // load break switch terminals
	 self.createTerminals(lbsEnter);
	 self.createMeasurements(lbsEnter);
	 yield "[" + Date.now() + "] DIAGRAM: drawn load break switch terminals";
	 // jumper terminals
	 self.createTerminals(jumpsEnter);
	 self.createMeasurements(jumpsEnter);
	 yield "[" + Date.now() + "] DIAGRAM: drawn jumper terminals";
	 // junction terminals
	 self.createTerminals(junctsEnter);
	 self.createMeasurements(junctsEnter);
	 yield "[" + Date.now() + "] DIAGRAM: drawn junction terminals";
	 // energy source terminals
	 termSelection = self.createTerminals(ensrcEnter);
	 self.createMeasurements(ensrcEnter);
	 yield "[" + Date.now() + "] DIAGRAM: drawn energy source terminals";
	 // synchronous machine terminals
	 termSelection = self.createTerminals(syncEnter);
	 self.createMeasurements(syncEnter);
	 yield "[" + Date.now() + "] DIAGRAM: drawn synchronous machine terminals";
	 // energy consumer terminals
	 termSelection = self.createTerminals(enconsEnter);
	 self.createMeasurements(enconsEnter);
	 yield "[" + Date.now() + "] DIAGRAM: drawn energy consumer terminals";
	 // conform load terminals
	 termSelection = self.createTerminals(confEnter);
	 self.createMeasurements(confEnter);
	 yield "[" + Date.now() + "] DIAGRAM: drawn conform load terminals";
	 // non conform load terminals
	 termSelection = self.createTerminals(nonconfEnter);
	 self.createMeasurements(nonconfEnter);
	 yield "[" + Date.now() + "] DIAGRAM: drawn non conform load terminals";
	 // power transformer terminals
	 termSelection = self.createTerminals(trafoEnter);
	 self.createMeasurements(trafoEnter);
	 yield "[" + Date.now() + "] DIAGRAM: drawn power transformer terminals";

	 d3.select("svg").on("mouseover", function() {
	     self.model.on("dragend", dragend);
	 }).on("mouseout",function() {
	     self.model.off("dragend", dragend);
	 });

	 function dragend(d) {
	     let dobjs = self.model.getDiagramObjects([d]);
	     if (dobjs.length > 0) {
		 self.moveTo(d.attributes.getNamedItem("rdf:ID").value);
	     } else {
		 // add object to diagram
		 self.addToDiagram(d);
	     }
	 }

	 function mouseOut(d) {
	     d3.select(this).selectAll("rect").remove();	     
	 }
	
	 self.forceTick();
	 self.trigger("render");
	 
	 // test topo
	 /*
	 allConnectivityNodes = self.model.getObjects(["cim:ConnectivityNode"]);
	 console.log(allConnectivityNodes.length);
	 let topos = allConnectivityNodes.reduce(function(r, v) {
	     let cnTerminals = self.model.getGraph([v], "ConnectivityNode.Terminals", "Terminal.ConnectivityNode").map(el => el.source);
	     let switches = self.model.getGraph(cnTerminals, "Terminal.ConductingEquipment", "ConductingEquipment.Terminals").map(el => el.source).filter(function(el) {
		 return self.model.isA("Switch", el) === true;
	     });
	     switches = switches.filter(function(el) {
		 // TODO: take into account measurements
		 let status = self.model.getAttribute(el, "cim:Switch.normalOpen").textContent;
		 return (status === "true");
	     });
	     let swTerminals = self.model.getGraph(switches, "ConductingEquipment.Terminals", "Terminal.ConductingEquipment").map(el => el.source);
	     let swCns = self.model.getGraph(swTerminals, "Terminal.ConnectivityNode", "ConnectivityNode.Terminals").map(el => el.source);
	     swCns.push(v);
	     r.push(new Set(swCns));
	     return r;
	 }, []);

	 let oldSize = topos.length;
	 let newSize = 0;
	 while (oldSize !== newSize) {
	     oldSize = topos.length;
	     topos = topos.reduce(function(r, v) {
		 let merged = false;
		 for (let i in r) {
		     let topo = r[i];
		     let intersection = new Set([...v].filter(x => topo.has(x)));
		     if (intersection.size > 0) {
			 merged = true;
			 r[i] = new Set([...topo].concat([...v]));
		     }
		 }
		 if (merged === false) {
		     r.push(v);
		 }
		 return r;
	     }, []);
	     newSize = topos.length;
	 }
	 console.log(topos);
	 */
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
	       return d.source.attributes[0].value+d.target.attributes[0].value;
	   })
	   .append("path")
	   .attr("fill", "none")
	   .attr("stroke", "black")
	   .attr("stroke-width", 1);
     }

     // Create measurements associated with a selection of terminals or power system resources.
     // TODO: junctions
     createMeasurements(psrSelection) {
	 psrSelection.attr("data-toggle", "popover");	 
	 psrSelection.each(function(d) {
	     let measurements = [];
	     let svs = [];
	     let terminals = self.model.getTerminals([d]);
	     // get the measurements for this equipment
	     if (d.nodeName === "cim:ConnectivityNode") {		 
		 let busbar = self.model.getBusbar(d);
		 if (busbar === null) {
		     return;
		 }
		 measurements = self.model.getTargets(
		     [busbar],
		     "PowerSystemResource.Measurements",
		     "Measurement.PowerSystemResource");
	     } else {
		 measurements = self.model.getTargets(
		     [d],
		     "PowerSystemResource.Measurements",
		     "Measurement.PowerSystemResource");
	     }
	     for (let terminal of terminals) {
		 let actTermSvs = self.model.getTargets(
		     [terminal],
		     "Terminal.SvPowerFlow",
		     "SvPowerFlow.Terminal");
		 svs = svs.concat(actTermSvs);
	     }
	     if (measurements.length > 0 || svs.length > 0) {
		 let tooltip = self.createTooltip(measurements, svs);
		 
		 $(this).popover({title: "<b>Measurements</b>",
				  content: tooltip,
				  container: "body",
				  html: true,
				  trigger: "manual",
				  delay: {"show": 200, "hide": 0},
				  placement: "auto right"
		 }).data('bs.popover').tip().find('.popover-content').empty().append(tooltip);
		 $(this).data('bs.popover').options.content = tooltip;
	     } else {
		 // no measurements, destroy popover
		 d3.select(this).attr("data-toggle", null);
		 $(this).popover("destroy");
	     }
	 })
     }

     createTooltip(measurements, svs) {
	 let tooltip = "";
	 if (measurements.length > 0) {
	     let tooltipLines = [];
	     for (let measurement of measurements) {
		 let type = "unnamed";
		 let phases = "ABC";
		 let unitMultiplier = "";
		 let unitSymbol = "no unit";
		 let typeAttr = self.model.getAttribute(measurement, "cim:IdentifiedObject.name");
		 //self.model.getAttribute(measurement, "cim:Measurement.measurementType");
		 let phasesAttr = self.model.getEnum(measurement, "cim:Measurement.phases");
		 let unitMultiplierAttr = self.model.getEnum(measurement, "cim:Measurement.unitMultiplier");
		 let unitSymbolAttr = self.model.getEnum(measurement, "cim:Measurement.unitSymbol");
		 if (typeof(typeAttr) !== "undefined") {
		     type = typeAttr.textContent;
		 }
		 if (typeof(phasesAttr) !== "undefined") {
		     phases = phasesAttr.attributes[0].textContent.split("#")[1].split(".")[1];
		 }
		 if (typeof(unitMultiplierAttr) !== "undefined") {
		     unitMultiplier = unitMultiplierAttr.attributes[0].textContent.split("#")[1].split(".")[1];
		     if (unitMultiplier === "none") {
			 unitMultiplier = "";
		     }
		 }
		 if (typeof(unitSymbolAttr) !== "undefined") {
		     unitSymbol = unitSymbolAttr.attributes[0].textContent.split("#")[1].split(".")[1];
		 }
		 let valueObject = self.model.getTargets(
		     [measurement],
		     "Analog.AnalogValues",
		     "AnalogValue.Analog")[0];
		 let actLine = "";
		 let value = "n.a."
		 if (typeof(valueObject) !== "undefined") {
		     if(typeof(self.model.getAttribute(valueObject, "cim:AnalogValue.value")) !== "undefined") {
			 value = self.model.getAttribute(valueObject, "cim:AnalogValue.value").textContent;
			 value = parseFloat(value).toFixed(2);
		     }
		 }
		 let terms = self.model.getTargets(
		     [measurement],
		     "Measurement.Terminal",
		     "ACDCTerminal.Measurements");
		 
		 let measUUID = measurement.attributes.getNamedItem("rdf:ID").value;
		 let hashComponents = window.location.hash.split("/");
		 let basePath = hashComponents[0] + "/" + hashComponents[1] + "/" + hashComponents[2];
		 let targetPath = basePath + "/" + measUUID;
		 actLine = actLine + "<a href=" + targetPath + ">"+type+"</a>";
		 actLine = actLine + " (phase: " + phases + ")";
		 actLine = actLine + ": ";
		 actLine = actLine + value;
		 actLine = actLine + " [" + unitMultiplier + unitSymbol + "]";
		 actLine = actLine + "<br>";
		 tooltipLines.push(actLine);   
	     }
	     tooltipLines.sort();
	     for (let i in tooltipLines) {
		 tooltip = tooltip + tooltipLines[i];
	     }
	 }

	 // power flow results
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
	 return tooltip;
     }

     // bind data to an x,y array from Diagram Object Points
     // returns a 2 element array: the first is the update selection
     // and the second is the enter selection.
     // The first argument is the CIM type, like "ACLineSegment", the
     // second is the data array.
     createSelection(type, data) {
	 let types = type + "s";
	 if (d3.select("svg").select("g." + types).empty()) {
	     d3.select("svg").select("g.diagram").append("g")
	       .attr("class", types);
	 }

	 for (let d of data) {
	     self.calcLineData(d);
	 }
	 
	 let updateSel = d3.select("svg").select("g." + types).selectAll("g." + type)
			   .data(data, function(d) {
			       return d.attributes.getNamedItem("rdf:ID").value;
			   });
	 let enterSel = updateSel.enter()
				 .append("g")
				 .attr("class", type)
				 .attr("id", function(d) {
				     return d.attributes.getNamedItem("rdf:ID").value;
				 });
	 return [updateSel, enterSel]; 
     }

     // Draw all ACLineSegments
     drawACLines(allACLines) {
	 let line = d3.line()
		      .x(function(d) { return d.x; })
		      .y(function(d) { return d.y; });

	 let aclineSel = self.createSelection("ACLineSegment", allACLines);
	 let aclineUpdate = aclineSel[0];
	 let aclineEnter = aclineSel[1];
	 
	 aclineEnter.append("path")
		    .attr("d", function(d) {
			if (d.lineData.length === 1) {
			    d.lineData.push({x:150, y:0, seq:2});
			}
			return line(d.lineData);
		    })
		    .attr("fill", "none")
		    .attr("stroke", "darkred")
		    .attr("stroke-width", 2);
	 aclineEnter.append("text")
		    .attr("class", "cim-object-text")
		    .style("text-anchor", "middle")
		    .attr("font-size", 8);
	 updateText(aclineUpdate.select("text"));
	 updateText(aclineEnter.select("text"));
	 aclineUpdate.select("path")
		     .attr("d", function(d) {
			 if (d.lineData.length === 1) {
			     d.lineData.push({x:150, y:0, seq:2});
			 }
			 return line(d.lineData);
		     })
	             .attr("fill", "none")
	             .attr("stroke", "darkred")
	             .attr("stroke-width", 2);

	 function updateText(selection) {
	     selection.attr("x", function(d) {
		 let lineData = d.lineData;
		 let end = lineData[lineData.length-1];
		 return (lineData[0].x + end.x)/2;
	     }).attr("y", function(d) {
		 let lineData = d.lineData;
		 let end = lineData[lineData.length-1];
		 return (lineData[0].y + end.y)/2;
	     }).text(function(d) {
		 let name = self.model.getAttribute(d, "cim:IdentifiedObject.name");
		 if (typeof(name) !== "undefined") {
		     return name.innerHTML;
		 }
		 return "";
	     });
	 };
		      
	 return [aclineUpdate, aclineEnter];
     }

     // Draw all Breakers
     drawBreakers(allBreakers) {
	 return self.drawSwitches(allBreakers, "Breaker", "green");
     }

     // Draw all Disconnectors
     drawDisconnectors(allDisconnectors) {
	 return self.drawSwitches(allDisconnectors, "Disconnector", "blue");
     }

     // Draw all load break switches
     drawLoadBreakSwitches(allLoadBreakSwitches) {
	 return self.drawSwitches(allLoadBreakSwitches, "LoadBreakSwitch", "black");
     }

     // Draw all jumpers
     drawJumpers(allJumpers) {
	 return self.drawSwitches(allJumpers, "Jumper", "steelblue");
     }

     // Draw all junctions
     drawJunctions(allJunctions) {
	 return self.drawSwitches(allJunctions, "Junction", "red");
     }

     drawSwitches(allSwitches, type, color) {
	 let line = d3.line()
		      .x(function(d) { return d.x; })
		      .y(function(d) { return d.y; });

	 let swEnter = self.createSelection(type, allSwitches)[1];
	 let xStart = (SWITCH_WIDTH/2) * (-1);
	 let xEnd = (SWITCH_WIDTH/2);
	 let yStart = (SWITCH_HEIGHT/2)* (-1);
	 let yEnd = (SWITCH_HEIGHT/2);
	 
	 swEnter.append("path")
		.attr("d", function(d) {
		    return line([{x:xStart, y:yStart, seq:1},
				 {x:xEnd, y:yStart, seq:2},
				 {x:xEnd, y:yEnd, seq:3},
				 {x:xStart, y:yEnd, seq:4},
				 {x:xStart, y:yStart, seq:5}]);		    
		})
		.attr("fill", function(d) {
		    let value = "0"; // default is OPEN
		    // check the status of this switch
		    let measurement = self.model.getTargets(
			[d],
			"PowerSystemResource.Measurements",
			"Measurement.PowerSystemResource")[0];
		    if (typeof(measurement) !== "undefined") {
			let valueObject = self.model.getTargets(
			    [measurement],
			    "Discrete.DiscreteValues",
			    "DiscreteValue.Discrete")[0];
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
	 	.attr("class", "cim-object-text")
		.style("text-anchor", "end")
		.attr("font-size", 8)
		.attr("x", -10)
		.attr("y", 0)
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
	 return self.drawGenerators(allEnergySources, "EnergySource");
     }

     // Draw all SynchronousMachines
     drawSynchronousMachines(allSynchronousMachines) {
	 return self.drawGenerators(allSynchronousMachines, "SynchronousMachine");
     }

     // Draw all EnergyConsumers
     drawEnergyConsumers(allEnergyConsumers) {
	 return self.drawLoads(allEnergyConsumers, "EnergyConsumer");
     }

     // Draw all ConformLoads
     drawConformLoads(allConformLoads) {
	 return self.drawLoads(allConformLoads, "ConformLoad");
     }

     // Draw all NonConformLoads
     drawNonConformLoads(allNonConformLoads) {
	 return self.drawLoads(allNonConformLoads, "NonConformLoad");
     }
     
     // Draw all generators
     drawGenerators(allGens, type) {
	 let genEnter = self.createSelection(type, allGens)[1];
	 
	 genEnter.append("circle")
		 .attr("r", 25)
		 .attr("cx", 0) 
		 .attr("cy", -25)
		 .attr("fill", "white")
		 .attr("stroke", "blue")
		 .attr("stroke-width", 4);
	 genEnter.append("text")
	 	 .attr("class", "cim-object-text")
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
	 genEnter.append("text")
	         .style("text-anchor", "middle")
	         .attr("font-size", 64)
	         .attr("x", 0)
	         .attr("y", -4)
	         .text("~");
	 return genEnter;
     }

     // Draw all loads
     drawLoads(allLoads, type) {
	 let line = d3.line()
		      .x(function(d) { return d.x; })
		      .y(function(d) { return d.y; });
	 let loadEnter = self.createSelection(type, allLoads)[1];

	 loadEnter.append("path")
		  .attr("d", function(d) {
		      return line([{x: -15, y:0, seq:1}, {x:15, y:0, seq:2}, {x:0, y:20, seq:3}, {x: -15, y:0, seq:4}]);
		  })
		  .attr("fill", "white")
		  .attr("stroke", "black")
		  .attr("stroke-width", 4);
	 loadEnter.append("text")
	 	  .attr("class", "cim-object-text")
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
	 return loadEnter;
     }

     // Draw all PowerTransformers
     drawPowerTransformers(allPowerTransformers) {
	 let trafoEnter = this.createSelection("PowerTransformer", allPowerTransformers)[1];
	 
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
	 	   .attr("class", "cim-object-text")
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

     // Adds terminals to the objects contained in the selection.
     // The elements must all be of the same type (e.g. switches, loads...)
     createTerminals(eqSelection) {
	 let term1_cy = 0; // default y coordinate for first terminal
	 let term2_cy = 30; // default y coordinate for second terminal (if present)
	 let objType = "none";
	 if (eqSelection.size() > 0) {
	     objType = eqSelection.data()[0].nodeName;
	 }
	 // use the correct height for the element
	 switch (objType) {
	     case "cim:Breaker":
	     case "cim:Disconnector":
	     case "cim:LoadBreakSwitch":
	     case "cim:Jumper":
	     case "cim:Junction":
		 term1_cy = ((SWITCH_HEIGHT/2) + (TERMINAL_RADIUS + SWITCH_TERMINAL_OFFSET)) * (-1);
		 term2_cy = (SWITCH_HEIGHT/2) + (TERMINAL_RADIUS + SWITCH_TERMINAL_OFFSET);
		 break;
	     case "cim:EnergySource":
	     case "cim:SynchronousMachine":
		 term2_cy = GEN_HEIGHT;
		 break;
	     case "cim:PowerTransformer":
		 term2_cy = TRAFO_HEIGHT;
		 break;
	     default:
		 term2_cy = 30;
	 }
	 let allEdges = [];
	 let updateTermSelection = eqSelection.selectAll("g")
					.data(function(d) {
					    return self.model.getTerminals([d]);
					});
	 let termSelection = updateTermSelection
	     .enter()
	     .append("g")
	     .each(function(d, i) {
		 let cn = self.model.getTargets(
		     [d],
		     "Terminal.ConnectivityNode",
		     "ConnectivityNode.Terminals")[0];
		 let lineData = d3.select(this.parentNode).datum().lineData;
		 let start = lineData[0];
		 let end = lineData[lineData.length-1];
		 let eqX = d3.select(this.parentNode).datum().x;
		 let eqY = d3.select(this.parentNode).datum().y;
		 if (lineData.length === 1) {
		     start = {x:0, y:term1_cy};
		     end = {x:0, y:term2_cy};
		 }

		 let eqRot = d3.select(this.parentNode).datum().rotation;
		 let terminals = self.model.getTerminals(d3.select(this.parentNode).data());
		 if (typeof(cn) !== "undefined" && terminals.length > 1) {
		     let dist1 = 0;
		     let dist2 = 0;
		     // handle rotation
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
		     // be sure we don't put two terminals on the same side of the equipment
		     checkTerminals(terminals, d, cn, eqX, eqY, start, end);
		 } else {
		     if (lineData.length === 1) {
			 d.x = eqX;
			 d.y = eqY + term1_cy*(1-i) + term2_cy*i;						    
		     } else {
			 d.x = eqX + start.x*(1-i)+end.x*i;
			 d.y = eqY + start.y*(1-i)+end.y*i;
		     }
		 }
		 d.rotation = d3.select(this.parentNode).datum().rotation;
		 if (typeof(cn) !== "undefined" && typeof(cn.lineData) !== "undefined") {
		     let newEdge = {source: cn, target: d};
		     allEdges.push(newEdge);
		 }
	     })
	     .attr("id", function(d) {
		 return d.attributes.getNamedItem("rdf:ID").value;
	     })
	     .attr("class", function(d) {
		 return d.localName;
	     });
	 self.createEdges(allEdges);
	 termSelection.append("circle")
		      .attr("r", TERMINAL_RADIUS)
		      .style("fill","black")
		      .attr("cx", function(d, i) {	    
			  return d3.select(this.parentNode).datum().x - d3.select(this.parentNode.parentNode).datum().x; 
		      })
		      .attr("cy", function(d, i) {
			  return d3.select(this.parentNode).datum().y - d3.select(this.parentNode.parentNode).datum().y;
		      });
	 updateTermSelection
	     .each(function(d, i) {
		 let eqX = d3.select(this.parentNode).datum().x;
		 let eqY = d3.select(this.parentNode).datum().y;
		 let offsetx = parseInt(d3.select(this.firstChild).attr("cx"));
		 let offsety = parseInt(d3.select(this.firstChild).attr("cy"));
		 if (offsetx === 0 && offsety === 0) {
		     d.x = eqX;
		     d.y = eqY;
		 } else {
		     let lineData = d3.select(this.parentNode).datum().lineData;
		     let end = lineData[lineData.length-1];
		     d.x = eqX + end.x;
		     d.y = eqY + end.y;
		 }
	     });
	 updateTermSelection.selectAll("circle")
			    .attr("cx", function(d, i) {	    
				return d3.select(this.parentNode).datum().x - d3.select(this.parentNode.parentNode).datum().x; 
			    })
			    .attr("cy", function(d, i) {
				return d3.select(this.parentNode).datum().y - d3.select(this.parentNode.parentNode).datum().y;
			    });
	 
	 function checkTerminals(terminals, d, cn, eqX, eqY, start, end) {
	     let otherTerm = terminals.filter(term => term !== d)[0];
	     // we need to check if the other terminal must be moved
	     let otherCn = self.model.getTargets(
		 [otherTerm],
		 "Terminal.ConnectivityNode",
		 "ConnectivityNode.Terminals")[0];
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
     }

     calcLineData(d) {
	 d.x = undefined;
	 d.y = undefined;
	 d.rotation = 0;
	 let lineData = [];
	 let xcalc = 0;
	 let ycalc = 0;
	 // extract equipments
	 // filter by lineData, because there may be some elements which are on the diagram but we don't draw
	 let equipments = self.model.getEquipments(d).filter(el => typeof(el.lineData) !== "undefined" || el.localName === "BusbarSection");
	 // let's try to get a busbar section
	 let busbarSection = equipments.filter(el => el.localName === "BusbarSection")[0];
	 let dobjs = self.model.getDiagramObjects([d]);
	 if (dobjs.length === 0) {
	     if (typeof(busbarSection) !== "undefined") {
		 dobjs = self.model.getDiagramObjects([busbarSection]);
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
	 let points = self.model.getTargets(
	     dobjs,
	     "DiagramObject.DiagramObjectPoints",
	     "DiagramObjectPoint.DiagramObject");
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
	     // relative values
	     for (let point of lineData) {
		 point.x = point.x - d.x;
		 point.y = point.y - d.y;
	     }
	 } else {
	     lineData.push({x:0, y:0, seq:1});
	     d.x = xcalc;
	     d.y = ycalc;
	     self.model.addToActiveDiagram(d, lineData);
	 }
	 d.lineData = lineData;

	 return lineData;
     }
     
     // Draw all ConnectivityNodes
     drawConnectivityNodes(allConnectivityNodes) {
	 let line = d3.line()
		      .x(function(d) { return d.x; })
		      .y(function(d) { return d.y; }); 
	 
	 for (let cn of allConnectivityNodes) {
	     self.calcLineData(cn);
	 }
	 
	 if (d3.select("svg").select("g.ConnectivityNodes").empty()) {
	     d3.select("svg").select("g.diagram").append("g")
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
	     let lineData = d3.select(this.parentNode).data()[0].lineData
	     if (lineData.length === 1) {
		 let cx = lineData[0].x;
		 let cy = lineData[0].y;
		 lineData = [{x:cx-1, y:cy-1, seq:1},
			     {x:cx+1, y:cy-1, seq:2},
			     {x:cx+1, y:cy+1, seq:3},
			     {x:cx-1, y:cy+1, seq:4},
			     {x:cx-1, y:cy-1, seq:5}];
	     }
	     return line(lineData);
	 });
	 
	 cnEnter.append("path")
		.attr("d", function(d) {
		    let lineData = d3.select(this.parentNode).data()[0].lineData
		    if (lineData.length === 1) {
			let cx = lineData[0].x;
			let cy = lineData[0].y;
			lineData = [{x:cx-1, y:cy-1, seq:1},
				    {x:cx+1, y:cy-1, seq:2},
				    {x:cx+1, y:cy+1, seq:3},
				    {x:cx-1, y:cy+1, seq:4},
				    {x:cx-1, y:cy-1, seq:5}];
		    }
		    return line(lineData);
		})
		.attr("stroke", "black")
		.attr("stroke-width", 2)
		.attr("fill", "none");
	 
	 // for busbars, show the name
	 cnEnter
	     .filter(function(d) {
		 let busbarSection = self.model.getBusbar(d);
		 return (busbarSection !== null);
	     }).append("text")
	     .attr("class", "cim-object-text")
	     .style("text-anchor", "end")
	     .attr("font-size", 8);
	 updateText(cnEnter.select("text"));
	 updateText(cnUpdate.select("text"));

	 function updateText(selection) {
	     selection.attr("x", function(d) {
		 let lineData = d3.select(this.parentNode).datum().lineData;
		 let end = lineData[lineData.length-1];
		 return ((lineData[0].x + end.x)/2) - 10;
	     }).attr("y", function(d) {
		 let lineData = d3.select(this.parentNode).datum().lineData;
		 let end = lineData[lineData.length-1];
		 return ((lineData[0].y + end.y)/2) + 15;
	     }).text(function(d) {
		 let equipments = self.model.getEquipments(d);
		 // let's try to get a busbar section
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
     }

     moveTo(uuid) {
	 let hoverD = self.model.getObject(uuid);
	 // handle busbars
	 if (hoverD.nodeName === "cim:BusbarSection") {
	     hoverD = self.model.getConnectivityNode(hoverD);
	 }

	 // handle substations and lines
	 if (hoverD.nodeName === "cim:Substation"
	  || hoverD.nodeName === "cim:Line") {
	      let equipments = self.model.getTargets(
		  [hoverD],
		  "EquipmentContainer.Equipments",
		  "Equipment.EquipmentContainer");
	     for (let equipment of equipments) {
		 // handle busbars
		 if (equipment.nodeName === "cim:BusbarSection") {
		     let cn = self.model.getConnectivityNode(equipment);
		     if (cn !== null) {
			 equipment = cn;
		     }
		 }
		 if (typeof(equipment.x) !== "undefined" && typeof(equipment.y) !== "undefined") {
		     hoverD.x = equipment.x;
		     hoverD.y = equipment.y;
		     break;
		 }
	     }
	 }
	 
	 if (typeof(hoverD.x) === "undefined" || typeof(hoverD.y) === "undefined") {
	     return;
	 }
	 // hide popover before moving
	 $('[data-toggle="popover"]').popover("hide");
	 // do the transform
	 let svgWidth = parseInt(d3.select("svg").style("width"));
	 let svgHeight = parseInt(d3.select("svg").style("height"));
	 let newZoom = 1;
	 let newx = -hoverD.x*newZoom + (svgWidth/2);
	 let newy = -hoverD.y*newZoom + (svgHeight/2);
	 let t = d3.zoomIdentity.translate(newx, newy).scale(1);
	 d3.selectAll("svg").select("g.diagram").attr("transform", t);
	 d3.zoom().transform(d3.selectAll("svg"), t);
	 self.trigger("transform");
     }

     /** Calculate the closest point on a given busbar relative to a given point (a terminal) */
     closestPoint(source, point) {	 
         let line = d3.line()
	              .x(function(d) { return d.x; })
	              .y(function(d) { return d.y; });
	 
	 let pathNode = d3.select(document.createElementNS('http://www.w3.org/2000/svg', 'svg')).append("path").attr("d", line(source.lineData)).node(); 
	 
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
	     selection = d3.select("svg").selectAll("svg > g.diagram > g:not(.edges) > g");
	 }
	     
	 let transform = d3.zoomTransform(d3.select("svg").node());
	 let xoffset = transform.x; 
	 let yoffset = transform.y; 
	 let svgZoom = transform.k; 
	 updateElements(selection);

	 if (arguments.length === 1) {
	     let terminals = self.model.getTerminals(selection.data());
	     let links = d3.select("svg").selectAll("svg > g.diagram > g.edges > g").filter(function(d) {
		 return selection.data().indexOf(d.source) > -1 || terminals.indexOf(d.target) > -1;
	     });
	     self.updateEdges(xoffset, yoffset, svgZoom, links);
	 } else {
	     self.updateEdges(xoffset, yoffset, svgZoom);
	 }
	 
	 function updateElements(selection) {
	     selection.attr("transform", function (d) {
		 return "translate("+d.x+","+d.y+") rotate("+d.rotation+")";
	     }).selectAll("g.Terminal")
		      .attr("id", function(d, i) {
			  d.x = d3.select(this.parentNode).datum().x + parseInt(d3.select(this.firstChild).attr("cx"));
			  d.y = d3.select(this.parentNode).datum().y + parseInt(d3.select(this.firstChild).attr("cy"));
			  return d.attributes.getNamedItem("rdf:ID").value;
		      });
	     // if rotation is a multiple of 180, undo it (for readability)
	     selection.selectAll("text.cim-object-text")
		      .attr("transform", function (d) {
			  let textRotation = 0;
			  let rotationOrigin = {x:0, y:0};
			  if ((d.rotation%360) === 180) {
			      textRotation = d.rotation * (-1);
			  }
			  switch (d.nodeName) {
			      case "cim:Breaker":
			      case "cim:Disconnector":
			      case "cim:LoadBreakSwitch":
			      case "cim:Jumper":
			      case "cim:Junction":
				  rotationOrigin = {x:0, y:0};
				  break;
			      case "cim:PowerTransformer":
				  rotationOrigin = {x:0, y:30}; // TODO: define this constant
				  break;
			      default:
				  rotationOrigin = {x: d3.select(this).attr("x"),
						    y: d3.select(this).attr("y")};
				  break;
			  }
			  return "rotate("+textRotation+","+rotationOrigin.x+","+rotationOrigin.y+")";
		      });
	     selection.selectAll("rect.selection-rect")
		      .attr("x", 0)
	              .attr("y", 0)
	              .attr("width", 0)
	              .attr("height", 0);
	     selection.selectAll("rect.selection-rect")
		      .attr("x", function(d) {return this.parentNode.getBBox().x})
	              .attr("y", function(d) {return this.parentNode.getBBox().y})
	              .attr("width", function(d) {return this.parentNode.getBBox().width;})
	              .attr("height", function(d) {return this.parentNode.getBBox().height;});
	     selection.selectAll("g.resize").selectAll("rect")
		 .attr("x", function(d) {
		     let p = d[0].lineData.filter(el => el.seq === d[1])[0];
		     return p.x - 2;
		 })
		 .attr("y", function(d) {
		     let p = d[0].lineData.filter(el => el.seq === d[1])[0];
		     return p.y - 2;
		 });
	 };
     }

     addToDiagram(object) {
	 let m = d3.mouse(d3.select("svg").node());
	 let transform = d3.zoomTransform(d3.select("svg").node());
	 let xoffset = transform.x; 
	 let yoffset = transform.y; 
	 let svgZoom = transform.k; 
	 object.x = (m[0] - xoffset) / svgZoom;
	 object.px = object.x;
	 object.y = (m[1] - yoffset) / svgZoom;
	 object.py = object.y;
	 
	 let lineData = [{x: 0, y: 0, seq:1}]; // always OK except acline and busbar
	 if (object.nodeName === "cim:ACLineSegment" || object.nodeName === "cim:BusbarSection") {
	     lineData.push({x: 150, y: 0, seq:2});
	 }
	 self.model.addToActiveDiagram(object, lineData);
     }

     /** Update the given links. If links is absent, update all links */     
     updateEdges(xoffset, yoffset, svgZoom, links) {
	 // test
	 let svgWidth = parseInt(d3.select("svg").style("width"));
	 let svgHeight = parseInt(d3.select("svg").style("height"));
	 let xScale = d3.scaleLinear().domain([-xoffset/svgZoom, (svgWidth-xoffset)/svgZoom]).range([0, svgWidth]);
	 let yScale = d3.scaleLinear().domain([-yoffset/svgZoom, (svgHeight-yoffset)/svgZoom]).range([0, svgHeight]);
	 
	 let line = d3.line()
		      .x(function(d) { return d.x; })
		      .y(function(d) { return d.y; }); 
	 if (arguments.length === 3) {
	     links = d3.select("svg").selectAll("svg > g.diagram > g.edges > g"); /*.filter(function(d) {
		 return (typeof(d.p) === "undefined"); 
	     });*/
	 }

	 links.select("path")
	      .attr("d", function(d) {
		  let cnXY = {x: d.source.x, y: d.source.y};
		  let terminalXY = {x: d.target.x, y: d.target.y};
		  //if ((xScale(d.source.x) >= 0 && xScale(d.source.x) <= svgWidth) || (xScale(d.target.x) >= 0 && xScale(d.target.x) <= svgWidth)) {
		  //if ((yScale(d.source.y) >= 0 && yScale(d.source.y) <= svgHeight) || (yScale(d.target.y) >= 0 && yScale(d.target.y) <= svgHeight)) {
		  if (d.target.rotation > 0) {
		      terminalXY = rotateTerm(d.target);
		  }	
		  
		  d.p = self.closestPoint(d.source, terminalXY);
		  cnXY.x = cnXY.x + d.p[0];
		  cnXY.y = cnXY.y + d.p[1];
		  //} 
		  //}
		  let lineData = [cnXY, terminalXY];
		  return line(lineData);
	      });	     
	 
	 function rotateTerm(term) {
	     let equipment = self.model.getTargets(
		 [term],
		 "Terminal.ConductingEquipment",
		 "ConductingEquipment.Terminals")[0];
	     let baseX = equipment.x; 
	     let baseY = equipment.y; 	     
	     let cRot = self.rotate({x: term.x-baseX, y: term.y-baseY}, term.rotation);
	     let newX = baseX + cRot.x;
	     let newY = baseY + cRot.y;
	     return {x: newX, y: newY};
	 };
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
     
     distance2(p1, p2) {
	 let dx = p1.x - p2.x, 
	     dy = p1.y - p2.y; 
	 return dx * dx + dy * dy;
     }

     // draw the diagram grid
     drawGrid(zoom) {
	 let width = parseInt(d3.select("svg").style("width"))/zoom;
	 let height = parseInt(d3.select("svg").style("height"))/zoom;
	 let gridG = d3.select("svg").select("g.diagram-grid");
	 gridG.selectAll("*").remove();
	 const spacing = 25;
	 for (let j=spacing; j <= height-spacing; j=j+spacing) {
	     gridG.append("svg:line")
		  .attr("x1", 0)
		  .attr("y1", j)
		  .attr("x2", width)
		  .attr("y2", j)
		  .attr("stroke-dasharray", "1, 5")
		  .style("stroke", "rgb(6,120,155)")
		  .style("stroke-width", 1);
	 };
	 for (let j=spacing; j <= width-spacing; j=j+spacing) {
	     gridG.append("svg:line")
		  .attr("x1", j)
		  .attr("y1", 0)
		  .attr("x2", j)
		  .attr("y2", height)
		  .attr("stroke-dasharray", "1, 5")
		  .style("stroke", "rgb(6,120,155)")
		  .style("stroke-width", 1);
	 };
	 gridG.attr("transform", "scale(" + zoom + ")");
     }

    </script>

</cimDiagram>

