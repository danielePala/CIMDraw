"use strict";

function startRouter() {
    console.log("start router");
    route.stop(); // clear all the old router callbacks
    let cimFile = {};
    let cimFileReader = {};
    let cimDiagram = {};
    let cimTree = {};

    // This is the initial route ("the home page").
    route(function(name) {
	$(".selectpicker").selectpicker({container: "body"});
	$("#cim-select-file").show();
	$("#cim-file-input-container").show();
	$("#cim-file-input").fileinput("reset");
	$("#cim-file-input").fileinput("enable");
	$(".selectpicker").selectpicker("hide");
	$(".app-container").hide();
	$("#cim-diagram-controls").hide();
	$("#cim-load-container").hide();
	$("#cim-home-container").hide();
	
	d3.select("#cim-diagrams").selectAll("option").remove();
	d3.select("#cim-diagrams").append("option").attr("disabled", "disabled").html("Select a diagram");
	d3.select("#cim-filename").html("");    
	$(".selectpicker").selectpicker("refresh");
	$("#cim-file-input").fileinput();
	$("#cim-file-input").on("fileloaded", function(event, file, previewId, index, reader) {	    
	    /*d3.xml("http://ric302107:8080/com.vogella.jersey.first/rest/cim/Class/ACLineSegment")
	      .header("Accept", "application/rdf+xml")
	      .get(function(error, data) {
	      console.log(error, data);
	      });*/
	    cimFile = file;
	    cimFileReader = reader;
	    /*console.log(reader);
	    reader.readAsText(file);
	    reader.onload = function(e) {
		let parser = new DOMParser();
		let doc = parser.parseFromString(reader.result, "application/xml");
	    }*/
	    d3.select("#cim-load-container").style("display", null);
	});
    });

    // here we choose a diagram to display
    route('/diagrams', function(name) {
	let m = Object.assign({}, cimDiagramModel());
	cimDiagram = Object.assign({}, cimDiagramController());
	cimTree = Object.assign({}, cimTreeController());

	d3.select("#cim-load-container").style("display", null);
	d3.select("#cim-select-file").style("display", "none");
	d3.select("#cim-file-input-container").style("display", "none");
	d3.select("#cim-load-container").style("display", "none");
	d3.select("#cim-home-container").style("display", null);
	d3.select("#cim-filename").html(cimFile.name);

	m.load(cimFile, cimFileReader, function() {
	    d3.select("#cim-diagrams").append("option").attr("value", "#diagrams/none").text("Generate a new diagram");
	    let diagrams = m.getDiagramList();
	    for (let i in diagrams) {
		d3.select("#cim-diagrams").append("option").attr("value", "#diagrams/"+diagrams[i]).text(diagrams[i]);
		}
	    $(".selectpicker").selectpicker("refresh");
	    cimDiagram.setModel(m);
	    cimTree.setModel(m);
	});
	$(".selectpicker").selectpicker("show");
    });

    // here we show a certain diagram
    route('/diagrams/*', function(name) {
	$("#cim-diagram-controls").show();
	$(".app-container").show();
	$(".selectLabel").click();
	cimDiagram.render(name);
	cimTree.render(name);
	cimDiagram.bindToTree();
    });

    route('/diagrams/*/*', function(name, element) {
	let target = d3.select("#" + element).node().parentNode;
	d3.select(".CIMNetwork").selectAll(".btn-danger").attr("class", "btn btn-primary btn-xs");
	d3.select(target).select("a").attr("class", "btn btn-danger btn-xs");
	$(".tree").scrollTop($(".tree").scrollTop() + ($(".CIMNetwork").find("#" + element).parent().offset().top - $(".tree").offset().top));
    });
    
    route.start(true);
};

// start routing
startRouter();
