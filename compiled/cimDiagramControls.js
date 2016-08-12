riot.tag2('cimdiagramcontrols', '<div class="container-fluid"> <div class="row center-block"> <div class="col-md-12"> <div class="btn-toolbar" role="toolbar"> <div class="btn-group" role="group" data-toggle="buttons" id="cim-diagram-controls"> <label class="btn btn-default active" id="selectLabel"> <input type="radio" id="select" name="tool" value="select" autocomplete="off" checked>select</input> </label> <label class="btn btn-default" id="forceLabel"> <input type="radio" id="force" name="tool" value="force" autocomplete="off">force (auto-layout)</input> </label> <label class="btn btn-default" id="connectLabel"> <input type="radio" id="connect" name="tool" value="connect" autocomplete="off">edit connections</input> </label> </div> <div class="btn-group" role="group" data-toggle="buttons" id="cim-diagram-elements"> <label class="btn btn-default" id="aclineLabel"> <input type="radio" id="addACLine" name="tool" value="addACLine" autocomplete="off">AC Line Segment</input> </label> <label class="btn btn-default" id="breakerLabel"> <input type="radio" id="addBreaker" name="tool" value="addBreaker" autocomplete="off">breaker</input> </label> </div> </div> </div> </div> </div> </div>', '#cim-diagram-controls { display: none } #cim-diagram-elements { display: none }', '', function(opts) {
     "use strict";
     let self = this;
     let zoomComp = d3.zoom();
     let zoomEnabled = false;
     let termToChange = undefined;

     self.on("mount", function() {

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

	 $("#addACLine").change(function() {
	     self.disableAll();
	     self.enableAddACLine();
	 });

	 $("#addBreaker").change(function() {
	     self.disableAll();
	     self.enableAddBreaker();
	 });
     });

     self.parent.on("transform", function() {

     });

     self.parent.on("render", function() {
	 self.force = d3.forceSimulation(self.parent.nodes)
			.force("link", d3.forceLink(self.parent.edges))
			.on("tick", self.parent.forceTick)
			.force("charge", d3.forceManyBody());
	 self.disableForce();
	 self.disableZoom();
	 self.disableConnect();
	 self.enableDrag();
	 $("#cim-diagram-controls").show();
	 $("#cim-diagram-elements").show();
     });

     self.parent.on("addToDiagram", function() {
	 if (self.status === "DRAG") {
	     self.disableAll();
	     self.enableDrag();
	 }
     });

     d3.select("body")
       .on("keydown", function() {
	   if (typeof(d3.event) === "undefined") {
	       return;
	   }

	   if (d3.event.ctrlKey) {
	       self.disableAll();
	       self.enableZoom();
	   }
       })
       .on("keyup", function() {
	   self.disableZoom();
	   if (self.status === "DRAG") {
	       if (d3.event.keyCode === 17) {
		   self.enableDrag();
	       }
	   }
	   if (self.status === "FORCE") {
	       if (d3.event.keyCode === 17) {
		   self.enableForce();
	       }
	   }
	   if (self.status === "CONNECT") {
	       if (d3.event.keyCode === 27) {
		   d3.select("svg").on("mousemove", null);
		   d3.select("svg").selectAll("svg > path").attr("d", null);
		   d3.select("svg").selectAll("svg > circle").attr("transform", "translate(0, 0)");
		   termToChange = undefined;
	       }
	       if (d3.event.keyCode === 17) {
		   self.enableConnect();
	       }
	   }
	   if (self.status === "ACLINE") {
	       if (d3.event.keyCode === 17) {
		   self.enableAddACLine();
	       }
	   }
	   if (self.status === "BREAKER") {
	       if (d3.event.keyCode === 17) {
		   self.enableAddBreaker();
	       }
	   }
       });

     this.disableAll = function() {
	 self.disableDrag();
	 self.disableZoom();
	 self.disableForce();
	 self.disableConnect();
	 self.disableAddACLine();
	 self.disableAddBreaker();
     }.bind(this)

     this.enableDrag = function() {
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
     }.bind(this)

     this.disableDrag = function() {
	 let drag = d3.drag()
		      .on("drag", null);
	 d3.select("svg").selectAll("svg > g > g:not(.edges) > g").call(drag);
     }.bind(this)

     this.enableForce = function() {
	 d3.select(self.root).selectAll("label:not(#forceLabel)").classed("active", false);
	 $("#force").click();
	 self.status = "FORCE";
	 self.force.restart();
     }.bind(this)

     this.disableForce = function() {
	 self.force.stop();
     }.bind(this)

     this.enableZoom = function() {
	 $("#zoom").click();
	 d3.select("svg").selectAll("svg > g > g:not(.edges) > g")
	   .on("click", function (d) {
	       let hashComponents = window.location.hash.substring(1).split("/");
	       let basePath = hashComponents[0] + "/" + hashComponents[1] + "/" + hashComponents[2];
	       if (window.location.hash.substring(1) !== basePath + "/" + d.attributes.getNamedItem("rdf:ID").value) {
		       riot.route(basePath + "/" + d.attributes.getNamedItem("rdf:ID").value);
	       }
	   });
	 if (typeof(zoomComp) === "undefined") {
	     zoomComp = d3.zoom();
	 }
	 zoomComp.on("zoom", this.zooming);

	 d3.select("svg").call(zoomComp);
	 zoomEnabled = true;
     }.bind(this)

     this.disableZoom = function() {
	 if (zoomEnabled===true) {
	     d3.select("svg").selectAll("svg > g > g:not(.edges) > g").on("click", null);
	     zoomComp.on("zoom", null);
	     d3.select("svg").call(zoomComp);
	     zoomEnabled = false;
	 }
     }.bind(this)

     this.zooming = function() {
	 d3.select("svg").select("g").attr("transform", d3.event.transform);
	 this.parent.trigger("transform");
     }.bind(this)

     this.enableConnect = function() {
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

	       if (typeof(termToChange) !== "undefined") {
		   let cn = opts.model.getGraph([d], "Terminal.ConnectivityNode", "ConnectivityNode.Terminals").map(el => el.source)[0];
		   d3.select("svg").selectAll("svg > path").attr("d", null);
		   d3.select("svg").selectAll("svg > circle").attr("transform", "translate(0, 0)");

		   if (typeof(cn) === "undefined") {
		       cn = opts.model.cimObject("cim:ConnectivityNode");
		       opts.model.setAttribute(cn, "cim:IdentifiedObject.name", "new1");
		   }
		   d3.select("svg").on("mousemove", null);

		   let schemaLinks = opts.model.getSchemaLinks(termToChange.localName);
		   let schemaLink = schemaLinks.filter(el => el.attributes[0].value === "#Terminal.ConnectivityNode")[0];
		   opts.model.setLink(termToChange, schemaLink, cn);
		   opts.model.setLink(d, schemaLink, cn);
		   self.parent.drawConnectivityNodes([cn]);
		   self.parent.forceTick();
		   termToChange = undefined;
		   return;
	       }

	       svg.on("mousemove", mousemoved);
	       termToChange = d;
	       function mousemoved() {
		   let m = d3.mouse(this);
		   let transform = d3.zoomTransform(d3.select("svg").select("g"));
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

		   let schemaLinks = opts.model.getSchemaLinks(termToChange.localName);
		   let schemaLink = schemaLinks.filter(el => el.attributes[0].value === "#Terminal.ConnectivityNode")[0];
		   opts.model.setLink(termToChange, schemaLink, d);
		   termToChange = undefined;
	       }
	   });
     }.bind(this)

     this.disableConnect = function() {
	 d3.select("svg").selectAll("svg > g > g:not(.edges) > g > g.Terminal")
	   .on("click", null);
	 d3.select("svg").selectAll("svg > g > g.ConnectivityNodes > g.ConnectivityNode")
	   .on("click", null);
     }.bind(this)

     this.enableAddACLine = function() {
	 d3.select(self.root).selectAll("label:not(#aclineLabel)").classed("active", false);
	 $("#addACLine").click();
	 self.status = "ACLINE";
	 d3.select("svg").on("click", clicked);
	 function clicked() {
	     opts.model.createObject("cim:ACLineSegment");
	  }
     }.bind(this)

     this.disableAddACLine = function() {
	 d3.select("svg").on("click", null);
     }.bind(this)

     this.enableAddBreaker = function() {
	 d3.select(self.root).selectAll("label:not(#breakerLabel)").classed("active", false);
	 $("#addBreaker").click();
	 self.status = "BREAKER";
	 d3.select("svg").on("click", clicked);
	 function clicked() {
	     opts.model.createObject("cim:Breaker");
	  }
     }.bind(this)

     this.disableAddBreaker = function() {
	 d3.select("svg").on("click", null);
     }.bind(this)

});

