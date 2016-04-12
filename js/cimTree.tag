<cimTree>
    <div class="app-tree" id="app-tree"></div>
    <script>
     "use strict";
     
     this.model = opts.model;	
     let self = this;

     self.parent.on("showDiagram", function(file, name, element) {
	 if (name !== self.diagramName) {
	     self.render(name);
	 }
	 if (typeof(element) !== "undefined") {
	     self.moveTo(element);
	 }
     });

     // listen to 'setAttribute' event from model
     self.model.on("setAttribute", function(object, attrName, value) {
	 if (attrName === "cim:IdentifiedObject.name") {
	     let type = object.localName;
	     let target = d3.select("div.tree").selectAll("div.tree > ul > li." + type + "s > ul > li > ul#" + object.attributes[0].value);
	     let a = d3.select(target.node().parentNode).select("a");
	     a.html(value);
	 }
     });

     render(diagramName) {
	 // clear all
	 d3.select("#app-tree").select(".tree").remove();

	 self.model.selectDiagram(decodeURI(diagramName));
	 self.diagramName = decodeURI(diagramName);
	 let allBusbarSections = this.model.getGraphicObjects("cim:BusbarSection");
	 console.log("extracted busbarSections");
	 let allPowerTransformers = this.model.getGraphicObjects("cim:PowerTransformer");
	 console.log("extracted power transformers");
	 let allPowerTransformerEnds = this.model.getGraphicObjects("cim:PowerTransformerEnd");
	 console.log("extracted power transformer ends");
	 let allACLines = this.model.getGraphicObjects("cim:ACLineSegment");
	 console.log("extracted acLines");
	 let allBreakers = this.model.getGraphicObjects("cim:Breaker");
	 console.log("extracted breakers");
	 let allDisconnectors = this.model.getGraphicObjects("cim:Disconnector");
	 console.log("extracted disconnectors");
	 let allLoadBreakSwitches = this.model.getGraphicObjects("cim:LoadBreakSwitch");
	 console.log("extracted load break switches");
	 let allEnergySources = this.model.getGraphicObjects("cim:EnergySource")
	     .concat(this.model.getGraphicObjects("cim:SynchronousMachine"));
	 console.log("extracted energy sources");
	 let allEnergyConsumers = this.model.getGraphicObjects("cim:EnergyConsumer")
	                              .concat(this.model.getGraphicObjects("cim:ConformLoad"))
	                              .concat(this.model.getGraphicObjects("cim:NonConformLoad"));
	 console.log("extracted energy consumers");
	 let allSubstations = this.model.getEquipmentContainers("cim:Substation");
	 console.log("extracted substations");
	 let allLines = this.model.getEquipmentContainers("cim:Line");
	 console.log("extracted lines");
	 let nodes = allACLines;
	 
	 // navtree
	 let form = d3.select("#app-tree")
		      .append("div")
		      .attr("class", "tree")
		      .append("form")
		      .attr("class", "form-inline");
	 form.append("div")
	     .attr("class", "form-group")
	     .append("input")
	     .attr("type", "search")
	     .attr("class", "form-control")
	     .attr("id", "cim-search-key")
	     .attr("placeholder", "Search...");
	 form.append("button")
	     .attr("type", "submit")
	     .attr("class", "btn btn-default")
	     .html("Search").on("click", function() {
		 let searchKey = document.getElementById("cim-search-key").value;
		 $(".CIMNetwork>li>ul").each(function() {
		     let toShow = $(this).find(">li>a:contains(" + searchKey + ")");
		     let toHide = $(this).find(">li>a:not(:contains(" + searchKey + "))");
		     toShow.parent().show();
		     toHide.parent().hide();
		     $(this).parent().find(">span").html(toShow.size());
		 });
	     });

	 let cimNetwork = d3.select("div.tree")
			    .append("ul")
			    .attr("class", "CIMNetwork list-group");
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

	 d3.selectAll("li.ACLineSegment")
	   .on("mouseout", this.mouseOut);
     }

     createElements(cimNetwork, name, printName, data) {
	 let elementsTopContainer = cimNetwork
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
	 let elements = elementsTopContainer
		.append("ul")
		.attr("id", name + "sList")
		.attr("class", "collapse");
	 let elementTopContainer = elements
		.selectAll("li." + name)
		.data(data)
		.enter()
		.append("li")
		.attr("class", name);
	 let cimModel = this.model;
	 elementTopContainer.append("a")
			    .attr("class", "btn btn-primary btn-xs")
			    .attr("role", "button")
			    .attr("data-toggle", "collapse")
			    .attr("href", function(d) {
				return "#" + d.attributes[0].value;
			    })
	    		    .on("click", function (d) {
				// change address to 'this object'
				let hashComponents = window.location.hash.substring(1).split("/");
				let basePath = hashComponents[0] + "/" + hashComponents[1] + "/" + hashComponents[2];
				if (window.location.hash.substring(1) !== basePath + "/" + d.attributes[0].value) {
				    riot.route(basePath + "/" + d.attributes[0].value);
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
			    });
	 let elementEnter = elementTopContainer
		.append("ul")
		.attr("id", function(d) {
		    return d.attributes[0].value;
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
			let targetUUID = target.attributes[0].value;
			
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
	 let target = null;
	 let hoverD = self.model.getObject(uuid);
	 // handle connectivity nodes
	 if (hoverD.nodeName === "cim:ConnectivityNode") {
	     let equipments = self.model.getEquipments(hoverD);
	     // let's try to get a busbar section
	     let busbarSection = equipments.filter(el => el.localName === "BusbarSection")[0];
	     let busbarUUID = busbarSection.attributes[0].value;
	     target = d3.select(".tree").select("#" + busbarUUID).node().parentNode;
	 } else {
	     target = d3.select(".tree").select("#" + uuid).node().parentNode;
	 }
	 
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

     mouseOut() {
	 d3.selectAll("li.ACLineSegment").style("background", "white");
     }

    </script> 
    
</cimTree>
