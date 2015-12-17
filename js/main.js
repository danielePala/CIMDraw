"use strict";

let cimFile = "";

// here we choose a diagram to display
route('/diagrams', function(name) {
    let m = Object.assign({}, cimDiagramModel());
    let cimDiagram = Object.assign({}, cimDiagramController());
    let cimTree = Object.assign({}, cimTreeController());
    
    d3.select("#cim-select-file").style("display", "none");
    d3.select("#cim-file-input-container").style("display", "none");
    d3.select("#cim-load-container").style("display", "none");
    d3.select("#cim-home-container").style("display", null);
    d3.select("#cim-filename").html(cimFile.name);
    
    m.load(cimFile.name, function(error) {
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

    // here we show a certain diagram
    route('/diagrams/*', function(name) {
	$("#cim-diagram-controls").show();
	$(".app-container").show();
	$(".selectLabel").click();
	cimDiagram.render(name);
	cimTree.render(name);
	cimDiagram.bindToTree();
    });
});

// This is the initial route ("the home page").
route(function(name) {
    $('.selectpicker').selectpicker({container: "body"});
    d3.select("#cim-select-file").style("display", null);
    d3.select("#cim-file-input-container").style("display", null);
    $("#cim-file-input").fileinput("reset");
    $("#cim-file-input").fileinput("enable");
    $(".selectpicker").selectpicker("hide");
    $(".app-container").hide();
    d3.select("#cim-diagram-controls").style("display", "none");
    d3.select("#cim-load-container").style("display", "none");
    d3.select("#cim-home-container").style("display", "none");
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
	d3.select("#cim-load-container").style("display", null);
    });
});

// start routing
route.start(true);
