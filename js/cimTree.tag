/*
 This tag renders a tree view of a given CIM diagram.

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

<cimTree>
    <style>
     .tree {
	 max-height: 800px;
	 min-width: 500px;
	 overflow: scroll;
	 resize: horizontal;
     }

     .cim-tree-attribute-name {
	 text-align: left;
	 min-width: 170px;
     }

     .cim-tree-btn-group {
	 float: left;
	 width: 100%;
     }

     .cim-tree-dropdown-toggle {
	 width: 100%;
     }

     ul {
	 list-style-type: none;
     }
    </style>

    <div class="app-tree" id="app-tree">
	<div class="tree">
	    <form class="form-inline">
		<div class="form-group">
		    <input type="search" class="form-control" id="cim-search-key" placeholder="Search..."></input>
		</div>
		<button type="submit" class="btn btn-default" id="cimTreeSearchBtn">Search</button>
	    </form>
	    <form>
		<div class="checkbox">
		    <label>
			<input type="checkbox" id="showAllObjects"> Show all objects</input>
		    </label>
		</div>
	    </form>
	    <!-- Nav tabs -->
	    <ul class="nav nav-tabs" role="tablist">
		<li role="presentation" class="active"><a href="#components" aria-controls="components" role="tab" data-toggle="tab" id="componentsTab">Components</a></li>
		<li role="presentation"><a href="#containers" aria-controls="containers" role="tab" data-toggle="tab" id="containersTab">Containers</a></li>
		<li role="presentation"><a href="#measurements" aria-controls="measurements" role="tab" data-toggle="tab" id="measurementsTab">Measurements</a></li>
		<li role="presentation"><a href="#bases" aria-controls="bases" role="tab" data-toggle="tab" id="basesTab">Bases</a></li>
		<li role="presentation"><a href="#curvesAndRegs" aria-controls="curvesAndRegs" role="tab" data-toggle="tab" id="curvesAndRegsTab">Curves and Regulations</a></li>
	    </ul>
	    <div class="tab-content">
		<div role="tabpanel" class="tab-pane active" id="components">
		    <ul class="list-group" id="CIMComponents"></ul>
		</div>
		<div role="tabpanel" class="tab-pane" id="containers">
		    <ul class="list-group" id="CIMContainers"></ul>
		</div>
		<div role="tabpanel" class="tab-pane" id="measurements">
		    <ul class="list-group" id="CIMMeasurements"></ul>
		</div>
		<div role="tabpanel" class="tab-pane" id="bases">
		    <ul class="list-group" id="CIMBases"></ul>
		</div>
		<div role="tabpanel" class="tab-pane" id="curvesAndRegs">
		    <ul class="list-group" id="CIMCurvesAndRegs"></ul>
		</div>
	    </div>
	    
	</div>
    </div>    
    <script>
     "use strict";
     
     this.model = opts.model;	
     let self = this;
     let menu = [
	 {
	     title: 'Delete',
	     action: function(elm, d, i) {
		 opts.model.deleteObject(d);
	     }
	 }
     ];
     
     self.on("mount", function() {
	 // setup search button
	 $("#cimTreeSearchBtn").on("click", function() {
	     let searchKey = document.getElementById("cim-search-key").value;
	     $("ul").each(function() {
		 let toShow = $(this).find("li.CIM-object>a:contains(" + searchKey + ")");
		 let toHide = $(this).find("li.CIM-object>a:not(:contains(" + searchKey + "))");
		 toShow.parent().show();
		 toHide.parent().hide();
		 $(this).parent().find(">span").html(toShow.length);
	     });
	 });

	 $("#showAllObjects").change(function() {
	     self.createTree(this.checked);
	 });
     });

     // listen to 'showDiagram' event from parent
     self.parent.on("showDiagram", function(file, name, element) {
	 if (decodeURI(name) !== self.diagramName) {
	     d3.drag().on("drag.end", null);
	     self.render(name);
	 }
	 if (typeof(element) !== "undefined") {
	     self.moveTo(element);
	 } else {
	     // reset any element highlight
	     d3.select(".tree").selectAll(".btn-danger").attr("class", "btn btn-primary btn-xs");
	 }
     });

     // listen to 'addToActiveDiagram' event from model
     self.model.on("addToActiveDiagram", function(object) {
	 self.addNewObject(object);
     });
     
     addNewObject(object) {
	 let cimNetwork = d3.select("div.tree > div.tab-content > div.tab-pane > ul#CIMComponents");
	 let cimContainers = d3.select("div.tree > div.tab-content > div.tab-pane > ul#CIMContainers");
	 let cimMeasurements = d3.select("div.tree > div.tab-content > div.tab-pane > ul#CIMMeasurements");
	 let cimBases = d3.select("div.tree > div.tab-content > div.tab-pane > ul#CIMBases");
	 let cimCurvesAndRegs = d3.select("div.tree > div.tab-content > div.tab-pane > ul#CIMCurvesAndRegs");
	 let equivalents = undefined;
	 let rotMac = undefined;
	 let loads = undefined;
	 let genUnits = undefined;
	 switch (object.nodeName) {
	     case "cim:ACLineSegment":
		 self.elements(cimNetwork, "ACLineSegment", "AC Line Segments", [object]);
		 break;
	     case "cim:Breaker":
		 self.elements(cimNetwork, "Breaker", "Breakers", [object]);
		 break;
	     case "cim:Disconnector":
		 self.elements(cimNetwork, "Disconnector", "Disconnectors", [object]);
		 break;
	     case "cim:LoadBreakSwitch":
		 self.elements(cimNetwork, "LoadBreakSwitch", "Load Break Switches", [object]);
		 break;
	     case "cim:Jumper":
		 self.elements(cimNetwork, "Jumper", "Jumpers", [object]);
		 break;
	     case "cim:Junction":
		 self.elements(cimNetwork, "Junction", "Junctions", [object]);
		 break;
	     case "cim:EnergySource":
		 equivalents = self.createTopContainer(cimNetwork, "Equivalent", "Equivalents", [object]);
		 self.elements(equivalents, "EnergySource", "Energy Sources", [object]);
		 break;
	     case "cim:SynchronousMachine":
		 rotMac = self.createTopContainer(cimNetwork, "RotatingMachine", "RotatingMachines", [object]);
		 self.elements(rotMac, "SynchronousMachine", "Synchronous Machines", [object]);
		 break;
	     case "cim:AsynchronousMachine":
		 rotMac = self.createTopContainer(cimNetwork, "RotatingMachine", "RotatingMachines", [object]);
		 self.elements(rotMac, "AsynchronousMachine", "Asynchronous Machines", [object]);
		 break;
	     case "cim:EnergyConsumer":
		 loads = self.createTopContainer(cimNetwork, "Load", "Loads", [object]);
		 self.elements(loads, "EnergyConsumer", "Energy Consumers", [object]);
		 break;
	     case "cim:ConformLoad":
		 loads = self.createTopContainer(cimNetwork, "Load", "Loads", [object]);
		 self.elements(loads, "ConformLoad", "Conform Loads", [object]);
		 break;
	     case "cim:NonConformLoad":
		 loads = self.createTopContainer(cimNetwork, "Load", "Loads", [object]);
		 self.elements(loads, "NonConformLoad", "Non Conform Loads", [object]);
		 break;
	     case "cim:PowerTransformer":
		 self.elements(cimNetwork, "PowerTransformer", "Transformers", [object]);
		 break;
	     case "cim:BusbarSection":
		 self.elements(cimNetwork, "BusbarSection", "Nodes", [object]);
		 break;
	     case "cim:BaseVoltage":
		 let bvEnter = self.elements(cimBases, "BaseVoltage", "Base Voltages", [object]);
		 self.createDeleteMenu(bvEnter);
		 break;
	     case "cim:GeographicalRegion":
		 self.geoRegions(cimContainers, [object]);
		 break;
	     case "cim:SubGeographicalRegion":
		 let region = self.model.getTargets([object], "SubGeographicalRegion.Region");
		 let regionUUID = region[0].attributes.getNamedItem("rdf:ID").value;
		 let regionG = cimContainers.selectAll("ul#" + regionUUID);
		 self.subGeoRegions(regionG, [object]);
		 break;		 
	     case "cim:Substation":
		 self.substations(cimContainers, [object]);
		 break;
	     case "cim:VoltageLevel":
		 let vlSub = self.model.getTargets([object], "VoltageLevel.Substation");
		 let subUUID = vlSub[0].attributes.getNamedItem("rdf:ID").value;
		 let subG = cimContainers.selectAll("ul#" + subUUID);
		 self.voltageLevels(subG, [object]);
		 break;
	     case "cim:Bay":
		 let bayVl = self.model.getTargets([object], "Bay.VoltageLevel");
		 let vlUUID = bayVl[0].attributes.getNamedItem("rdf:ID").value;
		 let vlG = cimContainers.selectAll("ul#" + vlUUID);
		 self.bays(vlG, [object]);
		 break;
	     case "cim:Line":
		 let lineEnter = self.elements(cimContainers, "Line", "Lines", [object]);
		 self.createDeleteMenu(lineEnter);
		 break;
	     case "cim:GeneratingUnit":
		 genUnits = self.createTopContainer(cimContainers, "GeneralGeneratingUnit", "Generating Units", [object]);
		 self.elements(genUnits, "GeneratingUnit", "General Units", [object]);
		 break;
	     case "cim:ThermalGeneratingUnit":
		 genUnits = self.createTopContainer(cimContainers, "GeneralGeneratingUnit", "Generating Units", [object]);
		 self.elements(genUnits, "ThermalGeneratingUnit", "Thermal Units", [object]);
		 break;
	     case "cim:Analog":
		 let analogEnter = self.elements(cimMeasurements, "Analog", "Analogs", [object]);
		 self.createDeleteMenu(analogEnter);
		 break;
	     case "cim:Discrete":
		 let discEnter = self.elements(cimMeasurements, "Discrete", "Discretes", [object]);
		 self.createDeleteMenu(discEnter);
		 break;
	     case "cim:LoadResponseCharacteristic":
		 let lrEnter = self.elements(cimCurvesAndRegs, "LoadResponseCharacteristic", "Load Response Characteristics", [object]);
		 self.createDeleteMenu(lrEnter);
		 break;
	 }	 
     }

     // listen to 'deleteObject' event from model
     self.model.on("deleteObject", function(objectUUID) {
	 self.deleteObject(objectUUID);
     });

     // listen to 'deleteFromDiagram' event from model
     self.model.on("deleteFromDiagram", function(objectUUID) {
	 if ($("#showAllObjects").prop('checked') === false) {
	     self.deleteObject(objectUUID);
	 }
     });

     // listen to 'setAttribute' event from model
     self.model.on("setAttribute", function(object, attrName, value) {
	 if (attrName === "cim:IdentifiedObject.name") {
	     let type = object.localName;
	     let target = d3.select("div.tree")
			    .selectAll("ul#" + object.attributes.getNamedItem("rdf:ID").value);
	     if (target.empty() === false) {
		 let a = d3.select(target.node().parentNode).select("a");
		 a.html(value);
	     }
	     $("[cim-target=\"" + object.attributes.getNamedItem("rdf:ID").value + "\"]").html(value);
	 }
     });

     // listen to 'addLink' event from model
     self.model.on("addLink", function(source, linkName, target) {
	 let sourceUUID = source.attributes.getNamedItem("rdf:ID").value;
	 let sourceNode = d3.select(".tree").select("#" + sourceUUID);
	 let removeBtn = sourceNode.selectAll("#cimRemoveBtn").filter(function(d) {
	     return (d.attributes[0].value === "#" + linkName.split(":")[1]);
	 });
	 let linkBtn = sourceNode.selectAll("#cimLinkBtn").filter(function(d) {
	     return (d.attributes[0].value === "#" + linkName.split(":")[1]);
	 });

	 linkBtn.html(function() {
	     return self.model.getAttribute(target, "cim:IdentifiedObject.name").textContent;
	 }).attr("cim-target", function() {
	     return target.attributes.getNamedItem("rdf:ID").value;
	 }).attr("disabled", null);
	 sourceNode.selectAll("#cimTarget").attr("id", null);
	 removeBtn.attr("disabled", null);
     });

     // listen to 'removeLink' event from model
     self.model.on("removeLink", function(source, linkName, target) {
	 let sourceUUID = source.attributes.getNamedItem("rdf:ID").value;
	 let sourceNode = d3.select(".tree").select("#" + sourceUUID);
	 let removeBtn = sourceNode.selectAll("#cimRemoveBtn").filter(function(d) {
	     return (d.attributes[0].value === "#" + linkName.split(":")[1]);
	 });
	 let linkBtn = sourceNode.selectAll("#cimLinkBtn").filter(function(d) {
	     return (d.attributes[0].value === "#" + linkName.split(":")[1]);
	 });
	 removeBtn.attr("disabled", "disabled");
	 linkBtn.html("none")
		.attr("cim-target", "none")
		.attr("disabled", "disabled");
     });
     
     // listen to 'createdDiagram' event from model
     self.model.on("createdDiagram", function() {
	 self.diagramName = decodeURI(self.model.activeDiagramName);
	 $("#showAllObjects").prop("checked", true);
	 $("#showAllObjects").change();
     });

     createTree(showAllObjects) {
	 let treeRender = self.createTreeGenerator(showAllObjects);
	 function periodic() {
	     let ret = treeRender.next().value;
	     if (typeof(ret) !== "undefined") {
		 $("#loadingDiagramMsg").append("<br>" + ret);
		 setTimeout(periodic, 1);
	     } else {
		 self.parent.trigger("loaded");
	     }
	 };
	 periodic();
     }
     
     render(diagramName) {
	 self.model.selectDiagram(decodeURI(diagramName));
	 self.diagramName = decodeURI(diagramName);
	 $("#showAllObjects").prop("checked", false);
	 $("#showAllObjects").change();
     }

     self.createTreeGenerator = function*(showAllObjects) {
	 // clear all
	 d3.select("#app-tree").selectAll("#CIMComponents > li").remove();
	 d3.select("#app-tree").selectAll("#CIMContainers > li").remove();
	 d3.select("#app-tree").selectAll("#CIMMeasurements > li").remove();
	 d3.select("#app-tree").selectAll("#CIMBases > li").remove();
	 d3.select("#app-tree").selectAll("#CIMCurvesAndRegs > li").remove();
	 let cimNetwork = d3.select("div.tree > div.tab-content > div.tab-pane > ul#CIMComponents");
	 let cimContainers = d3.select("div.tree > div.tab-content > div.tab-pane > ul#CIMContainers");
	 let cimMeasurements = d3.select("div.tree > div.tab-content > div.tab-pane > ul#CIMMeasurements");
	 let cimBases = d3.select("div.tree > div.tab-content > div.tab-pane > ul#CIMBases");
	 let cimCurvesAndRegs = d3.select("div.tree > div.tab-content > div.tab-pane > ul#CIMCurvesAndRegs");
	 let contNames = ["cim:Substation", "cim:Line"];
	 let measNames = ["cim:Analog", "cim:Discrete"];
	 let genNames = ["cim:GeneratingUnit", "cim:ThermalGeneratingUnit"];
	 let allContainers = null;
	 let allMeasurements = null;
	 let allGeneratingUnits = null;
	 let allSubGeoRegions = null;
	 let allGeoRegions = null;
	 let allLoadResponses = null;
	 // setup the right function to get objects
	 let getObjects = self.model.getObjects;
	 let getConnectors = self.model.getObjects;
	 if (showAllObjects === false) {
	     getObjects = self.model.getGraphicObjects;
	     getConnectors = self.model.getConnectors;
	 }

	 // get all equipments
	 let allEquipments = getObjects([
	     "cim:BusbarSection",
	     "cim:PowerTransformer",
	     "cim:ACLineSegment",
	     "cim:Breaker",
	     "cim:Disconnector",
	     "cim:LoadBreakSwitch",
	     "cim:Jumper",
	     "cim:Junction",
	     "cim:EnergySource",
	     "cim:SynchronousMachine",
	     "cim:AsynchronousMachine",
	     "cim:EnergyConsumer",
	     "cim:ConformLoad",
	     "cim:NonConformLoad"
	 ]);
	 yield "[" + Date.now() + "] TREE: extracted equipments";
	 // get additional objects
	 allSubGeoRegions = getObjects(["cim:SubGeographicalRegion"])["cim:SubGeographicalRegion"];
	 allGeoRegions = getObjects(["cim:GeographicalRegion"])["cim:GeographicalRegion"];
	 if (showAllObjects === false) {
	     allContainers = self.model.getLinkedObjects(
		 contNames,
		 "EquipmentContainer.Equipments");
	     allMeasurements = self.model.getLinkedObjects(
		 measNames,
		 "Measurement.PowerSystemResource");
	     allGeneratingUnits = self.model.getLinkedObjects(
		 genNames,
		 "GeneratingUnit.RotatingMachine");
	     allSubGeoRegions = allSubGeoRegions.concat(
		 self.model.getTargets(
		     allContainers["cim:Substation"],
		     "Substation.Region"));
	     allGeoRegions = allGeoRegions.concat(
		 self.model.getTargets(
		     allSubGeoRegions,
		     "SubGeographicalRegion.Region"));
	     allSubGeoRegions = [...new Set(allSubGeoRegions)];
	     allGeoRegions = [...new Set(allGeoRegions)];
	     allLoadResponses = self.model.getLinkedObjects(
		 ["cim:LoadResponseCharacteristic"],
		 "LoadResponseCharacteristic.EnergyConsumer");
	 } else {
	     allContainers = getObjects(contNames);
	     allMeasurements = getObjects(measNames);
	     allGeneratingUnits = getObjects(genNames);
	     allLoadResponses = getObjects(["cim:LoadResponseCharacteristic"]);
	 }
	 let allBaseVoltages = self.model.getObjects(["cim:BaseVoltage"])["cim:BaseVoltage"]; 
	 let allBusbarSections = getConnectors(["cim:BusbarSection"])["cim:BusbarSection"]; 
	 let allPowerTransformers = allEquipments["cim:PowerTransformer"]; 
	 let allACLines = allEquipments["cim:ACLineSegment"]; 
	 let allBreakers = allEquipments["cim:Breaker"]; 
	 let allDisconnectors = allEquipments["cim:Disconnector"]; 
	 let allLoadBreakSwitches = allEquipments["cim:LoadBreakSwitch"]; 
	 let allJumpers = allEquipments["cim:Jumper"]; 
	 let allJunctions = allEquipments["cim:Junction"]; 
	 let allEnergySources = allEquipments["cim:EnergySource"];
	 let allRotatingMachines = allEquipments["cim:SynchronousMachine"]
	     .concat(allEquipments["cim:AsynchronousMachine"]);
	 let allEnergyConsumers = allEquipments["cim:EnergyConsumer"] 
	                              .concat(allEquipments["cim:ConformLoad"])
	                              .concat(allEquipments["cim:NonConformLoad"]);
	 let allSubstations = allContainers["cim:Substation"];
	 yield "[" + Date.now() + "] TREE: extracted substations";
	 let allLines = allContainers["cim:Line"];
	 yield "[" + Date.now() + "] TREE: extracted lines";
	 let analogEnter = self.elements(cimMeasurements, "Analog", "Analogs", allMeasurements["cim:Analog"]);
	 self.createDeleteMenu(analogEnter);
	 let discEnter = self.elements(cimMeasurements, "Discrete", "Discretes", allMeasurements["cim:Discrete"]);
	 self.createDeleteMenu(discEnter);
	 self.elements(cimNetwork, "ACLineSegment", "AC Line Segments", allACLines);
	 let bvEnter = self.elements(cimBases, "BaseVoltage", "Base Voltages", allBaseVoltages);
	 self.createDeleteMenu(bvEnter);
	 self.elements(cimNetwork, "Breaker", "Breakers", allBreakers);
	 self.elements(cimNetwork, "Disconnector", "Disconnectors", allDisconnectors);
	 self.elements(cimNetwork, "LoadBreakSwitch", "Load Break Switches", allLoadBreakSwitches);
	 self.elements(cimNetwork, "Jumper", "Jumpers", allJumpers);
	 self.elements(cimNetwork, "Junction", "Junctions", allJunctions);
	 let allEquivalents = self.createTopContainer(cimNetwork, "Equivalent", "Equivalents", allEnergySources);
	 self.elements(allEquivalents, "EnergySource", "Energy Sources", allEquipments["cim:EnergySource"]);
	 let allRotMac = self.createTopContainer(cimNetwork, "RotatingMachine", "Rotating Machines", allRotatingMachines);
	 self.elements(allRotMac, "SynchronousMachine", "Synchronous Machines", allEquipments["cim:SynchronousMachine"]);
	 self.elements(allRotMac, "AsynchronousMachine", "Asynchronous Machines", allEquipments["cim:AsynchronousMachine"]);
	 let allLoads = self.createTopContainer(cimNetwork, "Load", "Loads", allEnergyConsumers);
	 self.elements(allLoads, "EnergyConsumer", "Energy Consumers", allEquipments["cim:EnergyConsumer"]);
	 self.elements(allLoads, "ConformLoad", "Conform Loads", allEquipments["cim:ConformLoad"]);
	 self.elements(allLoads, "NonConformLoad", "Non Conform Loads", allEquipments["cim:NonConformLoad"]);
	 self.elements(cimNetwork, "BusbarSection", "Nodes", allBusbarSections);

	 self.geoRegions(cimContainers, allGeoRegions);
	 self.substations(cimContainers, allSubstations);
	 let trafoEnter = self.elements(cimNetwork, "PowerTransformer", "Transformers", allPowerTransformers);
	 trafoEnter.each(function(d, i) {
	     let trafoEnds = self.model.getTargets(
		 [d],
		 "PowerTransformer.PowerTransformerEnd");
	     self.elements(
		 d3.select(this),
		 d.attributes.getNamedItem("rdf:ID").value + "PowerTransformerEnd",
		 "Transformer Windings",
		 trafoEnds);
	 });
	 let lineEnter = self.elements(cimContainers, "Line", "Lines", allLines);
	 self.createDeleteMenu(lineEnter);
	 let allGenUnits = self.createTopContainer(cimContainers, "GeneralGeneratingUnit", "Generating Units", allGeneratingUnits["cim:GeneratingUnit"].concat(allGeneratingUnits["cim:ThermalGeneratingUnit"]));
	 self.elements(allGenUnits, "GeneratingUnit", "General Units", allGeneratingUnits["cim:GeneratingUnit"]);
	 self.elements(allGenUnits, "ThermalGeneratingUnit", "Thermal Units", allGeneratingUnits["cim:ThermalGeneratingUnit"]);
	 self.elements(cimCurvesAndRegs, "LoadResponseCharacteristic", "Load Response Characteristics", allLoadResponses["cim:LoadResponseCharacteristic"]);

	 // add buttons
	 self.createAddButton(cimBases, "BaseVoltage");
	 self.createAddButton(cimContainers, "Substation");
	 self.createAddButton(cimContainers, "GeographicalRegion");
	 self.createAddButton(cimContainers, "Line");
	 self.createAddButton(cimContainers, "GeneratingUnit");
	 self.createAddButton(cimContainers, "ThermalGeneratingUnit");
	 self.createAddButton(cimCurvesAndRegs, "LoadResponseCharacteristic");
     }

     geoRegions(tab, allGeoRegions) {
	 let geoEnter = self.elements(tab, "GeographicalRegion", "Geographical Regions", allGeoRegions);
	 geoEnter.each(function(d, i) {
	     let subGeos = self.model.getTargets(
		 [d],
		 "GeographicalRegion.Regions");
	     self.subGeoRegions(
		 d3.select(this),
		 subGeos);
	     self.subAddButton(
		 d3.select(this),
		 "SubGeographicalRegion",
		 "cim:SubGeographicalRegion.Region");
	 });
	 self.createDeleteMenu(geoEnter);
     }

     subGeoRegions(geoG, subGeos) {
	 let geo = geoG.data()[0];
	 let subGeoEnter = self.elements(
	     geoG,
	     geo.attributes.getNamedItem("rdf:ID").value + "SubGeographicalRegion",
	     "Sub-Geographical Regions",
	     subGeos);
	 self.createDeleteMenu(subGeoEnter);	 
     }

     substations(tab, allSubstations) {
	 let subEnter = self.elements(tab, "Substation", "Substations", allSubstations);
	 subEnter.each(function(d, i) {
	     let vlevs = self.model.getTargets(
		 [d],
		 "Substation.VoltageLevels");
	     self.voltageLevels(
		 d3.select(this),
		 vlevs);
	     self.subAddButton(
		 d3.select(this),
		 "VoltageLevel",
		 "cim:VoltageLevel.Substation");
	 });
	 self.createDeleteMenu(subEnter);
     }

     voltageLevels(subG, vlevs) {
	 let sub = subG.data()[0];
	 let vlEnter = self.elements(
	     subG,
	     sub.attributes.getNamedItem("rdf:ID").value + "VoltageLevel",
	     "Voltage Levels",
	     vlevs);
	 vlEnter.each(function(d, i) {
	     let bays = self.model.getTargets(
		 [d],
		 "VoltageLevel.Bays");
	     self.bays(
		 d3.select(this),
		 bays);
	     self.subAddButton(
		 d3.select(this),
		 "Bay",
		 "cim:Bay.VoltageLevel");
	 });
	 self.createDeleteMenu(vlEnter);
     }

     bays(vlG, bays) {
	 let vl = vlG.data()[0];
	 let bayEnter = self.elements(
	     vlG,
	     vl.attributes.getNamedItem("rdf:ID").value + "Bay",
	     "Bays",
	     bays);
	 self.createDeleteMenu(bayEnter);
     }

     createTopContainer(cimNetwork, name, printName, data) {
	 let elementsTopContainer = cimNetwork.select("li." + name + "s");
	 let elements = elementsTopContainer.select("ul#" + name + "sList");
	 if (elementsTopContainer.empty()) {
	     elementsTopContainer = cimNetwork
		.append("li")
		.attr("class", name + "s" + " list-group-item cim-parent-container");
	     elementsTopContainer.append("a")
				 .attr("class", "btn btn-primary btn-xs")
				 .attr("role", "button")
				 .attr("data-toggle", "collapse")
				 .attr("href", "#" + name + "sList")
				 .html(printName);
	     elementsTopContainer.append("span")
				 .attr("class", "badge")
				 .html(0);
	     elements = elementsTopContainer
		.append("ul")
		.attr("id", name + "sList")
		.attr("class", "collapse");
	 } 
	 return elements;
     }

     // add button for non-graphical onbjects
     createAddButton(cimContainer, name) {
	 let elementsTopContainer = cimContainer.select("li." + name + "s");
	 let elements = elementsTopContainer.select("ul#" + name + "sList");
	 let addBtn = elementsTopContainer.select("ul#" + name + "sList > button.cim-add-btn");
	 if (addBtn.empty() === true) {
	     addBtn = elements
		 .insert("li", ":first-child")
		 .append("button")
		 .attr("class", "btn btn-default btn-xs cim-add-btn")
		 .attr("type", "submit");
	     addBtn.html("<span class=\"glyphicon glyphicon-plus\" aria-hidden=\"true\"></span> Add");
	     addBtn.on("click.add", function() {
		 let newObject = self.model.createObject("cim:" + name);
		 self.model.addToActiveDiagram(newObject, []);
	     });
	 }
     }

     subAddButton(cimContainer, type, link) {
	 let parent = cimContainer.data()[0];
	 let name = parent.attributes.getNamedItem("rdf:ID").value + type;
	 let elementsTopContainer = cimContainer.select("li." + name + "s");
	 let elements = elementsTopContainer.select("ul#" + name + "sList");
	 let addBtn = elementsTopContainer.select("ul#" + name + "sList > button.cim-add-btn");
	 if (addBtn.empty() === true) {
	     addBtn = elements
		 .insert("li", ":first-child")
		 .append("button")
		 .attr("class", "btn btn-default btn-xs cim-add-btn")
		 .attr("type", "submit");
	     addBtn.html("<span class=\"glyphicon glyphicon-plus\" aria-hidden=\"true\"></span> Add");
	     addBtn.on("click.add", function() {
		 let newObject = self.model.createObject("cim:" + type);
		 self.model.setLink(newObject, link, parent);
		 self.model.addToActiveDiagram(newObject, []);
	     });
	 }
     }

     // delete menu for non graphic objects
     createDeleteMenu(selection) {
	 let btnSel = selection.selectAll(function() { return this.parentNode.childNodes; }).filter("a");
	 btnSel.on("contextmenu", d3.contextMenu(menu));
     }

     elements(cimNetwork, name, printName, data) {
	 let elementsTopContainer = cimNetwork.select("li." + name + "s");
	 let elements = elementsTopContainer.select("ul#" + name + "sList");
	 if (elementsTopContainer.empty() === true) {
	     elementsTopContainer = cimNetwork
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
				 .html(0);
	     elements = elementsTopContainer
		.append("ul")
		.attr("id", name + "sList")
		.attr("class", "collapse");
	 } 

	 let elementTopContainer = elements
		.selectAll("li." + name)
		.data(data, function(d) {
		    return d.attributes.getNamedItem("rdf:ID").value;
		})
		.enter()
		.append("li")
		.attr("class", name + " CIM-object");
	 let cimModel = this.model;
	 elementTopContainer
	     .append("a")
	     .attr("class", "btn btn-primary btn-xs")
	     .attr("role", "button")
	     .attr("data-toggle", "collapse")
	     .attr("href", function(d) {
		 return "#" + d.attributes.getNamedItem("rdf:ID").value;
	     })
	     .on("click", function (d) {
		 // check if we are changing some link
		 let linkToChange = d3.select("#cimTarget");
		 if (linkToChange.empty() === false) {
		     let target = d3.select($(linkToChange.node()).parents("ul").first().get(0)).data()[0]; 
		     let targetLink = linkToChange.data()[0];
		     let targetLinkName = "cim:" + targetLink.attributes[0].value.substring(1);
		     cimModel.setLink(target, targetLinkName, d);
		     self.scrollAndRouteTo("#" + target.attributes.getNamedItem("rdf:ID").value);
		     // we need to disable the collapse logic
		     $(this).parent().find("ul").on("show.bs.collapse hide.bs.collapse", function(e) {
			 e.preventDefault();
			 $(this).parent().find("ul").off("show.bs.collapse hide.bs.collapse");
		     });
		 } else {
		     // if necessary, generate attributes and links
		     let elementEnter = d3.select(this.parentNode).select("ul");
		     if (elementEnter.selectAll("li.attribute").size() === 0) {
			 self.generateAttrsAndLinks(elementEnter);
		     }
		     // change address to 'this object'
		     let hashComponents = window.location.hash.substring(1).split("/");
		     let basePath = hashComponents[0] + "/" + hashComponents[1] + "/" + hashComponents[2];
		     if (window.location.hash.substring(1) !== basePath + "/" + d.attributes.getNamedItem("rdf:ID").value) {
			 route(basePath + "/" + d.attributes.getNamedItem("rdf:ID").value);
		     }
		 }
	     })
	     .html(function (d) {
		 let name = cimModel.getAttribute(d, "cim:IdentifiedObject.name");
		 if (typeof(name) !== "undefined") {
		     return name.innerHTML;
		 }
		 return "unnamed";
	     })
	     .call(d3.drag().on("end", function(d) {
		 cimModel.trigger("dragend", d);
	     }));
	 let elementEnter = elementTopContainer
	     .append("ul")
	     .attr("id", function(d) {
		 return d.attributes.getNamedItem("rdf:ID").value;
	     })
	     .attr("class", "collapse");
	 // update element count
	 let elementCount = parseInt(elementsTopContainer.select("span").html());
	 elementCount = elementCount + elementEnter.size();
	 elementsTopContainer.select("span").html(elementCount);
	 // update also the top containers (if any)
	 let tcNode = elementsTopContainer.node(); 
	 $(tcNode).parents("li.cim-parent-container")
		  .find(">span")
		  .each(function() {
		      let elementCount = parseInt($(this).html());
		      elementCount = elementCount + elementEnter.size();
		      $(this).html(elementCount);
		  });
	 return elementEnter;
     }

     generateAttrsAndLinks(elementEnter) {
	 let elementDiv = elementEnter
		.selectAll("li.attribute")
		.data(function(d) {
		    return self.model.getSchemaAttributes(d.localName); 
		})
		.enter()
		.append("li")
		.attr("class", "attribute")
		.attr("title", function(d) {
		    return [].filter.call(d.children, function(el) {
			return el.nodeName === "rdfs:comment"
		    })[0].textContent;
		})
		.append("div").attr("class", "input-group input-group-sm");
	 elementDiv.append("span").attr("id", "sizing-addon3").attr("class", "input-group-addon cim-tree-attribute-name")
		.html(function (d) {
		    return d.attributes[0].value.substring(1).split(".")[1]; 
		});
	 // String attributes 
	 elementDiv.filter(function(d) {
	     let attrType = self.model.getSchemaAttributeType(d);
	     return attrType[0] === "#String";
	 }).append("input")
		   .attr("class", "form-control")
		   .each(setValueFromModel)
		   .attr("type", "text")
		   .on("input", attrInput);
	 // Integer attributes
	 elementDiv.filter(function(d) {
	     let attrType = self.model.getSchemaAttributeType(d);
	     return attrType[0] === "#Integer";
	 }).append("input")
		   .attr("class", "form-control")
		   .each(setIntValueFromModel)
		   .attr("type", "number")
	 	   .on("input", attrInput);
	 // Float attributes
	 elementDiv.filter(function(d) {
	     let attrType = self.model.getSchemaAttributeType(d);
	     return (attrType[0] === "#Float" || attrType[0] === "#Decimal");
	 }).append("input")
		   .attr("class", "form-control")
		   .each(setFloatValueFromModel)
		   .attr("type", "number")
		   .attr("step", "0.00001")
	 	   .on("input", attrInput);
	 // Boolean attributes
	 let elementBool = elementDiv.filter(function(d) {
	     let attrType = self.model.getSchemaAttributeType(d);
	     return attrType[0] === "#Boolean";
	 }).append("div").attr("class", "input-group-btn cim-tree-btn-group");
	 let elementBoolBtn = elementBool.append("button").attr("type", "button")
		    .attr("class", "btn btn-default dropdown-toggle cim-tree-dropdown-toggle")
		    .attr("data-toggle", "dropdown")
		    .attr("aria-haspopup", "true")
		    .attr("aria-expanded", "false");
	 elementBoolBtn.append("span").attr("class", "boolVal").each(setBoolValueFromModel);
	 elementBoolBtn.append("span").attr("class", "caret");
	 let elementBoolList = elementBool.append("ul").attr("class", "dropdown-menu");
	 elementBoolList.append("li").on("click", setBoolAttr).append("a").text("true");
	 elementBoolList.append("li").on("click", setBoolAttr).append("a").text("false");
	 // Enum attributes
	 let elementEnum = elementDiv.filter(function(d) {
	     return self.model.isEnum(d);
	 }).append("div").attr("class", "input-group-btn cim-tree-btn-group");
	 let elementEnumBtn = elementEnum.append("button").attr("type", "button")
		    .attr("class", "btn btn-default dropdown-toggle cim-tree-dropdown-toggle")
		    .attr("data-toggle", "dropdown")
		    .attr("aria-haspopup", "true")
		    .attr("aria-expanded", "false");
	 elementEnumBtn.append("span").attr("class", "enumVal").each(setEnumValueFromModel);
	 elementEnumBtn.append("span").attr("class", "caret");
	 let elementEnumList = elementEnum.append("ul").attr("class", "dropdown-menu");
	 elementEnumList
	     .selectAll("li")
	     .data(function(d) {
		 return self.model.getSchemaEnumValues(d);
	     })
	     .enter()
	     .append("li")
	     .on("click", setEnumAttr)
	     .append("a")
	     .text(function(d) {
		 return d;
	     });
	 function setValueFromModel(d) {
	     let object = d3.select($(this).parents("li.attribute").first().parent().get(0)).data()[0];
	     let value = self.model.getAttribute(object, "cim:" + d.attributes[0].value.substring(1));
	     if (typeof(value) !== "undefined") {
		 this.value = value.innerHTML;
	     } else { 
		 d3.select(this).attr("placeholder", "none");
	     }
	 };
	 function setIntValueFromModel(d) {
	     let object = d3.select($(this).parents("ul").first().get(0)).data()[0]; 
	     let value = self.model.getAttribute(object, "cim:" + d.attributes[0].value.substring(1));
	     if (typeof(value) !== "undefined") {
		 this.value = parseInt(value.innerHTML);
	     } else { 
		 d3.select(this).attr("placeholder", "none");
	     }
	 };
	 function setFloatValueFromModel(d) {
	     let object = d3.select($(this).parents("ul").first().get(0)).data()[0]; 
	     let value = self.model.getAttribute(object, "cim:" + d.attributes[0].value.substring(1));
	     if (typeof(value) !== "undefined") {
		 this.value = parseFloat(value.innerHTML).toFixed(5);
	     } else { 
		 d3.select(this).attr("placeholder", "none");
	     }
	 };
	 function setBoolValueFromModel(d) {
	     let object = d3.select($(this).parents("li.attribute").first().parent().get(0)).data()[0];
	     let value = self.model.getAttribute(object, "cim:" + d.attributes[0].value.substring(1));
	     if (typeof(value) !== "undefined") {
		 d3.select(this).text(value.innerHTML);
	     } else { 
		 d3.select(this).text("none");
	     }
	 };
	 function setEnumValueFromModel(d) {
	     let object = d3.select($(this).parents("li.attribute").first().parent().get(0)).data()[0];
	     let value = self.model.getEnum(object, "cim:" + d.attributes[0].value.substring(1));
	     if (typeof(value) !== "undefined") {
		 let enumRef = value.attributes.getNamedItem("rdf:resource").value;
		 d3.select(this).text(enumRef.split("#")[1].split(".")[1]);
	     } else { 
		 d3.select(this).text("none");
	     }
	 };
	 // set a boolean attribute according to user input
	 function setBoolAttr(d) {
	     // change the element's text
	     let value = d3.select(this).selectAll("a").node().textContent;
	     $(this).parent().parent().find(">button>span.boolVal").text(value);
	     let object = d3.select($(this).parents("li.attribute").first().parent().get(0)).data()[0];
	     let attrName = "cim:" + d.attributes[0].value.substring(1);
	     // update the model
	     self.model.setAttribute(object, attrName, value);
	 };
	 // set an enum attribute according to user input
	 function setEnumAttr(d) {
	     // change the element's text
	     $(this).parent().parent().find(">button>span.enumVal").text(d);
	     let object = d3.select($(this).parents("li.attribute").first().parent().get(0)).data()[0];
	     let attr = d3.select($(this).parents("li.attribute").first().get(0)).data()[0];
	     let attrName = "cim:" + attr.attributes[0].value.substring(1);
	     let value = self.model.getSchemaEnumName(attr) + "." + d;
	     // update the model
	     self.model.setEnum(object, attrName, value);
	 };
	 function attrInput(d) {
	     let object = d3.select($(this).parents("ul").first().get(0)).data()[0];
	     let attrName = "cim:" + d.attributes[0].value.substring(1);
	     self.model.setAttribute(object, attrName, this.value);
	 };
	 // add links
	 let elementLink = elementEnter
	        .selectAll("li.link")
	        .data(function(d) {
		    return self.model.getSchemaLinks(d.localName)
			       .filter(el => self.model.getAttribute(el, "cims:AssociationUsed").textContent === "Yes")
			       .filter(el => el.attributes[0].value !== "#TransformerEnd.Terminal")
			       .filter(el => el.attributes[0].value !== "#Measurement.Terminal")
			       .filter(el => el.attributes[0].value !== "#Measurement.PowerSystemResource")
			       .filter(el => el.attributes[0].value !== "#Discrete.ValueAliasSet"); 
		})
	        .enter()
	        .append("li")
		.attr("class", "link").attr("title", function(d) {
		    return [].filter.call(d.children, function(el) {
			return el.nodeName === "rdfs:comment"
		    })[0].textContent;
		}).append("div").attr("class", "input-group input-group-sm");
	 elementLink.append("span").attr("id", "sizing-addon3").attr("class", "input-group-addon cim-tree-attribute-name")
		.html(function (d) {
		    return d.attributes[0].value.substring(1).split(".")[1]; 
		});
	 let elementLinkBtn = elementLink.append("div").attr("class", "input-group-btn cim-tree-btn-group");
	 elementLinkBtn.append("button")
		       .attr("class","btn btn-default btn-xs")
	 	       .attr("id", "cimLinkBtn")
		       .attr("type", "submit")
		       .on("click", function (d) {
			   let targetUUID = "#" + d3.select(this).attr("cim-target"); 
			   self.scrollAndRouteTo(targetUUID);
		       })
		       .attr("cim-target", function(d) {
			   let source = d3.select($(this).parents("ul").first().get(0)).data()[0];
			   let targetObj = self.model.getTargets(
			       [source],
			       d.attributes[0].value.substring(1))[0];
			   if (typeof(targetObj) === "undefined") {
			       return "none";
			   }
			   return targetObj.attributes.getNamedItem("rdf:ID").value;
		       })
		       .html(function (d) {
			   let targetObj = self.model.getObject(d3.select(this).attr("cim-target"));
			   if (typeof(targetObj) === "undefined") {
			       d3.select(this).attr("disabled", "disabled");
			       return "none";
			   }
			   let name = self.model.getAttribute(targetObj, "cim:IdentifiedObject.name");
			   if (typeof(name) !== "undefined") {
			       return name.innerHTML;
			   }
			   return "unnamed";
		    });
	 elementLinkBtn.append("button")
	            .attr("class","btn btn-default btn-xs")
	            .attr("type", "submit")
	            .on("click", function (d) {
			$(this).parent().attr("id", "cimTarget");
		    })
	            .html("change");
	 elementLinkBtn.append("button")
	               .attr("class","btn btn-default btn-xs")
	               .attr("type", "submit")
		       .attr("id", "cimRemoveBtn")
	               .on("click", function (d) {
			   let source = d3.select($(this).parents("ul").first().get(0)).data()[0];
			   let linkName = "cim:" + d.attributes[0].value.substring(1);
			   let target = self.model.getObject($(this).parent().find("[cim-target]").attr("cim-target"));
			   self.model.removeLink(source, linkName, target);
		       })
	               .html(function() {
			   let target = self.model.getObject($(this).parent().find("[cim-target]").attr("cim-target"));
			   if (typeof(target) === "undefined") {
			       d3.select(this).attr("disabled", "disabled");
			   }
			   return "remove";
		       });
     }

     moveTo(uuid) {
	 let target = null, targetChild = null;
	 let hoverD = self.model.getObject(uuid);
	 // handle connectivity nodes
	 if (hoverD.nodeName === "cim:ConnectivityNode") {
	     let equipments = self.model.getEquipments(hoverD);
	     // let's try to get a busbar section
	     let busbarSection = equipments.filter(el => el.localName === "BusbarSection")[0];
	     if (typeof(busbarSection) === "undefined") {
		 return;
	     }
	     uuid = busbarSection.attributes.getNamedItem("rdf:ID").value;
	 } 
	 targetChild = d3.select(".tree").select("#" + uuid).node();
	 if (targetChild === null) {
	     return;
	 }
	 target = targetChild.parentNode;
	 d3.select(".tree").selectAll(".btn-danger").attr("class", "btn btn-primary btn-xs");
	 // show the relevant tab
	 let tabId = $(target).parents("div.tab-pane").first().attr("id") + "Tab";
	 $("#" + tabId).tab("show");
	 d3.select(target).select("a").attr("class", "btn btn-danger btn-xs");
	 self.scrollAndRouteTo("#" + uuid);
     }
     
     deleteObject(objectUUID) {
	 let cimObject = d3.select("div.tree").select("ul#" + objectUUID).node();
	 if (cimObject !== null) {
	     let cimObjectContainer = cimObject.parentNode;
	     // update element count
	     $(cimObjectContainer)
		 .parents("li.list-group-item")
		 .first()
		 .find(">span")
		 .each(function() {
		     let elementCount = parseInt($(this).html());
		     elementCount = elementCount - 1;
		     $(this).html(elementCount);
		 });
	     $(cimObjectContainer)
		 .parents("li.cim-parent-container")
		 .find(">span")
		 .each(function() {
		     let elementCount = parseInt($(this).html());
		     elementCount = elementCount - 1;
		     $(this).html(elementCount);
		 });
	     // remove object
	     cimObjectContainer.remove();
	 }
     }

     scrollAndRouteTo(targetUUID) {
	 if ($(targetUUID).parents(".collapse:not(.in)").last().length !== 0) {
	     $(targetUUID).parents(".collapse:not(.in)").last().on("shown.bs.collapse", function() {
		 scrollAndRouteToVisible(targetUUID);
		 $(this).off("shown.bs.collapse");
	     });
	 } else {
	     scrollAndRouteToVisible(targetUUID);
	 }
	 $(targetUUID).parents(".collapse:not(.in)").collapse("show");

	 function scrollAndRouteToVisible(targetUUID) {
	     $(".tree").scrollTop(
		 $(".tree").scrollTop() + (
		     $(".tree").find(targetUUID).parent().offset().top - $(".tree").offset().top
		 )
	     );
	     let hashComponents = window.location.hash.substring(1).split("/");
	     let basePath = hashComponents[0] + "/" + hashComponents[1] + "/" + hashComponents[2];
	     route(basePath + "/" + targetUUID.substring(1));
	 };
     }

     
    </script> 
    
</cimTree>
