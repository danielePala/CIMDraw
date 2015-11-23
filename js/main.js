let cimFile = "";

route('/diagrams/*', function(name) {
    console.log(name);
    d3.select("#cim-diagram-controls").style("display", null);
    document.getElementById("selectLabel").click();
    cimTreeController.render(name);
    cimDiagramController.render(name);
});

route('/diagrams', function(name) {
    console.log('The list of diagrams');
    $('#cim-file-input').fileinput('disable');
    let m = Object.create(cimDiagramModel);
    m.load(cimFile.name, function(error) {
	let diagrams = m.getDiagramList();
	for (i in diagrams) {
	    d3.select("#cim-diagrams").select("ul").append("li").append("a").attr("href", "#diagrams/"+diagrams[i]).text(diagrams[i]);
	}
	cimDiagramController.setModel(m);
	cimTreeController.setModel(m);
    });
    d3.select("#cim-diagrams").style("display", null);
});

// This is the initial route ("the home page").
route(function(name) {
    console.log('The root');
    $("#cim-file-input").fileinput();
    $("#cim-file-input").on("fileloaded", function(event, file, previewId, index, reader) {
	
	/*d3.xml("http://ric302107:8080/com.vogella.jersey.first/rest/cim/Class/ACLineSegment")
	//.header("Accept", "application/rdf+xml")
	.header("Origin", "")
	.get(function(error, data) {
	console.log(error, data);
	});*/
	cimFile = file;
	d3.select("#cim-load").style("display", null);
    });

    $('#cim-file-input').fileinput('enable');
    d3.select("#cim-diagrams").style("display", "none");
    d3.select("#cim-diagram-controls").style("display", "none");
    d3.select("#cim-load").style("display", "none");
});
route.start(true);
