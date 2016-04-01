"use strict";

function startRouter() {
    console.log("start router");
    riot.route.stop(); // clear all the old router callbacks
    let cimFile = {};
    let cimFileReader = {};
    let cimModel = {};

    // This is the initial route ("the home page").
    riot.route(function(name) {
	// things to show
	$("#cim-select-file").show();
	$("#cim-file-input-container").show();
	// things to hide
	$("#cim-load-container").hide();
	$("#cim-home-container").hide();
	$("#cim-save").hide();
	$(".app-container").hide();
	$(".selectpicker").selectpicker("hide");
	// main logic
	$(".selectpicker").selectpicker({container: "body"});
	$("#cim-file-input").fileinput("reset");
	$("#cim-file-input").fileinput("enable");
	d3.select("#cim-diagrams").selectAll("option").remove();
	d3.select("#cim-diagrams").append("option").attr("disabled", "disabled").html("Select a diagram");
	d3.select("#cim-filename").html("");    
	$(".selectpicker").selectpicker("refresh");
	$("#cim-file-input").fileinput();
	$("#cim-file-input").on("fileloaded", function(event, file, previewId, index, reader) {	    
	    cimFile = file;
	    cimFileReader = reader;
	    $("#cim-load-container").show();
	});
    });

    // here we choose a diagram to display
    riot.route('/diagrams', function(name) {
	cimModel = Object.assign({}, cimDiagramModel());
	riot.mount("cimDiagram", {model: cimModel});
	riot.mount("cimTree", {model: cimModel});
	// things to show
	$("#cim-load-container").show();
	$("#cim-home-container").show();
	$(".selectpicker").selectpicker("show"); // TODO: should wait for diagram list
	// things to hide
	$("#cim-select-file").hide();
	$("#cim-file-input-container").hide();
	$("#cim-load-container").hide();
	// main logic 
	d3.select("#cim-filename").html(cimFile.name);
	cimModel.load(cimFile, cimFileReader, function() {
	    d3.select("#cim-diagrams").append("option").attr("value", "#diagrams/none").text("Generate a new diagram");
	    let diagrams = cimModel.getDiagramList();
	    for (let i in diagrams) {
		d3.select("#cim-diagrams").append("option").attr("value", "#diagrams/"+diagrams[i]).text(diagrams[i]);
		}
	    $(".selectpicker").selectpicker("refresh");
	});
    });

    // here we show a certain diagram
    riot.route('/diagrams/*', function(name) {
	// things to show
	$("#cim-save").show();
	$(".app-container").show();
	// main logic
	$(".selectLabel").click();

	// test: save a copy of the file
	$("#cim-save").on("click", function() {
	    let out = cimModel.save();
	    let blob = new Blob([out], {type : 'text/xml'});
	    let objectURL = URL.createObjectURL(blob);
	    $("#cim-save").attr("href", objectURL);
	});
    });

    // used for tree navigation
    riot.route('/diagrams/*/*', function(name, element) {
    });
    
    riot.route.start(true);
};

// start routing
startRouter();
