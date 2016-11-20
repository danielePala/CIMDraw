<cimDiagramControls>
    <style>
     #cim-diagram-controls { display: none }
     #cim-diagram-elements { display: none }
    </style>

    <div class="container-fluid">
	<div class="row center-block">
	    <div class="col-md-12">
		<div class="btn-toolbar" role="toolbar">
		    <div class="btn-group" role="group" data-toggle="buttons" id="cim-diagram-controls">
			<label class="btn btn-default active" id="selectLabel">
			    <input type="radio" id="select" name="tool" value="select" autocomplete="off" checked>select</input>
			</label>
			<label class="btn btn-default" id="forceLabel">
			    <input type="radio" id="force" name="tool" value="force" autocomplete="off">force (auto-layout)</input>
			</label>
			<label class="btn btn-default" id="connectLabel">
			    <input type="radio" id="connect" name="tool" value="connect" autocomplete="off">edit connections</input>
			</label>
		    </div>

		    <div class="btn-group" role="group">
			<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
			    <span id="addElement">Insert element</span>
			    <span class="caret"></span>
			</button>
			<ul class="dropdown-menu">
			    <li id="addACLine"><a>AC Line Segment</a></li>
			    <li id="addBreaker"><a>Breaker</a></li>
			    <li id="addDisconnector"><a>Disconnector</a></li>
			    <li id="addLoadBreakSwitch"><a>LoadBreakSwitch</a></li>
			    <li id="addJumper"><a>Jumper</a></li>
			    <li id="addJunction"><a>Junction</a></li>
			    <li id="addBusbar"><a>Node</a></li>
			</ul>
		    </div>
		    
		</div>
		</div>
	    </div>
	</div>
    </div>
    
    <script>
     "use strict";
     let self = this;
     let termToChange = undefined;
     
     self.on("mount", function() {

	 $("#addACLine").on("click", function(e) {
	     self.disableAll();
	     self.enableAddACLine();
	 });

 	 $("#addBreaker").on("click", function(e) {
	     self.disableAll();
	     self.enableAddBreaker();
	 });

	 $("#addDisconnector").on("click", function(e) {
	     self.disableAll();
	     self.enableAddDisconnector();
	 });

	 $("#addLoadBreakSwitch").on("click", function(e) {
	     self.disableAll();
	     self.enableAddLoadBreakSwitch();
	 });

	 $("#addJumper").on("click", function(e) {
	     self.disableAll();
	     self.enableAddJumper();
	 });
	 
	 $("#addJunction").on("click", function(e) {
	     self.disableAll();
	     self.enableAddJunction();
	 });

	 $("#addBusbar").on("click", function(e) {
	     self.disableAll();
	     self.enableAddBusbar();
	 });

	 // setup diagram buttons
	 $("#select").change(function() {
	     self.disableAll();
	     self.enableDrag();
	 });
	 
	 $("#force").change(function() {
	     self.disableAll();
	     self.enableForce();
	 });

	 $("#connect").change(function() {
	     self.disableAll();
	     self.enableConnect();
	 });
	 
     });
     
     // listen to 'render' event
     self.parent.on("render", function() {
	 self.disableForce();
	 self.disableZoom();
	 self.disableConnect();
	 self.enableDrag();
	 $("#cim-diagram-controls").show();
	 $("#cim-diagram-elements").show();
     });

     // listen to 'addToDiagram' event 
     self.parent.on("addToDiagram", function() {
	 if (self.status === "DRAG") {
	     self.disableAll();
	     self.enableDrag();
	 }
     });

     // modality for drag+zoom
     d3.select("body")
       .on("keydown", function() {
	   if (typeof(d3.event) === "undefined") {
	       return;
	   }
	   // trap the ctrl key being pressed
	   if (d3.event.ctrlKey) {
	       self.disableAll();
	       self.enableZoom();
	   }
       })
       .on("keyup", function() {
	   self.disableZoom();
	   if (self.status === "DRAG") {
	       if (d3.event.keyCode === 17) { // "Control"
		   self.enableDrag();
	       }
	   }
	   if (self.status === "FORCE") {
	       if (d3.event.keyCode === 17) { // "Control"
		   self.enableForce();
	       }
	   }
	   if (self.status === "CONNECT") {
	       if (d3.event.keyCode === 27) { // "Escape"
		   d3.select("svg").on("mousemove", null);
		   d3.select("svg").selectAll("svg > path").attr("d", null);
		   d3.select("svg").selectAll("svg > circle").attr("transform", "translate(0, 0)");
		   termToChange = undefined;
	       }
	       if (d3.event.keyCode === 17) { // "Control"
		   self.enableConnect();
	       }
	   }
	   if (self.status === "cim:ACLineSegment") {
	       if (d3.event.keyCode === 17) { // "Control"
		   self.enableAddACLine();
	       }
	   }
	   if (self.status === "cim:Breaker") {
	       if (d3.event.keyCode === 17) { // "Control"
		   self.enableAddBreaker();
	       }
	   }
       });

     disableAll() {
	 self.disableDrag();
	 self.disableZoom();
	 self.disableForce();
	 self.disableConnect();
	 self.disableAdd();
     }
     
     enableDrag() {
	 self.disableDrag();
	 d3.select(self.root).selectAll("label:not(#selectLabel)").classed("active", false);
	 $("#select").click();
	 self.status = "DRAG";
	 let drag = d3.drag()
		      .on("drag", function(d) {
			  d.x = d3.event.x;
			  d.px = d.x;
			  d.y = d3.event.y;
			  d.py = d.y;
			  self.parent.forceTick(d3.select(this));
		      })
		      .on("drag.end", function(d) {
			  opts.model.updateActiveDiagram(d, d.lineData);
		      });
	 d3.select("svg").selectAll("svg > g > g:not(.edges) > g").call(drag);
     }

     disableDrag() {
	 d3.select("svg").selectAll("svg > g > g:not(.edges) > g").on(".drag", null);
     }

     enableForce() {
	 let equipments = d3.select("svg").selectAll("svg > g > g:not(.edges) > g");
	 let terminals = equipments.selectAll("g.Terminal");
	 self.d3force = d3.forceSimulation(equipments.data().concat(terminals.data()))
			  .force("link", d3.forceLink(d3.select("svg").selectAll("svg > g > g.edges > g").data()))
			  .on("tick", self.parent.forceTick)
			  .force("charge", d3.forceCollide(5));
	 d3.select(self.root).selectAll("label:not(#forceLabel)").classed("active", false);
	 $("#force").click();
	 self.status = "FORCE";
	 self.d3force.restart(); 
     }

     disableForce() {
	 if (typeof(self.d3force) !== "undefined") {
	     self.d3force.stop();
	 }
     }
     
     enableZoom() {
	 $("#zoom").click();
	 d3.select("svg").selectAll("svg > g > g:not(.edges) > g")
	   .on("click", function (d) {
	       let hashComponents = window.location.hash.substring(1).split("/");
	       let basePath = hashComponents[0] + "/" + hashComponents[1] + "/" + hashComponents[2];
	       if (window.location.hash.substring(1) !== basePath + "/" + d.attributes.getNamedItem("rdf:ID").value) {
		       riot.route(basePath + "/" + d.attributes.getNamedItem("rdf:ID").value);
	       }
	   });
	 let zoomComp = d3.zoom();
	 zoomComp.on("zoom", this.zooming);
	 // enable zooming on svg node
	 d3.select("svg").call(zoomComp);
     }

     disableZoom() {
	 d3.select("svg").selectAll("svg > g > g:not(.edges) > g").on("click", null);
	 d3.select("svg").on(".zoom", null);
     }

     zooming() {
	 d3.select("svg").select("g").attr("transform", d3.event.transform);
	 this.parent.trigger("transform");
     }

     enableConnect() {
	 d3.select(self.root).selectAll("label:not(#connectLabel)").classed("active", false);
         $("#connect").click();
	 self.status = "CONNECT";

	 d3.select("svg").selectAll("svg > g > g:not(.edges) > g > g.Terminal")
	   .on("click", function (d) {
	       let line = d3.line()
		            .x(function(d) { return d.x; })
		            .y(function(d) { return d.y; });
	       
	       let svg = d3.select("svg");
	       let path = svg.selectAll("svg > path");
	       let circle = svg.selectAll("svg > circle");
	       
	       // TEST: directly connect terminals
	       if (typeof(termToChange) !== "undefined") {
		   let cn = opts.model.getGraph([d], "Terminal.ConnectivityNode", "ConnectivityNode.Terminals").map(el => el.source)[0];
		   d3.select("svg").selectAll("svg > path").attr("d", null);
		   d3.select("svg").selectAll("svg > circle").attr("transform", "translate(0, 0)");
		   
		   if (typeof(cn) === "undefined") {
		       cn = opts.model.cimObject("cim:ConnectivityNode");
		       opts.model.setAttribute(cn, "cim:IdentifiedObject.name", "new1");
		       cn.x = (termToChange.x + d.x)/2;
		       cn.y = (termToChange.y + d.y)/2;
		       opts.model.addToActiveDiagram(cn, [{x: 0, y: 0, seq: 1}]);
		   }
		   d3.select("svg").on("mousemove", null);
		   // update the model
		   let schemaLinks = opts.model.getSchemaLinks(termToChange.localName);
		   let schemaLink = schemaLinks.filter(el => el.attributes[0].value === "#Terminal.ConnectivityNode")[0];
		   opts.model.setLink(termToChange, schemaLink, cn);
		   opts.model.setLink(d, schemaLink, cn);
		   termToChange = undefined;
		   return;
	       }

	       svg.on("mousemove", mousemoved);
	       termToChange = d;
	       function mousemoved() {
		   let m = d3.mouse(this);
		   let transform = d3.zoomTransform(d3.select("svg").node());
		   circle.attr("transform", function () {
		       let mousex = m[0] + 10;
		       let mousey = m[1] + 10;
		       return "translate(" + mousex + "," + mousey +")";
		   });
		   path.attr("d", function() {
		       let newx = (d.x*transform.k) + transform.x;
		       let newy = (d.y*transform.k) + transform.y;
		       return line([{x: newx, y: newy}, {x: m[0], y: m[1]}]);
		   });
	       }
	   });
	 d3.select("svg").selectAll("svg > g > g.ConnectivityNodes > g.ConnectivityNode")
	   .on("click", function (d) {
	       d3.select("svg").selectAll("svg > path").attr("d", null);
	       d3.select("svg").selectAll("svg > circle").attr("transform", "translate(0, 0)");
	       if (typeof(termToChange) !== "undefined") {
		   d3.select("svg").on("mousemove", null);
		   // update the model
		   let schemaLinks = opts.model.getSchemaLinks(termToChange.localName);
		   let schemaLink = schemaLinks.filter(el => el.attributes[0].value === "#Terminal.ConnectivityNode")[0];
		   opts.model.setLink(termToChange, schemaLink, d);
		   termToChange = undefined;
	       }
	   });
     }

     disableConnect() {
	 d3.select("svg").selectAll("svg > g > g:not(.edges) > g > g.Terminal")
	   .on("click", null);
	 d3.select("svg").selectAll("svg > g > g.ConnectivityNodes > g.ConnectivityNode")
	   .on("click", null);
     }

     enableAddACLine() {
	 self.enableAdd("cim:ACLineSegment", "AC Line Segment");
     }
     
     enableAddBreaker() {
	 self.enableAdd("cim:Breaker", "Breaker");
     }

     enableAddDisconnector() {
	 self.enableAdd("cim:Disconnector", "Disconnector");
     }

     enableAddLoadBreakSwitch() {
	 self.enableAdd("cim:LoadBreakSwitch", "Load Break Switch");
     }

     enableAddJumper() {
	 self.enableAdd("cim:Jumper", "Jumper");
     }

     enableAddJunction() {
	 self.enableAdd("cim:Junction", "Junction");
     }

     enableAddBusbar() {
	 self.enableAdd("cim:BusbarSection", "Node");
     }

     enableAdd(type, text) {
	 d3.select(self.root).selectAll("label").classed("active", false);
	 $("input").prop('checked', false);
	 $("#addElement").text(text);
	 self.status = type;
	 d3.select("svg").on("click", clicked);
	 function clicked() {
	     let newObject = opts.model.createObject(type);
	     self.parent.addToDiagram(newObject);
	  }
     }

     disableAdd() {
	 $("#addElement").text("Insert element");
	 d3.select("svg").on("click", null);
     }

    </script>

</cimDiagramControls>

