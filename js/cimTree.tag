<cimTree>
    <div class="app-tree" id="app-tree"></div>
    <script>

     this.model = opts.model;	
     let self = this;
     let subRoute = riot.route.create();
	
     subRoute("/diagrams/*", function(name) {
            self.render(name);
     });	
     
     subRoute("/diagrams/*/*", function(name, element) {
	 self.moveTo(element);
     });	

     render(diagramName) {
	 // clear all
	 d3.select("#app-tree").select(".tree").remove();

	 this.model.selectDiagram(decodeURI(diagramName));
	 let allBusbarSections = this.model.getConductingEquipments("cim:BusbarSection");
	 console.log("extracted busbarSections");
	 let allPowerTransformers = this.model.getConductingEquipments("cim:PowerTransformer");
	 console.log("extracted power transformers");
	 let allACLines = this.model.getConductingEquipments("cim:ACLineSegment");
	 console.log("extracted acLines");
	 let allBreakers = this.model.getConductingEquipments("cim:Breaker");
	 console.log("extracted breakers");
	 let allDisconnectors = this.model.getConductingEquipments("cim:Disconnector");
	 console.log("extracted disconnectors");
	 let allEnergySources = this.model.getConductingEquipments("cim:EnergySource")
	     .concat(this.model.getConductingEquipments("cim:SynchronousMachine"));
	 console.log("extracted energy sources");
	 let allEnergyConsumers = this.model.getConductingEquipments("cim:EnergyConsumer")
	                              .concat(this.model.getConductingEquipments("cim:ConformLoad"))
	                              .concat(this.model.getConductingEquipments("cim:NonConformLoad"));
	 console.log("extracted energy consumers");
	 let allSubstations = this.model.getObjects("cim:Substation"); // TODO: filter substations
	 console.log("extracted substations");
	 let allLines = this.model.getObjects("cim:Line"); // TODO: filter lines
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
	 this.createElements(cimNetwork, "EnergySource", "Energy Sources", allEnergySources);
	 this.createElements(cimNetwork, "EnergyConsumer", "Loads", allEnergyConsumers);
	 this.createElements(cimNetwork, "BusbarSection", "Nodes", allBusbarSections);
	 this.createElements(cimNetwork, "Substation", "Substations", allSubstations);
	 this.createElements(cimNetwork, "PowerTransformer", "Transformers", allPowerTransformers);
	 this.createElements(cimNetwork, "Line", "Lines", allLines);

	 d3.selectAll("li.ACLineSegment")
	   .on("mouseover.hover", this.hover)
	   .on("mouseout", this.mouseOut);
     }

     createElements(cimNetwork, name, printName, data) {
	 //let model = this.model;
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
			    .attr("href", function(d) {return "#" + d.attributes[0].value;})
	    		    .on("click", function (d) {
				let hashComponents = window.location.hash.substring(1).split("/");
				let basePath = hashComponents[0] + "/" + hashComponents[1];
				if (window.location.hash.substring(1) !== basePath + "/" + d.attributes[0].value) {
				    riot.route(basePath + "/" + d.attributes[0].value);
				}
				
				if (d3.select("#cimTarget").empty() === false) {
				    let source = d3.select(d3.select("#cimTarget").node().parentNode.parentNode).datum();
				    let sourceLink = d3.select("#cimTarget").datum();
				    console.log(sourceLink);
				    let target = cimModel.getLink(source, "cim:" + sourceLink.attributes[0].value.substring(1));
				    target.attributes[0].value = "#" + d.attributes[0].value;
				    d3.select("#cimTarget").select("button").html(function (dd) {
					return cimModel.getAttribute(d, "cim:IdentifiedObject.name").textContent;
				    });
				    d3.select("#cimTarget").attr("id", null);
				}
			    })
			    .html(function (d) {return d.getAttribute("cim:IdentifiedObject.name").textContent});
	 let elementEnter = elementTopContainer
		.append("ul")
		.attr("id", function(d) {return d.attributes[0].value;})
		.attr("class", "collapse");
	 elementEnter
		.selectAll("li.attribute")
		.data(function(d) {
		    return cimModel.getSchemaAttributes(d.localName); /*d.getAttributes();*/
		})
		.enter()
		.append("li")
		.attr("class", "attribute")
		.html(function (d) {
		    return d.attributes[0].value.substring(1).split(".")[1] + ": "; //d.localName.split(".")[1] + ": "
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
		    return ret; //d.innerHTML
		})
		.on("input", function(d) {
		    let object = d3.select(d3.select(this).node().parentNode.parentNode).datum();
		    let attrName = "cim:" + d.attributes[0].value.substring(1);
		    let value = cimModel.getAttribute(object, attrName);
		    if (typeof(value) !== "undefined") {
			value.innerHTML = d3.select(this).html();
		    } else {
			let newAttribute = cimModel.data.createElement(attrName);
			newAttribute.innerHTML = d3.select(this).html();
			object.appendChild(newAttribute);
		    }
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
				   .filter(el => cimModel.getAttribute(el, "cims:AssociationUsed").textContent === "Yes"); //cimModel.getLinks(d);
		})
	        .enter()
	        .append("li")
		.attr("class", "link")
	        .html(function (d) {
		    return d.attributes[0].value.substring(1).split(".")[1] + ": "; //d.localName.split(".")[1] + ": ";
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
				let basePath = hashComponents[0] + "/" + hashComponents[1];
				riot.route(basePath + "/" + targetUUID.substring(1));
				$(targetUUID).parent().parent().off("shown.bs.collapse");
			    });
			} else {
			    $(".tree").scrollTop($(".tree").scrollTop() + ($(".CIMNetwork").find(targetUUID).parent().offset().top - $(".tree").offset().top));
			    let hashComponents = window.location.hash.substring(1).split("/");
			    let basePath = hashComponents[0] + "/" + hashComponents[1];
			    riot.route(basePath + "/" + targetUUID.substring(1));
			}
			$(targetUUID).parent().parent().collapse("show");
		    })
		    .html(function (d) {
			let source = d3.select(d3.select(this).node().parentNode.parentNode).datum();
			let target = cimModel.getLink(source, "cim:" + d.attributes[0].value.substring(1));
			if (typeof(target) === "undefined") {
			    return "none";
			}
			return cimModel.resolveLink(target).getAttribute("cim:IdentifiedObject.name").textContent; //cimModel.resolveLink(d).getAttribute("cim:IdentifiedObject.name").textContent;
		    });
	 elementLink.append("button")
	            .attr("class","btn btn-default btn-xs")
	            .attr("type", "submit")
	            .on("click", function (d) {
			$(this).parent().attr("id", "cimTarget");
		    })
	            .html("change");
     }

     moveTo(uuid) {
	 let target = d3.select(".tree").select("#" + uuid).node().parentNode;
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

     hover(hoverD) {
	 d3.selectAll("g.ACLineSegment")
	   .filter(function (d) {return d == hoverD;})
	   .style("stroke", "black")
	   .style("stroke-width", "2px");
     }

     mouseOut() {
	 d3.selectAll("li.ACLineSegment").style("background", "white");
	 d3.selectAll("g.ACLineSegment").style("stroke-width", "0px");
     }

    </script> 
    
</cimTree>
