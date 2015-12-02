let cimFile = "";

route('/diagrams/*', function(name) {
    d3.select("#cim-diagram-controls").style("display", null);
    document.getElementById("selectLabel").click();
    cimTreeController.render(name);
    cimDiagramController.render(name);
    d3.select("svg").style("border", "1px solid black");
});

route('/diagrams', function(name) {
    d3.select("#cim-select-file").style("display", "none");
    d3.select("#cim-file-input-container").style("display", "none");
    d3.select("#cim-load-container").style("display", "none");
    d3.select("#cim-home-container").style("display", null);
    
    let m = Object.create(cimDiagramModel);
    m.load(cimFile.name, function(error) {
	let diagrams = m.getDiagramList();
	for (i in diagrams) {
	    d3.select("#cim-diagrams").append("option").attr("value", "#diagrams/"+diagrams[i]).text(diagrams[i]);
	    $(".selectpicker").selectpicker("refresh");
	}
	cimDiagramController.setModel(m);
	cimTreeController.setModel(m);
    });
    $(".selectpicker").selectpicker("show");    
});

// This is the initial route ("the home page").
route(function(name) {
    d3.select("#cim-select-file").style("display", null);
    d3.select("#cim-file-input-container").style("display", null);
    $("#cim-file-input").fileinput("reset");
    $("#cim-file-input").fileinput("enable");
    $(".selectpicker").selectpicker("hide");
    d3.select("#cim-diagram-controls").style("display", "none");
    d3.select("#cim-load-container").style("display", "none");
    d3.select("#cim-home-container").style("display", "none");
    d3.select("svg").style("border", "0px");
    d3.select("#cim-diagrams").select("select").selectAll("option").remove();
    d3.select("#cim-diagrams").select("select").append("option").attr("disabled", "disabled").html("Select a diagram");
    
    $(".selectpicker").selectpicker();
    $("#cim-file-input").fileinput();
    $("#cim-file-input").on("fileloaded", function(event, file, previewId, index, reader) {
	
	/*d3.xml("http://ric302107:8080/com.vogella.jersey.first/rest/cim/Class/ACLineSegment")
	.header("Accept", "application/rdf+xml")
	.header("Origin", "")
	.get(function(error, data) {
	    console.log(error, data);
	});*/
	
	cimFile = file;
	d3.select("#cim-load-container").style("display", null);
    });
});
route.start(true);
