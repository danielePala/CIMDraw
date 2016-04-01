<cimDiagramControls>
    <div class="container-fluid">
	<div class="row center-block">
	    <div class="col-md-12">		
		<div class="btn-group" data-toggle="buttons" id="cim-diagram-controls">
		    <label class="btn btn-default active" id="selectLabel">
			<input type="radio" id="select" name="tool" value="select" autocomplete="off" checked>select</input>
		    </label>
		    <label class="btn btn-default">
			<input type="radio" id="force" name="tool" value="force" autocomplete="off">force (auto-layout)</input>
		    </label>
		    <label class="btn btn-default">
			<input type="radio" id="pan" name="tool" value="pan" autocomplete="off">pan+zoom</input>
		    </label>
		    <label class="btn btn-default">
			<input type="radio" id="connect" name="tool" value="connect" autocomplete="off">edit connections</input>
		    </label>
		</div>
	    </div>
	</div>
    </div>
    
    <script>
     "use strict";
     let self = this;
     let zoomComp = d3.behavior.zoom();
     let zoomEnabled = false;
     let force = d3.layout.force().charge(-900)
	           .gravity(0.9)
	           .size([1200,800])
	           .linkDistance(20);
     let edgeToChange = undefined;

     self.on("mount", function() {
	 // setup diagram buttons
	 $("#select").change(function() {
	     self.disableForce();
	     self.disableZoom();
	     self.disableConnect();
	     self.enableDrag();
	 });
	 
	 $("#force").change(function() {
	     self.disableZoom();
	     self.disableDrag();
	     self.disableConnect();
	     self.enableForce();
	 });

	 $("#pan").change(function() {
	     self.disableForce();
	     self.disableDrag();
	     self.disableConnect();
	     self.enableZoom();
	 });

	 $("#connect").change(function() {
	     self.disableForce();
	     self.disableDrag();
	     self.disableZoom();
	     self.enableConnect();
	 });
     });

     // listen to 'transform' event
     self.parent.on("transform", function() {
	 let transform = d3.transform(d3.select("svg").select("g").attr("transform"));
	 if (typeof(zoomComp) !== "undefined") {
	     zoomComp.translate([transform.translate[0], transform.translate[1]]);
	     zoomComp.scale(transform.scale[0]);
	 }
     });

     // listen to 'render' event
     self.parent.on("render", function() {
	 force = force.nodes(self.parent.nodes).links(self.parent.edges)
	    .on("tick", self.parent.forceTick);
	 self.disableForce();
	 self.disableZoom();
	 self.disableConnect();
	 self.enableDrag();
     });
     
     enableDrag() {
	 $("#select").click();
	 this.status = "DRAG";
	 let drag = d3.behavior.drag()
		      .origin(function(d) {
			  return d;
		      })
		      .on("drag", function(d,i) {
			  d.x = d3.event.x;
			  d.px = d.x;
			  d.y = d3.event.y;
			  d.py = d.y;

			  let elem = d3.select(this);
			  if (elem.datum().nodeName === "cim:ConnectivityNode") {
			      
			  } else {

			  }
			  
			  self.parent.forceTick();
		      })
		      .on("dragend", function(d) {
			  // save new position.
			  let ioEdges = opts.model.getDiagramObjectGraph([d]); 
			  let dobjs = ioEdges.map(el => el.target);
			  if (d.nodeName === "cim:ConnectivityNode" && dobjs.length === 0) {
			      let equipments = opts.model.getEquipments(d);
			      let busbarSection = equipments.filter(el => el.localName === "BusbarSection")[0];
			      if (typeof(busbarSection) !== "undefined") {
				  dobjs = opts.model.getDiagramObjectGraph([busbarSection]).map(el => el.target);
				  console.log(dobjs);
			      }
			  }			  
			  let doEdges = opts.model.getDiagramObjectPointGraph(dobjs); 
			  let points = doEdges.map(el => el.target);
			  if (points.length > 0) {
			      for (let point of points) {
				  let seq = 1;
				  let seqObject = opts.model.getAttribute(point, "cim:DiagramObjectPoint.sequenceNumber");
				  if (typeof(seqObject) !== "undefined") {
				      seq = parseInt(seqObject.innerHTML);
				  }
				  let actLineData = d.lineData.filter(el => el.seq === seq)[0];
				  opts.model.getAttribute(point, "cim:DiagramObjectPoint.xPosition").innerHTML = actLineData.x + d.x;
				  opts.model.getAttribute(point, "cim:DiagramObjectPoint.yPosition").innerHTML = actLineData.y + d.y;
			      }
			  }
		      });
	 d3.select("svg").selectAll("svg > g > g > g").call(drag);
     }

     disableDrag() {
	 let drag = d3.behavior.drag()
		      .on("drag", null);
	 d3.select("svg").selectAll("svg > g > g > g").call(drag);
     }

     enableForce() {
	 $("#force").click();
	 this.status = "FORCE";
	 d3.select("svg").selectAll("svg > g > g > g").call(force.drag()).on("click", fixNode);
	 
	 function fixNode(d) {
	     d.fixed = true;
	 };
	 force.start();
     }

     disableForce() {
	 force.stop();    
     }
     
     enableZoom() {
	 $("#zoom").click();
	 this.status = "ZOOM";
	 d3.select("svg").selectAll("svg > g > g > g")
	   .on("click", function (d) {
	       let hashComponents = window.location.hash.substring(1).split("/");
	       let basePath = hashComponents[0] + "/" + hashComponents[1];
	       if (window.location.hash.substring(1) !== basePath + "/" + d.attributes[0].value) {
		       riot.route(basePath + "/" + d.attributes[0].value);
	       }
	   });
	 if (typeof(zoomComp) === "undefined") {
	     zoomComp = d3.behavior.zoom();
	 }
	 let transform = d3.transform(d3.select("svg").select("g").attr("transform"));
	 zoomComp.on("zoom", this.zooming);
	 d3.select("svg").call(zoomComp);
	 zoomComp.translate([transform.translate[0], transform.translate[1]]);
	 zoomComp.scale(transform.scale[0]);
	 zoomEnabled = true;
     }

     disableZoom() {
	 if (zoomEnabled===true) {
	     d3.select("svg").selectAll("svg > g > g > g").on("click", null);
	     zoomComp.on("zoom", null);
	     d3.select("svg").select("g").call(zoomComp);
	     zoomEnabled = false;
	 }
     }

     zooming() {
	 let newx = zoomComp.translate()[0];
	 let newy = zoomComp.translate()[1];
	 let newZoom = zoomComp.scale();
	 let svgWidth = parseInt(d3.select("svg").style("width"));
	 let svgHeight = parseInt(d3.select("svg").style("height"));
	 d3.select("svg").select("g").attr("transform", "translate(" + [newx, newy] + ")scale(" + newZoom + ")");
	 this.parent.trigger("transform");
     }

     enableConnect() {
         $("#connect").click();
	 this.status = "CONNECT";

	 d3.select("svg").selectAll("svg > g > g > g > g.Terminal")
	   .on("click", function (d) {
	       let svg = d3.select("svg");
	       var line = svg.append("line");

	       var circle = svg.append("circle")
			       .attr("cx", -10)
			       .attr("cy", -10)
			       .attr("r", 3.5);
	       svg.on("mousemove", mousemoved);
	       
	       edgeToChange = self.parent.edges.filter(el => el.target === d)[0];
	   });
	 d3.select("svg").selectAll("svg > g > g > g.ConnectivityNode")
	   .on("click", function (d) {
	       if (typeof(edgeToChange) !== "undefined") {
		   d3.select("svg").on("mousemove", null);
		   edgeToChange.p = [edgeToChange.p[0] + d3.select(edgeToChange.source).datum().x, edgeToChange.p[1] + d3.select(edgeToChange.source).datum().y];
		   edgeToChange.source = d3.select(this).node();
		   edgeToChange.p = [edgeToChange.p[0] - d3.select(edgeToChange.source).datum().x, edgeToChange.p[1] - d3.select(edgeToChange.source).datum().y];
		   // update the model
		   let schemaLinks = opts.model.getSchemaLinks(edgeToChange.target.localName);
		   let schemaLink = schemaLinks.filter(el => el.attributes[0].value === "#Terminal.ConnectivityNode")[0];
		   opts.model.setLink(edgeToChange.target, schemaLink, d);
		   edgeToChange = undefined;
	       }
	   });
	  function mousemoved() {
	      let m = d3.mouse(this);
	      let transform = d3.transform(d3.select("svg").select("g").attr("transform"));
	      m[0] = (m[0]-transform.translate[0])/transform.scale[0];
	      m[1] = (m[1]-transform.translate[1])/transform.scale[0];
	      edgeToChange.p = [m[0]-d3.select(edgeToChange.source).datum().x, m[1]-d3.select(edgeToChange.source).datum().y];
	      self.parent.forceTick();
	  }
     }

     disableConnect() {
	 d3.select("svg").selectAll("svg > g > g > g > g.Terminal")
	   .on("click", null);
	 d3.select("svg").selectAll("svg > g > g > g.ConnectivityNode")
	   .on("click", null);
     }

    </script>

</cimDiagramControls>

