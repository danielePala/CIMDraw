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
			    <input type="radio" id="select" name="tool" value="select" autocomplete="off" checked="checked">select</input>
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
			    <li class="dropdown-header">Busses</li>
			    <li id="addBusbar" onclick={enableAddBusbar}><a>Node</a></li>
			    <li class="dropdown-header">Branches</li>
			    <li id="addACLine" onclick={enableAddACLine}><a>AC Line Segment</a></li>
			    <li class="dropdown-header">Switches</li>
			    <li id="addBreaker" onclick={enableAddBreaker}><a>Breaker</a></li>
			    <li id="addDisconnector" onclick={enableAddDisconnector}><a>Disconnector</a></li>
			    <li id="addLoadBreakSwitch" onclick={enableAddLoadBreakSwitch}><a>Load Break Switch</a></li>
			    <li id="addJumper" onclick={enableAddJumper}><a>Jumper</a></li>
			    <li class="dropdown-header">Connectors</li>
			    <li id="addJunction" onclick={enableAddJunction}><a>Junction</a></li>
			    <li class="dropdown-header">Generators</li>
			    <li id="addEnergySource" onclick={enableAddEnergySource}><a>Energy Source</a></li>
			    <li id="addSynchronousMachine" onclick={enableAddSynchronousMachine}><a>Synchronous Machine</a></li>
			    <li class="dropdown-header">Loads</li>
			    <li id="addEnergyConsumer" onclick={enableAddEnergyConsumer}><a>Energy Consumer</a></li>
			    <li id="addConformLoad" onclick={enableAddConformLoad}><a>Conform Load</a></li>
			    <li id="addNonConformLoad" onclick={enableAddNonConformLoad}><a>Non Conform Load</a></li>
			    <li class="dropdown-header">Transformers</li>
			    <li id="addTwoWindingTransformer" onclick={enableAddTwoWindingTransformer}><a>Two-winding Transformer</a></li>
			</ul>
		    </div>
		    
		</div>
	    </div>
	</div>
    </div>
    
    <script>
     "use strict";
     let self = this;
     let termToChange = undefined;
     let quadtree = d3.quadtree();
     let selected = [];
     
     self.on("mount", function() {
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
	 // setup quadtree
	 let points = d3.select("svg").selectAll("svg > g.diagram > g:not(.edges) > g");
	 quadtree.x(function(d) {
	     return d3.select(d).data()[0].x;
	 }).y(function(d) {
	     return d3.select(d).data()[0].y;
	 }).addAll(points.nodes());
	 // anble drag by default
	 self.disableForce();
	 self.disableZoom();
	 self.disableConnect();
	 self.enableDrag();
	 $("#cim-diagram-controls").show();
	 $("#cim-diagram-elements").show();
     });

     // listen to 'addToDiagram' event 
     self.parent.on("addToDiagram", function(selection) {
	 if (selection.size() === 1) {
	     quadtree.add(selection.node()); // update the quadtree
	     if (self.status === "DRAG") {
		 self.disableAll();
		 self.enableDrag();
	     }
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
		      .on("drag.start", function(d) {
			  let dNode = d3.select(this).node();
			  if (selected.indexOf(dNode) === -1) {
			      deselectAll();
			  }
			  if (selected.length === 0) {
			      selected.push(dNode);
			      self.parent.hover(dNode);
			  }
			  quadtree.removeAll(selected); // update quadtree
		      })
		      .on("drag", function(d) {
			  let deltax = d3.event.x - d.x;
			  let deltay = d3.event.y - d.y;
			  for (let selNode of selected) {
			      let dd = d3.select(selNode).data()[0];
			      dd.x = dd.x + deltax;
			      dd.px = dd.x;
			      dd.y = dd.y + deltay;
			      dd.py = dd.y;
			  }
			  self.parent.forceTick(d3.selectAll(selected));
		      })
		      .on("drag.end", function(d) {
			  opts.model.updateActiveDiagram(d, d.lineData);
			  quadtree.addAll(selected); // update quadtree
		      });
	 d3.select("svg").selectAll("svg > g.diagram > g:not(.edges) > g").call(drag);
	 d3.select("svg").select("g.brush").call(d3.brush().on("start", deselectAll).on("end", selectInsideBrush));
	 function deselectAll() {
	     selected = [];
	     d3.select("svg").selectAll("svg > g.diagram > g > g").selectAll("rect").remove();
	 };
	 function selectInsideBrush() {
	     // hide the brush
	     d3.select("svg").select("g.brush").selectAll("*:not(.overlay)").style("display", "none");
	     // test quadtree
	     let extent = d3.event.selection;
	     if (extent === null) {
		 return;
	     }
	     selected = [];
	     let transform = d3.zoomTransform(d3.select("svg").node());
	     let tx = transform.x;
	     let ty = transform.y;
	     let tZoom = transform.k;	     
	     search(quadtree, (extent[0][0] - tx)/tZoom, (extent[0][1] - ty)/tZoom, (extent[1][0] - tx)/tZoom, (extent[1][1] - ty)/tZoom);
	     for (let el of selected) {
		     self.parent.hover(el);
	     }
	     // Find the nodes within the specified rectangle.
	     function search(quadtree, x0, y0, x3, y3) {
		 quadtree.visit(function(node, x1, y1, x2, y2) {
		     if (!node.length) {
			 do {
			     var d = node.data;
			     let dx = d3.select(d).data()[0].x;
			     let dy = d3.select(d).data()[0].y;
			     if((dx >= x0) && (dx < x3) && (dy >= y0) && (dy < y3)) {
				 selected.push(d);
			     }
			 } while (node = node.next);
		     }
		     return x1 >= x3 || y1 >= y3 || x2 < x0 || y2 < y0;
		 });
	     }
	 };
     }

     disableDrag() {
	 d3.select("svg").selectAll("svg > g.diagram > g:not(.edges) > g").on(".drag", null);
	 d3.select("svg").select("g.brush").on(".brush", null); 
     }

     enableForce() {
	 let equipments = d3.select("svg").selectAll("svg > g.diagram > g:not(.edges) > g");
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
	 d3.select("svg").selectAll("svg > g.diagram > g:not(.edges) > g")
	   .on("click", function (d) {
	       let hashComponents = window.location.hash.substring(1).split("/");
	       let basePath = hashComponents[0] + "/" + hashComponents[1] + "/" + hashComponents[2];
	       if (window.location.hash.substring(1) !== basePath + "/" + d.attributes.getNamedItem("rdf:ID").value) {
		       route(basePath + "/" + d.attributes.getNamedItem("rdf:ID").value);
	       }
	   });
	 let zoomComp = d3.zoom();
	 zoomComp.on("zoom", this.zooming);
	 // enable zooming on svg node
	 d3.select("svg").call(zoomComp);
     }

     disableZoom() {
	 d3.select("svg").selectAll("svg > g.diagram > g:not(.edges) > g").on("click", null);
	 d3.select("svg").on(".zoom", null);
     }

     zooming() {
	 d3.select("svg").select("g.diagram").attr("transform", d3.event.transform);
	 this.parent.trigger("transform");
     }

     enableConnect() {
	 d3.select(self.root).selectAll("label:not(#connectLabel)").classed("active", false);
         $("#connect").click();
	 self.status = "CONNECT";

	 d3.select("svg").selectAll("svg > g.diagram > g:not(.edges) > g > g.Terminal")
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
		   let schemaLinkName = "cim:" + schemaLink.attributes[0].value.substring(1);
		   opts.model.setLink(termToChange, schemaLinkName, cn);
		   opts.model.setLink(d, schemaLinkName, cn);
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
	 d3.select("svg").selectAll("svg > g.diagram > g.ConnectivityNodes > g.ConnectivityNode")
	   .on("click", function (d) {
	       d3.select("svg").selectAll("svg > path").attr("d", null);
	       d3.select("svg").selectAll("svg > circle").attr("transform", "translate(0, 0)");
	       if (typeof(termToChange) !== "undefined") {
		   d3.select("svg").on("mousemove", null);
		   // update the model
		   let schemaLinks = opts.model.getSchemaLinks(termToChange.localName);
		   let schemaLink = schemaLinks.filter(el => el.attributes[0].value === "#Terminal.ConnectivityNode")[0];
		   let schemaLinkName = "cim:" + schemaLink.attributes[0].value.substring(1);
		   opts.model.setLink(termToChange, schemaLinkName, d);
		   termToChange = undefined;
	       }
	   });
     }

     disableConnect() {
	 d3.select("svg").selectAll("svg > g.diagram > g:not(.edges) > g > g.Terminal")
	   .on("click", null);
	 d3.select("svg").selectAll("svg > g.diagram > g.ConnectivityNodes > g.ConnectivityNode")
	   .on("click", null);
     }

     enableAddACLine() {
	 self.enableAddMulti("cim:ACLineSegment", "AC Line Segment");
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

     enableAddEnergySource() {
	 self.enableAdd("cim:EnergySource", "Energy Source");
     }

     enableAddSynchronousMachine() {
	 self.enableAdd("cim:SynchronousMachine", "Synchronous Machine");
     }

     enableAddEnergyConsumer() {
	 self.enableAdd("cim:EnergyConsumer", "Energy Consumer");
     }

     enableAddConformLoad() {
	 self.enableAdd("cim:ConformLoad", "Conform Load");
     }

     enableAddNonConformLoad() {
	 self.enableAdd("cim:NonConformLoad", "Non Conform Load");
     }

     enableAddBusbar() {
	 self.enableAddMulti("cim:BusbarSection", "Node");
     }

     enableAddTwoWindingTransformer() {
	 self.enableAdd("cim:PowerTransformer", "Two-winding Transformer");
     }
     
     enableAdd(type, text) {
	 self.disableAll();
	 d3.select(self.root).selectAll("label").classed("active", false);
	 $("input").prop('checked', false);
	 $("#addElement").text(text);
	 self.status = type;
	 d3.select("svg").on("click.add", clicked);
	 function clicked() {
	     let newObject = opts.model.createObject(type);
	     self.parent.addToDiagram(newObject);
	  }
     }

     // test to draw multi-segment objects
     enableAddMulti(type, text) {
	 self.disableAll();
	 d3.select(self.root).selectAll("label").classed("active", false);
	 $("input").prop('checked', false);
	 $("#addElement").text(text);
	 self.status = type;
	 d3.select("svg").on("click.add", clicked);
	 let newObject = undefined;
	 function clicked() {
	     let line = d3.line()
		          .x(function(d) { return d.x; })
		          .y(function(d) { return d.y; });
	     
	     let svg = d3.select("svg");
	     let path = svg.selectAll("svg > path");
	     let circle = svg.selectAll("svg > circle");
	     function mousemoved() {
		 let m = d3.mouse(this);
		 let transform = d3.zoomTransform(d3.select("svg").node());
		 circle.attr("transform", function () {
		     let mousex = m[0] + 10;
		     let mousey = m[1] + 10;
		     return "translate(" + mousex + "," + mousey +")";
		 });
		 path.attr("d", function() {
		     let lineData = [];
		     for (let linePoint of newObject.lineData) {
			 lineData.push({x: ((linePoint.x+newObject.x)*transform.k) + transform.x,
					y: ((linePoint.y+newObject.y)*transform.k) + transform.y});
		     }
		     lineData.push({x: m[0], y: m[1]});
		     return line(lineData);
		 });
	     }
	     
	     if (self.status === type) {
		 d3.select("svg").on("contextmenu.add", finish);
		 svg.on("mousemove", mousemoved);
		 newObject = opts.model.createObject(type);
		 let m = d3.mouse(d3.select("svg").node());
		 let transform = d3.zoomTransform(d3.select("svg").node());
		 let xoffset = transform.x;
		 let yoffset = transform.y;
		 let svgZoom = transform.k;
		 newObject.x = (m[0] - xoffset) / svgZoom;
		 newObject.px = newObject.x;
		 newObject.y = (m[1] - yoffset) / svgZoom;
		 newObject.py = newObject.y;
		 newObject.lineData = [{x: 0, y: 0, seq: 1}];
		 self.status = "drawing"
	     } else {
		 let m = d3.mouse(d3.select("svg").node());
		 let transform = d3.zoomTransform(d3.select("svg").node());
		 let xoffset = transform.x;
		 let yoffset = transform.y;
		 let svgZoom = transform.k;
		 let newx = ((m[0] - xoffset) / svgZoom) - newObject.x;
		 let newy = ((m[1] - yoffset) / svgZoom) - newObject.y;
		 let newSeq = newObject.lineData.length + 1;
		 newObject.lineData.push({x: newx, y: newy, seq: newSeq});
	     }
	 };
	 
	 function finish() {
	     d3.event.preventDefault();
	     let m = d3.mouse(d3.select("svg").node());
	     let transform = d3.zoomTransform(d3.select("svg").node());
	     let xoffset = transform.x;
	     let yoffset = transform.y;
	     let svgZoom = transform.k;
	     let newx = ((m[0] - xoffset) / svgZoom) - newObject.x;
	     let newy = ((m[1] - yoffset) / svgZoom) - newObject.y;
	     let newSeq = newObject.lineData.length + 1;
	     newObject.lineData.push({x: newx, y: newy, seq: newSeq});
	     opts.model.addToActiveDiagram(newObject, newObject.lineData);
	     self.status = type;
	     d3.select("svg").on("mousemove", null);
	     d3.select("svg").selectAll("svg > path").attr("d", null);
	     d3.select("svg").selectAll("svg > circle").attr("transform", "translate(0, 0)");
	     // disable ourselves
	     d3.select("svg").on("contextmenu.add", null);
	 };
     }

     disableAdd() {
	 $("#addElement").text("Insert element");
	 d3.select("svg").on("click.add", null);
	 d3.select("svg").on("contextmenu.add", null);
     }

    </script>

</cimDiagramControls>

