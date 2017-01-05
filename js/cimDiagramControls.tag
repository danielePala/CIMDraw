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
			<ul class="dropdown-menu" id="cimElementList">
			    <li class="dropdown-header">Busses</li>
			    <li id="cim:BusbarSection" onclick={enableAddMulti}><a>Node</a></li>
			    <li class="dropdown-header">Branches</li>
			    <li id="cim:ACLineSegment" onclick={enableAddMulti}><a>AC Line Segment</a></li>
			    <li class="dropdown-header">Switches</li>
			    <li id="cim:Breaker" onclick={enableAdd}><a>Breaker</a></li>
			    <li id="cim:Disconnector" onclick={enableAdd}><a>Disconnector</a></li>
			    <li id="cim:LoadBreakSwitch" onclick={enableAdd}><a>Load Break Switch</a></li>
			    <li id="cim:Jumper" onclick={enableAdd}><a>Jumper</a></li>
			    <li class="dropdown-header">Connectors</li>
			    <li id="cim:Junction" onclick={enableAdd}><a>Junction</a></li>
			    <li class="dropdown-header">Generators</li>
			    <li id="cim:EnergySource" onclick={enableAdd}><a>Energy Source</a></li>
			    <li id="cim:SynchronousMachine" onclick={enableAdd}><a>Synchronous Machine</a></li>
			    <li class="dropdown-header">Loads</li>
			    <li id="cim:EnergyConsumer" onclick={enableAdd}><a>Energy Consumer</a></li>
			    <li id="cim:ConformLoad" onclick={enableAdd}><a>Conform Load</a></li>
			    <li id="cim:NonConformLoad" onclick={enableAdd}><a>Non Conform Load</a></li>
			    <li class="dropdown-header">Transformers</li>
			    <li id="cim:PowerTransformer" onclick={enableAdd}><a>Two-winding Transformer</a></li>
			</ul>
		    </div>
		    
		</div>
	    </div>
	</div>
    </div>
    
    <script>
     "use strict";
     let self = this;
     let quadtree = d3.quadtree();
     let selected = [];
     let menu = [
	 {
	     title: 'Rotate',
	     action: function(elm, d, i) {
		 let selection = d3.select(elm);
		 let terminals = opts.model.getTerminals(selection.data());
		 terminals.forEach(function (terminal) {
		     terminal.rotation = terminal.rotation + 90;
		 });
		 d.rotation = d.rotation + 90;
		 opts.model.updateActiveDiagram(d, d.lineData);
		 self.parent.forceTick(selection); // TODO: remove this for flux
	     }
	 },
	 {
	     title: 'Delete',
	     action: function(elm, d, i) {
		 if (selected.indexOf(elm) === -1) {
		     self.deselectAll();
		     selected.push(elm);
		     self.parent.hover(elm);
		 }
		 quadtree.removeAll(selected); // update quadtree
		 let selection = d3.selectAll(selected);
		 
		 let terminals = opts.model.getTerminals(selection.data());
		 d3.select("svg").selectAll("svg > g.diagram > g.edges > g").filter(function(d) {
		     return selection.data().indexOf(d.source) > -1 || terminals.indexOf(d.target) > -1;
		 }).remove();
		 selection.remove();
		 // delete from model
		 for (let datum of selection.data()) {
		     opts.model.deleteObject(datum);
		 }
	     }
	 },
	 {
	     title: 'Delete from current diagram',
	     action: function(elm, d, i) {
		 let selection = d3.select(elm);
		 let terminals = opts.model.getTerminals(selection.data());
		 d3.select("svg").selectAll("svg > g.diagram > g.edges > g").filter(function(d) {
		     return selection.data().indexOf(d.source) > -1 || terminals.indexOf(d.target) > -1;
		 }).remove();
		 selection.remove();
		 // delete from model
		 opts.model.deleteFromDiagram(selection.datum());
	     }
	 }
     ];
     
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
	 // setup context menu
	 points.on("contextmenu", d3.contextMenu(menu));
	 // enable drag by default
	 self.disableForce();
	 self.disableZoom();
	 self.disableConnect();
	 self.enableDrag();
	 $("#cim-diagram-controls").show();
	 $("#cim-diagram-elements").show();
     });

     // listen to 'addToDiagram' event from parent 
     self.parent.on("addToDiagram", function(selection) {
	 if (selection.size() === 1) {
	     quadtree.add(selection.node()); // update the quadtree
	     if (self.status === "DRAG") {
		 self.disableAll();
		 self.enableDrag();
	     }
	     selection.on("contextmenu", d3.contextMenu(menu));
	 }
     });

     // Listen to 'transform' event from parent.
     // Needed if zooming while connecting objects or drawing multi-lines.
     self.parent.on("transform", function() {
	 let pathData = d3.select("svg > path").datum();
	 if (typeof(pathData) === "undefined") {
	     return;
	 }
	 let line = d3.line()
		      .x(function(d) { return d.x; })
		      .y(function(d) { return d.y; });
	 let path = d3.select("svg > path");
         let transform = d3.zoomTransform(d3.select("svg").node());
	 let circleTr = d3.select("svg > circle").node().transform.baseVal.consolidate();
	 if (circleTr === null) {
	     return;
	 }
	 let circleMatrix = circleTr.matrix;
	 let cx = circleMatrix.e - 10;
	 let cy = circleMatrix.f - 10;
	 let lineData = [];
	 if (typeof(pathData.lineData) === "undefined") {
	     lineData.push({x: ((pathData.x)*transform.k) + transform.x,
			    y: ((pathData.y)*transform.k) + transform.y});
	 } else {
	     for (let linePoint of pathData.lineData) {
		 lineData.push({x: ((linePoint.x+pathData.x)*transform.k) + transform.x,
				y: ((linePoint.y+pathData.y)*transform.k) + transform.y});
	     }
	 }
	 lineData.push({x: cx, y: cy});
	 path.attr("d", function() {
	     return line(lineData);
	 });
     });

     // modality for drag+zoom
     d3.select("body")
       .on("keydown", function() {
	   if (typeof(d3.event) === "undefined") {
	       return;
	   }
	   // trap the ctrl key being pressed
	   if (d3.event.ctrlKey) {
	       self.disableDrag();
	       self.disableZoom();
	       self.disableForce();
	       self.enableZoom();
	   }
       })
       .on("keyup", function() {
	   self.disableZoom();
	   switch(self.status) {
	       case"DRAG":
		   if (d3.event.keyCode === 17) { // "Control"
		       self.enableDrag();
		   }
		   break;
	       case "FORCE":
		   if (d3.event.keyCode === 17) { // "Control"
		       self.enableForce();
		   }
		   break;
	   }
       });

     disableAll() {
	 self.disableDrag();
	 self.disableZoom();
	 self.disableForce();
	 self.disableConnect();
	 self.disableAdd();
     }

     deselectAll() {
	 d3.selectAll(selected).selectAll("rect.selection-rect").remove();
	 d3.selectAll(selected).selectAll("g.resize").remove();
	 selected = [];
     }
     
     enableDrag() {
	 self.disableDrag();
	 d3.select(self.root).selectAll("label:not(#selectLabel)").classed("active", false);
	 $("#select").click();
	 self.status = "DRAG";
	 let drag = d3.drag()
		      .on("drag.start", function(d) {
			  if (selected.indexOf(this) === -1) {
			      self.deselectAll();
			  }
			  if (selected.length === 0) {
			      selected.push(this);
			      self.parent.hover(this);
			      updateSelected();
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
			  opts.model.updateActiveDiagram(d, d.lineData);
			  self.parent.forceTick(d3.selectAll(selected)); // TODO: remove this for flux
		      })
		      .on("drag.end", function(d) {
			  opts.model.updateActiveDiagram(d, d.lineData);
			  quadtree.addAll(selected); // update quadtree
		      });
	 d3.select("svg").selectAll("svg > g.diagram > g:not(.edges) > g").call(drag);
	 d3.select("svg").select("g.brush").call(d3.brush().on("start", self.deselectAll).on("end", selectInsideBrush));

	 function selectInsideBrush() {
	     // hide the brush
	     d3.select("svg").select("g.brush").selectAll("*:not(.overlay)").style("display", "none");
	     // test quadtree
	     let extent = d3.event.selection;
	     if (extent === null) {
		 return;
	     }
	     self.deselectAll();
	     let transform = d3.zoomTransform(d3.select("svg").node());
	     let tx = transform.x;
	     let ty = transform.y;
	     let tZoom = transform.k;	     
	     search(quadtree, (extent[0][0] - tx)/tZoom, (extent[0][1] - ty)/tZoom, (extent[1][0] - tx)/tZoom, (extent[1][1] - ty)/tZoom);
	     for (let el of selected) {
		     self.parent.hover(el);
	     }
	     updateSelected();
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

	 function updateSelected() {
	     let res = d3.selectAll(selected).selectAll("g.resize").data(function(d) {
		 return d.lineData.map(el => [d, el]);
	     }).enter().append("g").attr("class", "resize");
	     res.append("rect")
		.attr("x", function(d) {
		    return d[1].x - 2;
		})
		.attr("y", function(d) {
		    return d[1].y - 2;
		})
		.attr("width", 4)
		.attr("height", 4)
		.attr("stroke", "black")
		.attr("stroke-width", 2);
	     res.call(resizeDrag);
	 };
	 let resizeDrag = d3.drag().on("drag", function(d) {
	     let p = d[0].lineData.filter(el => el.seq === d[1].seq)[0];
	     p.x = d3.event.x;
	     p.y = d3.event.y;
	     opts.model.updateActiveDiagram(d[0], d[0].lineData);
	 });
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
			  .on("tick", updateModel)
			  .force("charge", d3.forceCollide(5));
	 d3.select(self.root).selectAll("label:not(#forceLabel)").classed("active", false);
	 $("#force").click();
	 self.status = "FORCE";
	 self.d3force.restart();

	 let elements = d3.select("svg").selectAll("svg > g.diagram > g:not(.edges) > g");
	 function updateModel() {
	     elements.each(function(d) {
		 opts.model.updateActiveDiagram(d, d.lineData);
	     });
	     self.parent.forceTick(); // TODO: remove this for flux
	 }
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
	 self.parent.trigger("transform");
     }

     enableConnect() {
	 // handle escape key
	 d3.select("body").on("keyup.connect", function() {
	     if (d3.event.keyCode === 27) { // "Escape"
		 self.disableAdd();
		 self.enableConnect();
	     }
	 });
	 d3.select(self.root).selectAll("label:not(#connectLabel)").classed("active", false);
         $("#connect").click();
	 self.status = "CONNECT";

	 d3.select("svg").selectAll("svg > g.diagram > g:not(.edges) > g > g.Terminal")
	   .on("click", function (d) {
	       let line = d3.line()
		            .x(function(d) { return d.x; })
		            .y(function(d) { return d.y; });
	       
	       let svg = d3.select("svg");
	       let path = d3.select("svg > path");
	       let circle = d3.select("svg > circle");
	       let termToChange = path.datum();
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
		   path.datum(null);
		   return;
	       }

	       svg.on("mousemove", mousemoved);
	       path.data([d]);
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
	       let termToChange = d3.select("svg > path").datum();
	       if (typeof(termToChange) !== "undefined") {
		   d3.select("svg").on("mousemove", null);
		   // update the model
		   let schemaLinks = opts.model.getSchemaLinks(termToChange.localName);
		   let schemaLink = schemaLinks.filter(el => el.attributes[0].value === "#Terminal.ConnectivityNode")[0];
		   let schemaLinkName = "cim:" + schemaLink.attributes[0].value.substring(1);
		   opts.model.setLink(termToChange, schemaLinkName, d);
		   d3.select("svg > path").datum(null);
	       }
	   });
     }

     disableConnect() {
	 d3.select("body").on("keyup.connect", null);
	 d3.select("svg").selectAll("svg > g.diagram > g:not(.edges) > g > g.Terminal")
	   .on("click", null);
	 d3.select("svg").selectAll("svg > g.diagram > g.ConnectivityNodes > g.ConnectivityNode")
	   .on("click", null);
	 d3.select("svg").on("mousemove", null);
	 d3.select("svg > path").attr("d", null);
	 d3.select("svg > circle").attr("transform", "translate(0, 0)");
	 let datum = d3.select("svg > path").datum();
	 if (typeof(datum) !== "undefined") {
	     if (datum.nodeName === "cim:Terminal") {
		 d3.select("svg > path").datum(null);
	     }
	 }
     }

     // draw single-segment objects
     enableAdd(e) {
	 let type = e.target.parentNode.id;
	 let text = e.target.textContent;
	 self.disableAll();
	 d3.select(self.root).selectAll("label").classed("active", false);
	 $("input").prop('checked', false);
	 $("#addElement").text(text);
	 self.status = "ADD" + type;
	 d3.select("svg").on("click.add", clicked);
	 function clicked() {
	     let newObject = opts.model.createObject(type);
	     self.parent.addToDiagram(newObject);
	  }
     }

     // draw multi-segment objects
     enableAddMulti(e) {
	 // handle escape key
	 d3.select("body").on("keyup.addMulti", function() {
	     if (d3.event.keyCode === 27) { // "Escape"
		 self.disableAdd();
		 self.enableAddMulti(e);
	     }
	 });
	 let type = e.target.parentNode.id;
	 let text = e.target.textContent;
	 self.disableAll();
	 d3.select(self.root).selectAll("label").classed("active", false);
	 $("input").prop('checked', false);
	 $("#addElement").text(text);
	 self.status = "ADD" + type;
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
		 path.data([newObject]);
		 path.attr("d", function() {
		     let lineData = [];
		     for (let linePoint of newObject.lineData) {
			 lineData.push({x: ((linePoint.x+newObject.x)*transform.k) + transform.x,
					y: ((linePoint.y+newObject.y)*transform.k) + transform.y});
		     }
		     lineData.push({x: m[0], y: m[1]});
		     return line(lineData);
		 });
		 // highlight when aligned
		 let last = newObject.lineData[newObject.lineData.length - 1];
		 let newx = Math.round((m[0] - transform.x) / transform.k) - newObject.x;
		 let newy = Math.round((m[1] - transform.y) / transform.k) - newObject.y;
		 let hG = d3.select("svg").select("g.diagram-highlight");
		 if (newx === last.x) {
		     let height = parseInt(d3.select("svg").style("height"));
		     hG.append("svg:line")
			  .attr("class", "highlight")
			  .attr("x1", m[0]) 
			  .attr("y1", 0)
			  .attr("x2", m[0]) 
			  .attr("y2", height)
			  .style("stroke", "red")
			  .style("stroke-width", 1);
		     
		 } else {
		     if (newy === last.y) {
			 let width = parseInt(d3.select("svg").style("width"));
			 hG.append("svg:line")
			      .attr("class", "highlight")
			      .attr("x1", 0)
			      .attr("y1", m[1])
			      .attr("x2", width)
			      .attr("y2", m[1])
			      .style("stroke", "red")
			      .style("stroke-width", 1);
		     } else {
			 hG.selectAll(".highlight").remove();
		     }
		 }

	     }
	     
	     if (self.status === "ADD" + type) {
		 d3.select("svg").on("contextmenu.add", finish);
		 svg.on("mousemove", mousemoved);
		 newObject = opts.model.createObject(type);
		 let m = d3.mouse(d3.select("svg").node());
		 let transform = d3.zoomTransform(d3.select("svg").node());
		 let xoffset = transform.x;
		 let yoffset = transform.y;
		 let svgZoom = transform.k;
		 newObject.x = Math.round((m[0] - xoffset) / svgZoom);
		 newObject.px = newObject.x;
		 newObject.y = Math.round((m[1] - yoffset) / svgZoom);
		 newObject.py = newObject.y;
		 newObject.lineData = [{x: 0, y: 0, seq: 1}];
		 self.status = "ADDdrawing"
	     } else {
		 addNewPoint(newObject);
	     }
	 };
	 
	 function finish() {
	     d3.event.preventDefault();
	     addNewPoint(newObject);
	     opts.model.addToActiveDiagram(newObject, newObject.lineData);
	     self.status = "ADD" + type;
	     d3.select("svg").on("mousemove", null);
	     d3.select("svg").selectAll("svg > path").attr("d", null);
	     d3.select("svg").selectAll("svg > circle").attr("transform", "translate(0, 0)");
	     d3.select("svg > path").datum(null);
	     // disable ourselves
	     d3.select("svg").on("contextmenu.add", null);
	 };

	 function addNewPoint(newObject) {
	     let m = d3.mouse(d3.select("svg").node());
	     let transform = d3.zoomTransform(d3.select("svg").node());
	     let xoffset = transform.x;
	     let yoffset = transform.y;
	     let svgZoom = transform.k;
	     let newx = Math.round((m[0] - xoffset) / svgZoom) - newObject.x;
	     let newy = Math.round((m[1] - yoffset) / svgZoom) - newObject.y;
	     let newSeq = newObject.lineData.length + 1;		 
	     newObject.lineData.push({x: newx, y: newy, seq: newSeq});
	     // remove highlight
	     let hG = d3.select("svg").select("g.diagram-highlight");
	     hG.selectAll(".highlight").remove();
	 };
     }

     disableAdd() {
	 $("#addElement").text("Insert element");
	 d3.select("body").on("keyup.addMulti", null);
	 d3.select("svg").on("click.add", null);
	 d3.select("svg").on("contextmenu.add", null);
	 d3.select("svg").on("mousemove", null);
	 d3.select("svg > path").attr("d", null);
	 d3.select("svg > circle").attr("transform", "translate(0, 0)");
	 // delete from model
	 let datum = d3.select("svg > path").datum();
	 if (typeof(datum) !== "undefined") {
	     opts.model.deleteObject(datum);
	 }
	 d3.select("svg > path").datum(null);
     }

    </script>

</cimDiagramControls>

