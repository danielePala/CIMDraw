<cimTree>
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
	    <ul class="CIMNetwork list-group"></ul>
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
		 self.createTree(self.model.getObjects);
	     } else {
		 self.createTree(self.model.getGraphicObjects);
	     }
	 });
     });

     self.parent.on("showDiagram", function(file, name, element) {
	 if (decodeURI(name) !== self.diagramName) {
	     self.render(name);
	 }
	 if (typeof(element) !== "undefined") {
	     self.moveTo(element);
	 }
     });

     // listen to 'createObject' event from model
     self.model.on("createObject", function(object) {
	 let cimNetwork = d3.select("div.tree").selectAll("div.tree > ul.CIMNetwork");
	 if (object.nodeName === "cim:Breaker") {
	     self.createElements(cimNetwork, "Breaker", "Breakers", [object]);
	 }
	 if (object.nodeName === "cim:ACLineSegment") {
	     self.createElements(cimNetwork, "ACLineSegment", "AC Line Segments", [object]);
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

     createTree(getObjects) {
	 // clear all
	 d3.select("#app-tree").selectAll(".CIMNetwork > li").remove();

	 let allBusbarSections = getObjects("cim:BusbarSection");
	 console.log("[" + Date.now() + "] extracted busbarSections");
	 let allPowerTransformers = getObjects("cim:PowerTransformer");
	 console.log("[" + Date.now() + "] extracted power transformers");
	 let allPowerTransformerEnds = getObjects("cim:PowerTransformerEnd");
	 console.log("[" + Date.now() + "] extracted power transformer ends");
	 let allACLines = getObjects("cim:ACLineSegment");
	 console.log("[" + Date.now() + "] extracted acLines");
	 let allBreakers = getObjects("cim:Breaker");
	 console.log("[" + Date.now() + "] extracted breakers");
	 let allDisconnectors = getObjects("cim:Disconnector");
	 console.log("[" + Date.now() + "] extracted disconnectors");
	 let allLoadBreakSwitches = getObjects("cim:LoadBreakSwitch");
	 console.log("[" + Date.now() + "] extracted load break switches");
	 let allEnergySources = getObjects("cim:EnergySource")
	     .concat(getObjects("cim:SynchronousMachine"));
	 console.log("[" + Date.now() + "] extracted energy sources");
	 let allEnergyConsumers = getObjects("cim:EnergyConsumer")
	                              .concat(getObjects("cim:ConformLoad"))
	                              .concat(getObjects("cim:NonConformLoad"));
	 console.log("[" + Date.now() + "] extracted energy consumers");
	 let allSubstations = self.model.getEquipmentContainers("cim:Substation");
	 console.log("[" + Date.now() + "] extracted substations");
	 let allLines = self.model.getEquipmentContainers("cim:Line");
	 console.log("[" + Date.now() + "] extracted lines");
	 
	 let cimNetwork = d3.select("div.tree > ul.CIMNetwork");
	 this.createElements(cimNetwork, "ACLineSegment", "AC Line Segments", allACLines);
	 this.createElements(cimNetwork, "Breaker", "Breakers", allBreakers);
	 this.createElements(cimNetwork, "Disconnector", "Disconnectors", allDisconnectors);
	 this.createElements(cimNetwork, "LoadBreakSwitch", "Load Break Switches", allLoadBreakSwitches);
	 this.createElements(cimNetwork, "EnergySource", "Energy Sources", allEnergySources);
	 this.createElements(cimNetwork, "EnergyConsumer", "Loads", allEnergyConsumers);
	 this.createElements(cimNetwork, "BusbarSection", "Nodes", allBusbarSections);
	 this.createElements(cimNetwork, "Substation", "Substations", allSubstations);
	 this.createElements(cimNetwork, "PowerTransformer", "Transformers", allPowerTransformers);
	 // TODO: add these as sub-elements of transformer 
	 this.createElements(cimNetwork, "PowerTransformerEnd", "Transformer Windings", allPowerTransformerEnds);
	 this.createElements(cimNetwork, "Line", "Lines", allLines);
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
			    .call(d3.behavior.drag().on("dragend", function(d) {
				cimModel.trigger("dragend", d);
			    }));
	 let elementEnter = elementTopContainer
		.append("ul")
		.attr("id", function(d) {
		    return d.attributes.getNamedItem("rdf:ID").value;
		})
		.attr("class", "collapse");
	 elementEnter
		.selectAll("li.attribute")
		.data(function(d) {
		    return cimModel.getSchemaAttributes(d.localName); 
		})
		.enter()
		.append("li")
		.attr("class", "attribute")
		.html(function (d) {
		    return d.attributes[0].value.substring(1).split(".")[1] + ": "; 
		})
		.append("span")
		.attr("contenteditable", "true")
		.html(function (d) {
		    let ret = "none";
		    let object = d3.select(d3.select(this).node().parentNode.parentNode).datum();
		    let value = cimModel.getAttribute(object, "cim:" + d.attributes[0].value.substring(1));
		    if (typeof(value) !== "undefined") {
			ret = value.innerHTML;
		    }
		    return ret; 
		})
		.on("input", function(d) {
		    let object = d3.select(d3.select(this).node().parentNode.parentNode).datum();
		    let attrName = "cim:" + d.attributes[0].value.substring(1);
		    cimModel.setAttribute(object, attrName, d3.select(this).html());
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
		    return cimModel.getSchemaLinks(d.localName)
				   .filter(el => cimModel.getAttribute(el, "cims:AssociationUsed").textContent === "Yes")
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
			let target = cimModel.getLink(source, "cim:" + d.attributes[0].value.substring(1));
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
			let target = cimModel.getLink(source, "cim:" + d.attributes[0].value.substring(1));
			// TODO: maybe the inverse link is set
			if (typeof(target) === "undefined") {
			    return "none";
			}
			let name = cimModel.getAttribute(cimModel.resolveLink(target), "cim:IdentifiedObject.name");
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
	 return elementEnter;
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
    </script> 
    
</cimTree>
