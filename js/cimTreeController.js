"use strict";

function cimTreeController() {
    return {
	
	setModel: function(model) {
	    this.model = model;
	},

	render: function(diagramName) {
	    // clear all
	    d3.select("#app-tree").select(".tree").remove();
	    
	    let diagram = this.model.getObjects("cim:Diagram")
		.filter(el => el.getAttributes()
			.filter(el => el.nodeName === "cim:IdentifiedObject.name")[0].textContent===decodeURI(diagramName));
	    let allConnectivityNodes = this.model.getObjects("cim:ConnectivityNode");
	    console.log("extracted connectivity nodes");
	    let allACLines = this.model.getObjects("cim:ACLineSegment");
	    console.log("extracted acLines");
	    let allBreakers = this.model.getObjects("cim:Breaker");
	    console.log("extracted breakers");
	    let allDisconnectors = this.model.getObjects("cim:Disconnector");
	    console.log("extracted disconnectors");
	    let allSubstations = this.model.getObjects("cim:Substation");
	    console.log("extracted substations");
	    let allDiagramObjects = this.model.getObjects("cim:DiagramObject");
	    console.log("extracted diagramObjects");
	    if (diagram.length > 0) {
		allDiagramObjects = allDiagramObjects.filter(el => el.getLinks().filter(el => el.localName === "DiagramObject.Diagram")[0].attributes[0].value === "#" + diagram[0].attributes[0].value);
	    }
	    let ioEdges = this.model.getGraph(allDiagramObjects, "DiagramObject.IdentifiedObject", "IdentifiedObject.DiagramObjects");
	    if (diagram.length > 0) {
		let graphicObjects = ioEdges.map(el => el.source);
		allACLines = allACLines.filter(acl => graphicObjects.indexOf(acl) > -1);
		allBreakers = allBreakers.filter(breaker => graphicObjects.indexOf(breaker) > -1);
		allDisconnectors = allDisconnectors.filter(disc => graphicObjects.indexOf(disc) > -1);
		allConnectivityNodes = allConnectivityNodes.filter(cn => typeof(cn.x) != "undefined");
		// TODO: filter substations
	    }
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
	    this.createElements(cimNetwork, "ConnectivityNode", "Connectivity Nodes", allConnectivityNodes);
	    this.createElements(cimNetwork, "Substation", "Substations", allSubstations);

	    d3.selectAll("li.ACLineSegment")
		.on("mouseover.hover", this.hover)
		.on("mouseout", this.mouseOut);
	},

	createElements: function(cimNetwork, name, printName, data) {
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
			route(basePath + "/" + d.attributes[0].value);
		    }
		    // test...
		    if (d3.select("#cimTarget").empty() === false) {
			d3.select("#cimTarget").data()[0].attributes[0].value = "#" + d.attributes[0].value;
			d3.select("#cimTarget").select("button").html(function (d) {return cimModel.resolveLink(d).getAttribute("cim:IdentifiedObject.name").textContent;});
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
		.data(function(d) {return d.getAttributes();})
		.enter()
		.append("li")
		.attr("class", "attribute")
		.html(function (d) {return d.localName.split(".")[1] + ": "})
		.append("span")
		.attr("contenteditable", "true")
		.html(function (d) {return d.innerHTML})
		.on("input", function(d) {
		    d.innerHTML = d3.select(this).html();
		})
		.on("keydown", function() {
		    // trap the return key being pressed
		    if (d3.event.keyCode === 13) {
			d3.event.preventDefault();
		    }
		});
	    // add links
	    let elementLink = elementEnter
	        .selectAll("li.link")
	        .data(function(d) {return d.getLinks();})
	        .enter()
	        .append("li")
		.attr("class", "link")
	        .html(function (d) {return d.localName.split(".")[1] + ": ";});
	    elementLink.append("button")
		.attr("class","btn btn-default btn-xs")
		.attr("type", "submit")
		.on("click", function (d) {
		    if ($(d.attributes[0].value).parent().parent().is(":visible") === false) {
			$(d.attributes[0].value).parent().parent().on("shown.bs.collapse", function() {
			    $(".tree").scrollTop($(".tree").scrollTop() + ($(".CIMNetwork").find(d.attributes[0].value).parent().offset().top - $(".tree").offset().top));
			    let hashComponents = window.location.hash.substring(1).split("/");
			    let basePath = hashComponents[0] + "/" + hashComponents[1];
			    route(basePath + "/" + d.attributes[0].value.substring(1));
			    $(d.attributes[0].value).parent().parent().off("shown.bs.collapse");
			});
		    } else {
			$(".tree").scrollTop($(".tree").scrollTop() + ($(".CIMNetwork").find(d.attributes[0].value).parent().offset().top - $(".tree").offset().top));
			let hashComponents = window.location.hash.substring(1).split("/");
			let basePath = hashComponents[0] + "/" + hashComponents[1];
			route(basePath + "/" + d.attributes[0].value.substring(1));
		    }
		    $(d.attributes[0].value).parent().parent().collapse("show");
		})
		.html(function (d) {return cimModel.resolveLink(d).getAttribute("cim:IdentifiedObject.name").textContent;});
	    elementLink.append("button")
	        .attr("class","btn btn-default btn-xs")
	        .attr("type", "submit")
	        .on("click", function (d) {
		    $(this).parent().attr("id", "cimTarget");
		})
	        .html("change");
	},

	hover: function(hoverD) {
	    d3.selectAll("g.ACLineSegment")
		.filter(function (d) {return d == hoverD;})
		.style("stroke", "black")
		.style("stroke-width", "2px");
	},

	mouseOut: function() {
	    d3.selectAll("li.ACLineSegment").style("background", "white");
	    d3.selectAll("g.ACLineSegment").style("stroke-width", "0px");
	}
    };
}
