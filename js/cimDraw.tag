<cimDraw>
    <nav class="navbar navbar-default">
	<div class="container-fluid">
	    <div class="navbar-header">
		<a class="navbar-brand" href="">CIM network visualization</a>
	    </div>
	    <div class="collapse navbar-collapse">
		<p class="navbar-text" id="cim-filename"></p>
		<a class="btn btn-default navbar-btn navbar-left" href="" role="button" id="cim-home-container">Change file</a>
		<a class="btn btn-default navbar-btn navbar-left" role="button" id="cim-save" download="file.xml">Save as...</a>
		<select id="cim-diagrams" class="selectpicker navbar-left navbar-form" onchange="location = this.options[this.selectedIndex].value;" data-live-search="true">
		    <option disabled="disabled">Select a diagram</option>
		</select>
	    </div>
	</div><!-- /.container-fluid -->
    </nav>
    
    <div class="container-fluid">
	<div class="row center-block" id="cim-local-file-component">
	    <div class="row center-block" id="cim-select-file">
		<div class="col-md-12">
		    <label class="control-label">Select File</label>
		</div>
	    </div>

	    <div class="row center-block">
		<div class="col-md-12" id="cim-file-input-container">
		    <form enctype="multipart/form-data" action="/api/upload" method="POST">
			<input id="cim-file-input" name="cim-file" type="file" class="file" multiple data-show-preview="false" data-show-upload="false">
		    </form>
		</div>
	    </div>
	    
	    <div class="row center-block">
		<div class="col-md-12" id="cim-load-container">
		    <a class="btn btn-primary btn-lg" role="button" id="cim-load">Load</a>
		</div>
	    </div>
	</div>
	
	<div class="row diagramTools">
	    <div class="col-md-4"></div>	
	    <div class="col-md-4"></div>
	</div>

	<div class="row">
	    <div class="app-container col-md-12" id="app-container">
		<cimTree model={cimModel}></cimTree>
		<cimDiagram model={cimModel}></cimDiagram>
	    </div>
	</div>

    </div>
    <script>
     "use strict";
     let self = this;
     self.cimModel = cimDiagramModel();
     
     self.on("mount", function() {
	 console.log("start router");
	 riot.route.stop(); // clear all the old router callbacks
	 let cimFile = {};
	 let cimFileReader = {};
	 $(".selectpicker").selectpicker({container: "body"});

	 // This is the initial route ("the home page").
	 riot.route(function(name) {
	     // things to show
	     $("#cim-local-file-component").show();
	     // things to hide
	     $("#app-container").hide();
	     $("#cim-load-container").hide();
	     $("#cim-home-container").hide();
	     $("#cim-save").hide();
	     $(".selectpicker").selectpicker("hide");
	     // main logic
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
	     $("#cim-local-file-component").hide();
	     $("#app-container").hide();
	     // main logic
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

	 self.cimModel.on("changedDiagram", function() {
	     let hashComponents = window.location.hash.split("/");
	     let end = window.location.hash.length;
	     if (hashComponents.length === 4) {
		 end = window.location.hash.lastIndexOf("/");
	     }
	     $('.selectpicker').selectpicker('val', decodeURI(window.location.hash.substring(0, end)));
	 });

	 // here we show a certain diagram
	 riot.route('/*/diagrams/*', function(file, name) {	
	     $("#cim-local-file-component").hide();
	     loadDiagram(file, name);
	 });

	 // creates a new model if it doesn't exist, and shows a diagram.
	 function loadDiagram(file, name, element) {
	     self.cimModel.loadRemote("/" + file, showDiagram);
	     function showDiagram(error) {
		 if (error !== null) {
		     riot.route("/");
		     return;
		 }
		 loadDiagramList(decodeURI(file));
		 self.cimModel.selectDiagram(decodeURI(name));
		 $(".selectLabel").click();
		 self.trigger("showDiagram", file, name, element);
		 $("#app-container").show();
	     };
	 };

	 function loadDiagramList(filename) {
	     // allow saving a copy of the file 
	     $("#cim-save").on("click", function() {
		 let out = self.cimModel.save();
		 let blob = new Blob([out], {type : 'text/xml'});
		 let objectURL = URL.createObjectURL(blob);
		 $("#cim-save").attr("href", objectURL);
	     });
	     $("#cim-save").show();
	     // load diagram list
	     $(".selectpicker").selectpicker({container: "body"});
	     d3.select("#cim-diagrams").selectAll("option").remove();
	     d3.select("#cim-diagrams").append("option").attr("disabled", "disabled").html("Select a diagram");
	     $(".selectpicker").selectpicker("refresh");
	     d3.select("#cim-diagrams").append("option").attr("value", "#" + filename + "/diagrams/new1").text("Generate a new diagram");
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

	 // start router
	 riot.route.start(true);
     });
    </script>
</cimDraw>
