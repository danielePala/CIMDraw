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

     .cim-tree-link-btn {
	 float: left;
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
		<li role="presentation" class="active"><a href="#home" aria-controls="home" role="tab" data-toggle="tab">Components</a></li>
		<li role="presentation"><a href="#profile" aria-controls="profile" role="tab" data-toggle="tab">Assets</a></li>
	    </ul>
	    <div class="tab-content">
		<div role="tabpanel" class="tab-pane active" id="home">
		    <ul class="CIMNetwork list-group"></ul>
		</div>
		<div role="tabpanel" class="tab-pane" id="profile">...</div>
	    </div>
	    
	</div>
    </div>    
    <script>
     "use strict";
     
     this.model = opts.model;	
     let self = this;

     self.on("mount", function() {
	 // setup search button
	 $("#cimTreeSearchBtn").on("click", function() {
	     let searchKey = document.getElementById("cim-search-key").value;
	     $(".CIMNetwork>li>ul").each(function() {
		 let toShow = $(this).find(">li>a:contains(" + searchKey + ")");
		 let toHide = $(this).find(">li>a:not(:contains(" + searchKey + "))");
		 toShow.parent().show();
		 toHide.parent().hide();
		 $(this).parent().find(">span").html(toShow.size());
	     });
	 });

	 $("#showAllObjects").change(function() {
	     if (this.checked === true) {
		 self.createTree(self.model.getObjects1, self.model.getObjects);
	     } else {
		 self.createTree(self.model.getGraphicObjects1, self.model.getEquipmentContainers);
	     }
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
	 }
     });

     // listen to 'addToActiveDiagram' event from model
     self.model.on("addToActiveDiagram", function(object) {
	 if ($("#showAllObjects").prop('checked') === false) {
	     self.addNewObject(object);
	 }
     });
     
     // listen to 'createObject' event from model
     self.model.on("createObject", function(object) {
	 if ($("#showAllObjects").prop('checked') === true) {
	     self.addNewObject(object);
	 }
     });

     addNewObject(object) {
	 let cimNetwork = d3.select("div.tree").selectAll("ul.CIMNetwork");
	 let generators = undefined;
	 let loads = undefined;
	 switch (object.nodeName) {
	     case "cim:ACLineSegment":
		 self.createElements(cimNetwork, "ACLineSegment", "AC Line Segments", [object]);
		 break;
	     case "cim:Breaker":
		 self.createElements(cimNetwork, "Breaker", "Breakers", [object]);
		 break;
	     case "cim:Disconnector":
		 self.createElements(cimNetwork, "Disconnector", "Disconnectors", [object]);
		 break;
	     case "cim:LoadBreakSwitch":
		 self.createElements(cimNetwork, "LoadBreakSwitch", "Load Break Switches", [object]);
		 break;
	     case "cim:Jumper":
		 self.createElements(cimNetwork, "Jumper", "Jumpers", [object]);
		 break;
	     case "cim:Junction":
		 self.createElements(cimNetwork, "Junction", "Junctions", [object]);
		 break;
	     case "cim:EnergySource":
		 generators = self.createTopContainer(cimNetwork, "Generator", "Generators", [object]);
		 self.createElements(generators, "EnergySource", "Energy Sources", [object]);
		 break;
	     case "cim:SynchronousMachine":
		 generators = self.createTopContainer(cimNetwork, "Generator", "Generators", [object]);
		 self.createElements(generators, "SynchronousMachine", "Synchronous Machines", [object]);
		 break;
	     case "cim:EnergyConsumer":
		 loads = self.createTopContainer(cimNetwork, "Load", "Loads", [object]);
		 self.createElements(loads, "EnergyConsumer", "Energy Consumers", [object]);
		 break;
	     case "cim:ConformLoad":
		 loads = self.createTopContainer(cimNetwork, "Load", "Loads", [object]);
		 self.createElements(loads, "ConformLoad", "Conform Loads", [object]);
		 break;
	     case "cim:NonConformLoad":
		 loads = self.createTopContainer(cimNetwork, "Load", "Loads", [object]);
		 self.createElements(loads, "NonConformLoad", "Non Conform Loads", [object]);
		 break;
	     case "cim:PowerTransformer":
		 self.createElements(cimNetwork, "PowerTransformer", "Transformers", [object]);
		 break;
	     case "cim:BusbarSection":
		 self.createElements(cimNetwork, "BusbarSection", "Nodes", [object]);
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

     createTree(getObjects, getContainers) {
	 let treeRender = self.createTreeGenerator(getObjects, getContainers);
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

     self.createTreeGenerator = function*(getObjects, getContainers) {
	 // clear all
	 d3.select("#app-tree").selectAll(".CIMNetwork > li").remove();

	 let allEquipments = getObjects([
	     "cim:BaseVoltage",
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
	     "cim:EnergyConsumer",
	     "cim:ConformLoad",
	     "cim:NonConformLoad"
	 ]);

	 // base voltages don't depend on diagram
	 let allBaseVoltages = self.model.getObjects("cim:BaseVoltage"); 
	 let allBusbarSections = allEquipments["cim:BusbarSection"]; 
	 let allPowerTransformers = allEquipments["cim:PowerTransformer"]; 
	 let allACLines = allEquipments["cim:ACLineSegment"]; 
	 let allBreakers = allEquipments["cim:Breaker"]; 
	 let allDisconnectors = allEquipments["cim:Disconnector"]; 
	 let allLoadBreakSwitches = allEquipments["cim:LoadBreakSwitch"]; 
	 let allJumpers = allEquipments["cim:Jumper"]; 
	 let allJunctions = allEquipments["cim:Junction"]; 
	 let allEnergySources = allEquipments["cim:EnergySource"] 
	     .concat(allEquipments["cim:SynchronousMachine"]);
	 let allEnergyConsumers = allEquipments["cim:EnergyConsumer"] 
	                              .concat(allEquipments["cim:ConformLoad"])
	                              .concat(allEquipments["cim:NonConformLoad"]);
	 yield "[" + Date.now() + "] TREE: extracted equipments";
	 
	 let allSubstations = getContainers("cim:Substation");
	 yield "[" + Date.now() + "] TREE: extracted substations";
	 let allLines = getContainers("cim:Line");
	 yield "[" + Date.now() + "] TREE: extracted lines";
	 
	 let cimNetwork = d3.select("div.tree > div.tab-content > div.tab-pane > ul.CIMNetwork");
	 self.createElements(cimNetwork, "ACLineSegment", "AC Line Segments", allACLines);
	 self.createElements(cimNetwork, "BaseVoltage", "Base Voltages", allBaseVoltages);
	 self.createElements(cimNetwork, "Breaker", "Breakers", allBreakers);
	 self.createElements(cimNetwork, "Disconnector", "Disconnectors", allDisconnectors);
	 self.createElements(cimNetwork, "LoadBreakSwitch", "Load Break Switches", allLoadBreakSwitches);
	 self.createElements(cimNetwork, "Jumper", "Jumpers", allJumpers);
	 self.createElements(cimNetwork, "Junction", "Junctions", allJunctions);
	 let allGenerators = self.createTopContainer(cimNetwork, "Generator", "Generators", allEnergySources);
	 self.createElements(allGenerators, "EnergySource", "Energy Sources", allEquipments["cim:EnergySource"]);
	 self.createElements(allGenerators, "SynchronousMachine", "Synchronous Machines", allEquipments["cim:SynchronousMachine"]);
	 let allLoads = self.createTopContainer(cimNetwork, "Load", "Loads", allEnergyConsumers);
	 self.createElements(allLoads, "EnergyConsumer", "Energy Consumers", allEquipments["cim:EnergyConsumer"]);
	 self.createElements(allLoads, "ConformLoad", "Conform Loads", allEquipments["cim:ConformLoad"]);
	 self.createElements(allLoads, "NonConformLoad", "Non Conform Loads", allEquipments["cim:NonConformLoad"]);
	 self.createElements(cimNetwork, "BusbarSection", "Nodes", allBusbarSections);
	 self.createElements(cimNetwork, "Substation", "Substations", allSubstations);
	 self.createElements(cimNetwork, "PowerTransformer", "Transformers", allPowerTransformers);
	 self.createElements(cimNetwork, "Line", "Lines", allLines);
     }

     createTopContainer(cimNetwork, name, printName, data) {
	 let elementsTopContainer = cimNetwork.select("li." + name + "s");
	 let elements = elementsTopContainer.select("ul#" + name + "sList");
	 if (elementsTopContainer.empty()) {
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
				 .html(data.length);
	     elements = elementsTopContainer
		.append("ul")
		.attr("id", name + "sList")
		.attr("class", "collapse");
	 } else {
	     let elementCount = parseInt(elementsTopContainer.select("span").html());
	     elementCount = elementCount + data.length;
	     elementsTopContainer.select("span").html(elementCount);
	 }
	 return elements;
     }

     createElements(cimNetwork, name, printName, data) {
	 let elementsTopContainer = cimNetwork.select("li." + name + "s");
	 let elements = elementsTopContainer.select("ul#" + name + "sList");
	 if (elementsTopContainer.empty()) {
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
				 .html(data.length);
	     elements = elementsTopContainer
		.append("ul")
		.attr("id", name + "sList")
		.attr("class", "collapse");
	 } else {
	     let elementCount = parseInt(elementsTopContainer.select("span").html());
	     elementCount = elementCount + data.length;
	     elementsTopContainer.select("span").html(elementCount);
	 }

	 let elementTopContainer = elements
		.selectAll("li." + name)
		.data(data, function(d) {
		    return d.attributes.getNamedItem("rdf:ID").value;
		})
		.enter()
		.append("li")
		.attr("class", name);
	 let cimModel = this.model;
	 elementTopContainer.append("a")
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
				    let elementEnter = d3.select(this.parentNode).select("ul").node();
				    if (elementEnter.childNodes.length === 0) {
					self.generateAttrsAndLinks(d3.select(elementEnter));
				    }
				    // change address to 'this object'
				    let hashComponents = window.location.hash.substring(1).split("/");
				    let basePath = hashComponents[0] + "/" + hashComponents[1] + "/" + hashComponents[2];
				    if (window.location.hash.substring(1) !== basePath + "/" + d.attributes.getNamedItem("rdf:ID").value) {
					riot.route(basePath + "/" + d.attributes.getNamedItem("rdf:ID").value);
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
	 elementDiv.append("input")
		   .attr("class", "form-control")
		   .each(function (d) {
		       let object = d3.select($(this).parents("ul").first().get(0)).data()[0]; 
		       let value = self.model.getAttribute(object, "cim:" + d.attributes[0].value.substring(1));
		       if (typeof(value) !== "undefined") {
			   this.value = value.innerHTML;
		       } else { 
			   d3.select(this).attr("placeholder", "none");
		       }
		   })
		   .attr("type", "text")
		   .on("keydown", function(d) {
		       if (typeof(d3.event) === "undefined") {
			   return;
		       }
		       // trap the return key being pressed
		       if (d3.event.keyCode === 13) {
			   d3.event.preventDefault();
			   let object = d3.select($(this).parents("ul").first().get(0)).data()[0]; 
			   let attrName = "cim:" + d.attributes[0].value.substring(1);
			   self.model.setAttribute(object, attrName, this.value);
		       }
		   });
	 // add links
	 let elementLink = elementEnter
	        .selectAll("li.link")
	        .data(function(d) {
		    return self.model.getSchemaLinks(d.localName)
				   .filter(el => self.model.getAttribute(el, "cims:AssociationUsed").textContent === "Yes")
				   .filter(el => el.attributes[0].value !== "#TransformerEnd.Terminal"); 
		})
	        .enter()
	        .append("li")
		.attr("class", "link").append("div").attr("class", "input-group input-group-sm");
	 elementLink.append("span").attr("id", "sizing-addon3").attr("class", "input-group-addon cim-tree-attribute-name")
		.html(function (d) {
		    return d.attributes[0].value.substring(1).split(".")[1]; 
		});
	 let elementLinkBtn = elementLink.append("div").attr("class", "input-group-btn cim-tree-link-btn");
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
			   let invLink = self.model.getInvLink(d);
			   let graph = self.model.getGraph([source], d.attributes[0].value.substring(1), invLink.attributes[0].value.substring(1));
			   let targetObj = graph.map(el => el.source)[0];
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

	 
	 // handle power transfomer ends
	 let name = d3.select(elementEnter.node().parentNode).attr("class");
	 if (name === "PowerTransformer") {
	     elementEnter.each(function(d, i) {
		 let trafoEnds = self.model.getGraph([d], "PowerTransformer.PowerTransformerEnd", "PowerTransformerEnd.PowerTransformer");
		 if (trafoEnds.length > 0) {
		     self.createElements(d3.select(this), "PowerTransformerEnd"+i, "Transformer Windings", trafoEnds.map(el => el.source));
		 }
	     });
	 }

	 // add extra link to PQ application
	 /*
	 let pqLink = elementEnter.append("li")
				  .attr("class", "link");
	 pqLink.append("button")
	       .attr("class","btn btn-default btn-xs")
	       .attr("type", "submit")
	       .on("click", function (d) {
		   let source = d3.select(d3.select(this).node().parentNode.parentNode).datum();
		   let sourceUUID = source.attributes.getNamedItem("rdf:ID").value;
		   window.open("http://ric302107:8080/ClientRest/uuid/uuid.jsp?uuid=" + sourceUUID);
	       })
	       .html("View in CIM Datastore");
	 */
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
	 d3.select(".CIMNetwork").selectAll(".btn-danger").attr("class", "btn btn-primary btn-xs");
	 d3.select(target).select("a").attr("class", "btn btn-danger btn-xs");
	 self.scrollAndRouteTo("#" + uuid);
     }
     
     deleteObject(objectUUID) {
	 let cimObject = d3.select("div.tree").selectAll("ul.CIMNetwork").select("ul#" + objectUUID).node();
	 if (cimObject !== null) {
	     let cimObjectContainer = cimObject.parentNode;
	     // update element count
	     let elementsTopContainer = d3.select(cimObjectContainer.parentNode.parentNode);
	     let elementCount = parseInt(elementsTopContainer.select("span").html());
	     elementCount = elementCount - 1;
	     elementsTopContainer.select("span").html(elementCount);

	     cimObjectContainer.remove();
	 }
     }

     scrollAndRouteTo(targetUUID) {
	 if ($(targetUUID).parents(".collapse:not(.in)").last().length !== 0) {
	     $(targetUUID).parents(".collapse:not(.in)").last().on("shown.bs.collapse", function() {
		 scrollAndRouteToVisible(targetUUID);
		 $(targetUUID).parents(".collapse:not(.in)").last().off("shown.bs.collapse");
	     });
	 } else {
	     scrollAndRouteToVisible(targetUUID);
	 }
	 $(targetUUID).parents(".collapse:not(.in)").collapse("show");

	 function scrollAndRouteToVisible(targetUUID) {
	     $(".tree").scrollTop(
		 $(".tree").scrollTop() + (
		     $(".CIMNetwork").find(targetUUID).parent().offset().top - $(".tree").offset().top
		 )
	     );
	     let hashComponents = window.location.hash.substring(1).split("/");
	     let basePath = hashComponents[0] + "/" + hashComponents[1] + "/" + hashComponents[2];
	     riot.route(basePath + "/" + targetUUID.substring(1));
	 };
     }

     
    </script> 
    
</cimTree>
