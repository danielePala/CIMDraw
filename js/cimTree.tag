<cimTree>
    <style>
     .tree {
	 max-height: 800px;
	 min-width: 300px;
	 overflow: scroll;
	 resize: horizontal;
     }
    </style>

    <div class="app-tree" id="app-tree">
	<div class="tree">
	    <form class="form-inline">
		<div class="form-group">
		    <input type="search" class="form-control" id="cim-search-key" placeholder="Search...">
		</div>
		<button type="submit" class="btn btn-default" id="cimTreeSearchBtn">Search</button>
	    </form>
	    <form>
		<div class="checkbox">
		    <label>
			<input type="checkbox" id="showAllObjects"> Show all objects
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

     self.parent.on("showDiagram", function(file, name, element) {
	 self.parent.trigger("rendering");
	 if (decodeURI(name) !== self.diagramName) {
	     d3.drag().on("drag.end", null);
	     self.render(name);
	 }
	 if (typeof(element) !== "undefined") {
	     self.moveTo(element);
	 }
	 self.parent.trigger("rendered");
     });

     // listen to 'createObject' event from model
     self.model.on("createObject", function(object) {
	 let cimNetwork = d3.select("div.tree").selectAll("ul.CIMNetwork");
	 if (object.nodeName === "cim:Breaker") {
	     self.createElements(cimNetwork, "Breaker", "Breakers", [object]);
	 }
	 if (object.nodeName === "cim:ACLineSegment") {
	     self.createElements(cimNetwork, "ACLineSegment", "AC Line Segments", [object]);
	 }
     });

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
	     let target = d3.select("div.tree").selectAll("div.tree > ul > li." + type + "s > ul > li > ul#" + object.attributes.getNamedItem("rdf:ID").value);
	     if (target.empty() === false) {
		 let a = d3.select(target.node().parentNode).select("a");
		 a.html(value);
	     }
	 }
     });

     self.model.on("createdDiagram", function() {
	 self.diagramName = decodeURI(self.model.activeDiagramName);
	 $("#showAllObjects").prop("checked", true);
	 $("#showAllObjects").change();
     });

     render(diagramName) {
	 self.model.selectDiagram(decodeURI(diagramName));
	 self.diagramName = decodeURI(diagramName);
	 $("#showAllObjects").prop("checked", false);
	 $("#showAllObjects").change();
     }

     createTree(getObjects, getContainers) {
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
	 let allBaseVoltages = allEquipments["cim:BaseVoltage"]; 
	 console.log("[" + Date.now() + "] extracted base voltages");
	 let allBusbarSections = allEquipments["cim:BusbarSection"]; 
	 console.log("[" + Date.now() + "] extracted busbarSections");
	 let allPowerTransformers = allEquipments["cim:PowerTransformer"]; 
	 console.log("[" + Date.now() + "] extracted power transformers");
	 let allACLines = allEquipments["cim:ACLineSegment"]; 
	 console.log("[" + Date.now() + "] extracted acLines");
	 let allBreakers = allEquipments["cim:Breaker"]; 
	 console.log("[" + Date.now() + "] extracted breakers");
	 let allDisconnectors = allEquipments["cim:Disconnector"]; 
	 console.log("[" + Date.now() + "] extracted disconnectors");
	 let allLoadBreakSwitches = allEquipments["cim:LoadBreakSwitch"]; 
	 console.log("[" + Date.now() + "] extracted load break switches");
	 let allJumpers = allEquipments["cim:Jumper"]; 
	 console.log("[" + Date.now() + "] extracted jumpers");
	 let allJunctions = allEquipments["cim:Junction"]; 
	 console.log("[" + Date.now() + "] extracted junctions");
	 let allEnergySources = allEquipments["cim:EnergySource"] 
	     .concat(allEquipments["cim:SynchronousMachine"]);
	 console.log("[" + Date.now() + "] extracted energy sources");
	 let allEnergyConsumers = allEquipments["cim:EnergyConsumer"] 
	                              .concat(allEquipments["cim:ConformLoad"])
	                              .concat(allEquipments["cim:NonConformLoad"]);
	 console.log("[" + Date.now() + "] extracted energy consumers");
	 let allSubstations = getContainers("cim:Substation");
	 console.log("[" + Date.now() + "] extracted substations");
	 let allLines = getContainers("cim:Line");
	 console.log("[" + Date.now() + "] extracted lines");
	 
	 let cimNetwork = d3.select("div.tree > div.tab-content > div.tab-pane > ul.CIMNetwork");
	 self.createElements(cimNetwork, "ACLineSegment", "AC Line Segments", allACLines);
	 self.createElements(cimNetwork, "BaseVoltage", "Base Voltages", allBaseVoltages);
	 self.createElements(cimNetwork, "Breaker", "Breakers", allBreakers);
	 self.createElements(cimNetwork, "Disconnector", "Disconnectors", allDisconnectors);
	 self.createElements(cimNetwork, "LoadBreakSwitch", "Load Break Switches", allLoadBreakSwitches);
	 self.createElements(cimNetwork, "Jumper", "Jumpers", allJumpers);
	 self.createElements(cimNetwork, "Junction", "Junctions", allJunctions);
	 self.createElements(cimNetwork, "EnergySource", "Energy Sources", allEnergySources);
	 self.createElements(cimNetwork, "EnergyConsumer", "Loads", allEnergyConsumers);
	 self.createElements(cimNetwork, "BusbarSection", "Nodes", allBusbarSections);
	 self.createElements(cimNetwork, "Substation", "Substations", allSubstations);
	 self.createElements(cimNetwork, "PowerTransformer", "Transformers", allPowerTransformers);
	 self.createElements(cimNetwork, "Line", "Lines", allLines);
	 console.log("[" + Date.now() + "] drawn tree");
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
				// check if we are changing some link
				let linkToChange = d3.select("#cimTarget");
				if (linkToChange.empty() === false) {
				    let target = d3.select(linkToChange.node().parentNode.parentNode).datum();
				    let targetLink = linkToChange.datum();
				    cimModel.setLink(target, targetLink, d);
				    
				    linkToChange.select("button").html(function (dd) {
					return cimModel.getAttribute(d, "cim:IdentifiedObject.name").textContent;
				    });
				    linkToChange.attr("id", null);
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
		.attr("class", "collapse")	     
	 return elementEnter;
     }

     generateAttrsAndLinks(elementEnter) {
	 elementEnter
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
		.html(function (d) {
		    return d.attributes[0].value.substring(1).split(".")[1] + ": "; 
		})
		.append("span")
		.attr("contenteditable", "true")
		.html(function (d) {
		    let ret = "none";
		    let object = d3.select(d3.select(this).node().parentNode.parentNode).datum();
		    let value = self.model.getAttribute(object, "cim:" + d.attributes[0].value.substring(1));
		    if (typeof(value) !== "undefined") {
			ret = value.innerHTML;
		    }
		    return ret; 
		})
		.on("input", function(d) {
		    let object = d3.select(d3.select(this).node().parentNode.parentNode).datum();
		    let attrName = "cim:" + d.attributes[0].value.substring(1);
		    self.model.setAttribute(object, attrName, d3.select(this).html());
		})
		.on("keydown", function() {
		    if (typeof(d3.event) === "undefined") {
			return;
		    }
		    // trap the return key being pressed
		    if (d3.event.keyCode === 13) {
			d3.event.preventDefault();
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
		.attr("class", "link")
	        .html(function (d) {
		    return d.attributes[0].value.substring(1).split(".")[1] + ": "; 
		});
	 elementLink.append("button")
		    .attr("class","btn btn-default btn-xs")
		    .attr("type", "submit")
		    .on("click", function (d) {
			let source = d3.select(d3.select(this).node().parentNode.parentNode).datum();
			let target = self.model.getLink(source, "cim:" + d.attributes[0].value.substring(1));
			let targetUUID = target.attributes.getNamedItem("rdf:resource").value;
			console.log(targetUUID);
			
			if ($(targetUUID).parent().parent().is(":visible") === false) {
			    $(targetUUID).parent().parent().on("shown.bs.collapse", function() {
				$(".tree").scrollTop($(".tree").scrollTop() + ($(".CIMNetwork").find(targetUUID).parent().offset().top - $(".tree").offset().top));
				let hashComponents = window.location.hash.substring(1).split("/");
				let basePath = hashComponents[0] + "/" + hashComponents[1] + "/" + hashComponents[2];
				riot.route(basePath + "/" + targetUUID.substring(1));
				$(targetUUID).parent().parent().off("shown.bs.collapse");
			    });
			} else {
			    $(".tree").scrollTop($(".tree").scrollTop() + ($(".CIMNetwork").find(targetUUID).parent().offset().top - $(".tree").offset().top));
			    let hashComponents = window.location.hash.substring(1).split("/");
			    let basePath = hashComponents[0] + "/" + hashComponents[1] + "/" + hashComponents[2];
			    riot.route(basePath + "/" + targetUUID.substring(1));
			}
			$(targetUUID).parent().parent().collapse("show");
		    })
		    .html(function (d) {
			let source = d3.select(d3.select(this).node().parentNode.parentNode).datum();
			let target = self.model.getLink(source, "cim:" + d.attributes[0].value.substring(1));
			// TODO: maybe the inverse link is set
			if (typeof(target) === "undefined") {
			    return "none";
			}
			let name = self.model.getAttribute(self.model.resolveLink(target), "cim:IdentifiedObject.name");
			if (typeof(name) !== "undefined") {
			    return name.innerHTML;
			}
			return "unnamed";
		    });
	 elementLink.append("button")
	            .attr("class","btn btn-default btn-xs")
	            .attr("type", "submit")
	            .on("click", function (d) {
			$(this).parent().attr("id", "cimTarget");
		    })
	            .html("change");

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
	     let busbarUUID = busbarSection.attributes.getNamedItem("rdf:ID").value;

	     targetChild = d3.select(".tree").select("#" + busbarUUID).node(); 
	 } else {
	     targetChild = d3.select(".tree").select("#" + uuid).node();
	 }

	 if (targetChild === null) {
	     return;
	 }
	 target = targetChild.parentNode;
	 
	 let targetParent = $(target).parent();
	 d3.select(".CIMNetwork").selectAll(".btn-danger").attr("class", "btn btn-primary btn-xs");
	 d3.select(target).select("a").attr("class", "btn btn-danger btn-xs");
	 if (targetParent.is(":visible") === false) {
	     targetParent.on("shown.bs.collapse", function() {
		 $(".tree").scrollTop($(".tree").scrollTop() + ($(target).offset().top - $(".tree").offset().top));
		 targetParent.off("shown.bs.collapse");
	     });
	 } else {
	     $(".tree").scrollTop($(".tree").scrollTop() + ($(target).offset().top - $(".tree").offset().top));
	 }
	 targetParent.collapse("show");
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
     
    </script> 
    
</cimTree>
