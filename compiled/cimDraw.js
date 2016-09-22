riot.tag2('cimdraw', '<nav class="navbar navbar-default"> <div class="container-fluid"> <div class="navbar-header"> <a class="navbar-brand" href="">CIM network visualization</a> </div> <div class="collapse navbar-collapse"> <p class="navbar-text" id="cim-filename"></p> <a class="btn btn-default navbar-btn navbar-left" href="" role="button" id="cim-home-container">Change file</a> <a class="btn btn-default navbar-btn navbar-left" role="button" id="cim-save" download="file.xml">Save as...</a> <a class="btn btn-default navbar-btn navbar-left" role="button" id="cim-export" download="diagram.xml">Export current diagram</a> <select id="cim-diagrams" class="selectpicker navbar-left navbar-form" onchange="location = this.options[this.selectedIndex].value;" data-live-search="true"> <option disabled="disabled">Select a diagram</option> </select> </div> </div> </nav> <div class="container-fluid"> <div class="row center-block" id="cim-local-file-component"> <div class="row center-block" id="cim-select-file"> <div class="col-md-12"> <label class="control-label">Select File</label> </div> </div> <div class="row center-block"> <div class="col-md-12" id="cim-file-input-container"> <form enctype="multipart/form-data" action="/api/upload" method="POST"> <input id="cim-file-input" name="cim-file" type="file" class="file" multiple data-show-preview="false" data-show-upload="true"> </form> </div> </div> <div class="row center-block"> <div class="col-md-12" id="cim-load-container"> <a class="btn btn-primary btn-lg" role="button" id="cim-load">Load</a> </div> </div> </div> <div class="row diagramTools"> <div class="col-md-4"></div> <div class="col-md-4"></div> </div> <div class="row"> <div class="app-container col-md-12" id="app-container"> <cimtree model="{cimModel}"></cimTree> <cimdiagram model="{cimModel}"></cimDiagram> </div> </div> <div class="modal fade" id="newDiagramModal" tabindex="-1" role="dialog" aria-labelledby="newDiagramModalLabel"> <div class="modal-dialog" role="document"> <div class="modal-content"> <div class="modal-header"> <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button> <h4 class="modal-title" id="newDiagramModalLabel">Enter a name for the new diagram</h4> </div> <div class="modal-body"> <form> <input type="text" class="form-control" id="newDiagramName" placeholder="untitled"> </form> </div> <div class="modal-footer"> <button type="button" class="btn btn-default" data-dismiss="modal">Close</button> <button type="button" class="btn btn-primary" id="newDiagramBtn">Create</button> </div> </div> </div> </div> </div> <div class="modal fade" id="loadingDiagramModal" tabindex="-1" role="dialog" aria-labelledby="loadingDiagramModalLabel"> <div class="modal-dialog" role="document"> <div class="modal-content"> <div class="modal-body"> <p id="loadingDiagramMsg">loading...</p> </div> </div> </div> </div>', '.center-block { width: 600px; text-align: center; } .diagramTools { margin-bottom: 20px; } .app-container { display: flex; flex-flow: row nowrap; }', '', function(opts) {
     "use strict";
     let self = this;
     self.cimModel = cimDiagramModel();
     let childrenRendering = 0;

     self.on("rendering", function() {
	 childrenRendering = childrenRendering + 1;
     });

     self.on("rendered", function() {
	 childrenRendering = childrenRendering - 1;
	 if (childrenRendering === 0) {
	     $("#loadingDiagramModal").modal("hide");
	 }
     });

     self.on("mount", function() {
	 console.log("start router");
	 riot.route.stop();
	 let cimFile = {};
	 let cimFileReader = {};
	 $(".selectpicker").selectpicker({container: "body"});

	 riot.route(function(name) {

	     $("#cim-local-file-component").show();

	     $("#app-container").hide();
	     $("#cim-load-container").hide();
	     $("#cim-home-container").hide();
	     $("#cim-save").hide();
	     $("#cim-export").hide();
	     $(".selectpicker").selectpicker("hide");

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

	 riot.route('/*/diagrams', function() {

	     $("#cim-home-container").show();
	     $(".selectpicker").selectpicker("show");

	     $("#cim-local-file-component").hide();
	     $("#app-container").hide();

	     if (typeof(cimFile.name) !== "undefined") {
		 d3.select("#cim-filename").html(cimFile.name);
		 self.cimModel.load(cimFile, cimFileReader, function() {
		     loadDiagramList(cimFile.name);
		 });
	     } else {
		 let hashComponents = window.location.hash.substring(1).split("/");
		 let file = hashComponents[0];
		 self.cimModel.loadRemote("/" + file, function() {
		     loadDiagramList(file);
		 });
	     }
	 });

	 riot.route('/*/diagrams/*', function(file, name) {
	     $("#cim-local-file-component").hide();
	     $("#loadingDiagramModal").modal("show");
	     $("#loadingDiagramModal").on("shown.bs.modal", function(e) {
		 loadDiagram(file, name);
	     });
	 });

	 function loadDiagram(file, name, element) {
	     self.cimModel.loadRemote("/" + file, showDiagram);
	     function showDiagram(error) {
		 if (error !== null) {
		     riot.route("/");
		     return;
		 }
		 self.cimModel.selectDiagram(decodeURI(name));
		 loadDiagramList(decodeURI(file));
		 $('.selectpicker').selectpicker('val', decodeURI("#" + file + "/diagrams/" + name));
		 self.trigger("showDiagram", file, name, element);
		 $("#app-container").show();

		 $("#cim-export").on("click", function() {
		     let out = self.cimModel.export();
		     let blob = new Blob([out], {type : 'text/xml'});
		     let objectURL = URL.createObjectURL(blob);
		     $("#cim-export").attr("href", objectURL);
		 });
		 $("#cim-export").show();
	     };
	 };

	 function loadDiagramList(filename) {

	     $("#cim-save").on("click", function() {
		 let out = self.cimModel.save();
		 let blob = new Blob([out], {type : 'text/xml'});
		 let objectURL = URL.createObjectURL(blob);
		 $("#cim-save").attr("href", objectURL);
	     });
	     $("#cim-save").show();

	     $(".selectpicker").selectpicker({container: "body"});
	     d3.select("#cim-diagrams").selectAll("option").remove();
	     d3.select("#cim-diagrams").append("option").attr("disabled", "disabled").html("Select a diagram");
	     $(".selectpicker").selectpicker("refresh");
	     d3.select("#cim-diagrams").append("option")
	       .attr("value", "#" + filename + "/createNew")
	       .text("Generate a new diagram");
	     let diagrams = self.cimModel.getDiagramList();
	     for (let i in diagrams) {
		 d3.select("#cim-diagrams").append("option").attr("value", "#" + filename + "/diagrams/"+diagrams[i]).text(diagrams[i]);
	     }
	     $(".selectpicker").selectpicker("refresh");
	 };

	 riot.route("/*/diagrams/*/*", function(file, name, element) {
	     $("#cim-local-file-component").hide();
	     loadDiagram(file, name, element);
	 });

	 riot.route("/*/createNew", function(file) {
	     $("#newDiagramModal").modal("show");
	     d3.select("#newDiagramBtn").on("click", function() {
		 let diagramName = d3.select("#newDiagramName").node().value;
		 let hashComponents = window.location.hash.substring(1).split("/");
		 let basePath = hashComponents[0] + "/diagrams/";
		 let fullPath = basePath + diagramName;
		 $('#newDiagramModal').modal("hide");
		 riot.route(fullPath);
	     });
	 });

	 riot.route.start(true);
     });
});
