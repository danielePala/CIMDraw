"use strict";

function startRouter() {
    console.log("start router");
    riot.route.stop(); // clear all the old router callbacks
    let cimFile = {};
    let cimFileReader = {};
    let cimModel = cimDiagramModel();

    // This is the initial route ("the home page").
    riot.route(function(name) {
	// things to show
	$("#cim-select-file").show();
	$("#cim-file-input-container").show();
	// things to hide
	$("#cim-load-container").hide();
	$("#cim-home-container").hide();
	$("#cim-save").hide();
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
	    $("#cim-load").attr("href", "#" + encodeURI(cimFile.name) + "/diagrams");
	    $("#cim-load-container").show();
	});
    });

    // here we choose a diagram to display
    riot.route('/*/diagrams', function() {
	// things to show
	$("#cim-home-container").show();
	$(".selectpicker").selectpicker("show"); // TODO: should wait for diagram list
	// things to hide
	$("#cim-select-file").hide();
	$("#cim-file-input-container").hide();
	$("#cim-load-container").hide();
	// main logic
	if (typeof(cimFile.name) !== "undefined") {
	    d3.select("#cim-filename").html(cimFile.name);
	    cimModel.load(cimFile, cimFileReader, function() {
		loadList(cimFile.name);
	    }); 
	} else {
	    let hashComponents = window.location.hash.substring(1).split("/");
	    let file = hashComponents[0];
	    cimModel.loadRemote("/" + file, function() {
		loadList(file);
	    });
	}

	function loadList(filename) {
	    d3.select("#cim-diagrams").append("option").attr("value", "#" + filename + "/diagrams/none").text("Generate a new diagram");
	    let diagrams = cimModel.getDiagramList();
	    for (let i in diagrams) {
		d3.select("#cim-diagrams").append("option").attr("value", "#" + filename + "/diagrams/"+diagrams[i]).text(diagrams[i]);
	    }
	    $(".selectpicker").selectpicker("refresh");
	};
    });

    cimModel.on("changedDiagram", function() {
	$('.selectpicker').selectpicker('val', decodeURI(window.location.hash));
    });

    // here we show a certain diagram
    riot.route('/*/diagrams/*', function(file, name) {	
	loadDiagram(file, name);
    });

    // creates a new model if it doesn't exist, and shows a diagram.
    function loadDiagram(file, name) {
	cimModel.loadRemote("/" + file, showDiagram);
	function showDiagram() {
	    cimModel.selectDiagram(decodeURI(name));
	    $("#cim-save").show();
	    $(".selectLabel").click();

	    // test: save a copy of the file
	    $("#cim-save").on("click", function() {
		let out = cimModel.save();
		let blob = new Blob([out], {type : 'text/xml'});
		let objectURL = URL.createObjectURL(blob);
		$("#cim-save").attr("href", objectURL);
	    });
	};
    };

    function loadDiagramList() {
	$(".selectpicker").selectpicker({container: "body"});
	d3.select("#cim-diagrams").selectAll("option").remove();
	d3.select("#cim-diagrams").append("option").attr("disabled", "disabled").html("Select a diagram");
	$(".selectpicker").selectpicker("refresh");
	d3.select("#cim-diagrams").append("option").attr("value", "#" + encodeURI(filename) + "/diagrams/none").text("Generate a new diagram");
	let diagrams = cimModel.getDiagramList();
	for (let i in diagrams) {
	    d3.select("#cim-diagrams").append("option").attr("value", "#" + encodeURI(filename) + "/diagrams/"+diagrams[i]).text(diagrams[i]);
	}
	$(".selectpicker").selectpicker("refresh");
    };

    riot.route("/*/diagrams/*/*", function(file, name, element) {
	loadDiagram(file, name);
    });

    // mount tags
    riot.mount("cimDiagram", {model: cimModel});
    riot.mount("cimTree", {model: cimModel});
    // start router
    riot.route.start(true);
};

// start routing
startRouter();
