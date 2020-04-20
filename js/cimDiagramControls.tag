/*
 This tag renders the controls for a given CIM diagram.

 Copyright 2017-2020 Daniele Pala <pala.daniele@gmail.com>

 This file is part of CIMDraw.

 CIMDraw is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 CIMDraw is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with CIMDraw. If not, see <http://www.gnu.org/licenses/>.
*/

<cimDiagramControls>
    <div class="container-fluid">
        <div class="row justify-content-center">
            <div class="col-md-auto">
                <div class="btn-toolbar" role="toolbar">
                    <div class="btn-group btn-group-toggle invisible" data-toggle="buttons" id="cim-diagram-controls">
                        <label class="btn btn-secondary active" id="selectLabel">
                            <input type="radio" id="select" name="tool" value="select" autocomplete="off" checked="checked">select
                        </label>
                        <label class="btn btn-secondary" id="panLabel">
                            <input type="radio" id="pan" name="tool" value="pan" autocomplete="off">pan
                        </label>
                        <label class="btn btn-secondary" id="connectLabel">
                            <input type="radio" id="connect" name="tool" value="connect" autocomplete="off">edit connections
                        </label>

                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-secondary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                <span id="addElement">Insert element</span>
                                <span class="caret"></span>
                            </button>
                            <div class="dropdown-menu" id="cimElementList">
                                <h6 class="dropdown-header">Busses</h6>
                                <a class="dropdown-item" id="BusbarSection" onclick={enableAddMulti}>Node</a>
                                <h6 class="dropdown-header">Branches</h6>
                                <a class="dropdown-item" id="ACLineSegment" onclick={enableAddMulti}>AC Line Segment</a>
                                <h6 class="dropdown-header">Switches</h6>
                                <a class="dropdown-item" id="Breaker" onclick={enableAdd}>Breaker</a>
                                <a class="dropdown-item" id="Disconnector" onclick={enableAdd}>Disconnector</a>
                                <a class="dropdown-item" id="LoadBreakSwitch" onclick={enableAdd}>Load Break Switch</a>
                                <!-- junctions are still not implemented properly for now
                                     <!--<li class="dropdown-header">Connectors</li>-->
                                <!--<li id="cim:Junction" onclick={enableAdd}><a>Junction</a></li>-->
                                <h6 class="dropdown-header">Equivalents</h6>
                                <a class="dropdown-item" id="EnergySource" onclick={enableAdd}>Energy Source</a>
                                <h6 class="dropdown-header">Rotating Machines</h6>
                                <a class="dropdown-item" id="SynchronousMachine" onclick={enableAdd}>Synchronous Machine</a>
                                <a class="dropdown-item" id="AsynchronousMachine" onclick={enableAdd}>Asynchronous Machine</a>
                                <h6 class="dropdown-header">Loads</h6>
                                <a class="dropdown-item" id="EnergyConsumer" onclick={enableAdd}>Energy Consumer</a>
                                <a class="dropdown-item" id="ConformLoad" onclick={enableAdd}>Conform Load</a>
                                <a class="dropdown-item" id="NonConformLoad" onclick={enableAdd}>Non Conform Load</a>
                                <h6 class="dropdown-header">Compensators</h6>
                                <a class="dropdown-item" id="LinearShuntCompensator" onclick={enableAdd}>Linear</a>
                                <a class="dropdown-item" id="NonlinearShuntCompensator" onclick={enableAdd}>Nonlinear</a>
                                <h6 class="dropdown-header">Transformers</h6>
                                <a class="dropdown-item" id="PowerTransformer" onclick={enableAdd}>Two-winding Transformer</a>
                                <a class="dropdown-item" id="PowerTransformer" onclick={enableAdd}>Three-winding Transformer</a>
                            </div>
                        </div>
                    </div>
                    <div class="btn-group-toggle" data-toggle="buttons">
                        <label class="btn btn-secondary active" id="legendLabel">
                            <input type="checkbox" id="legendToggle" checked> Show legend
                        </label>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
     "use strict";
     let self = this;
     let NODE_CLASS = "ConnectivityNode";
     let NODE_TERM = "ConnectivityNode.Terminals";
     let TERM_NODE = "Terminal.ConnectivityNode";
     let quadtree = d3.quadtree();
     let selected = [];
     let copied = [];
     let xhighlight = false;
     let yhighlight = false;
     // context menu for single-point objects
     let menu = [
         {
             title: "Copy",
             action: function(d, i) {
                 let elm = this;
                 if (opts.model.schema.isA("TransformerEnd", d3.select(elm).datum()) === true) {
                     elm = elm.parentElement;
                 }
                 if (selected.indexOf(elm) === -1) {
                     selected.push(elm);
                     self.updateSelected();
                 }
                 // handle busbars
                 let copiedWithCN = d3.selectAll(selected).data();
                 for (let cimObj of copiedWithCN) {
                     if (cimObj.nodeName === "cim:ConnectivityNode") {
                         let busbar = opts.model.getBusbar(cimObj);
                         if (busbar !== null) {
                             busbar.x = cimObj.x;
                             busbar.y = cimObj.y;
                             copied.push(busbar);
                         }
                     } else {
                         copied.push(cimObj);
                     }
                 }
             }
         },
         {
             title: "Rotate",
             action: function(d, i) {
                 let elm = this;
                 if (opts.model.schema.isA("TransformerEnd", d3.select(elm).datum()) === true) {
                     elm = elm.parentElement;
                 }
                 if (selected.indexOf(elm) === -1) {
                     self.deselectAll();
                     selected.push(elm);
                     self.updateSelected();
                 }
                 $(selected).filter('[data-toggle="popover"]').popover("hide");
                 let selection = d3.selectAll(selected);
                 let terminals = opts.model.getTerminals(selection.data());
                 terminals.forEach(function (terminal) {
                     terminal.rotation = (terminal.rotation + 90) % 360;
                 });
                 for (let datum of selection.data()) {
                     datum.rotation = (datum.rotation + 90) % 360;
                     opts.model.updateActiveDiagram(datum, datum.lineData);
                 }
                 
             }
         },
         {
             title: "Delete",
             action: function(d, i) {
                 let elm = this;
                 if (opts.model.schema.isA("TransformerEnd", d3.select(elm).datum()) === true) {
                     elm = elm.parentElement;
                 }
                 self.deleteObject(elm)
             }
         },
         {
             title: "Delete from current diagram",
             action: function(d, i) {
                 let elm = this;
                 if (opts.model.schema.isA("TransformerEnd", d3.select(elm).datum()) === true) {
                     elm = elm.parentElement;
                 }
                 self.deleteFromDiagram(elm);
             }
         },
         {
             title: "Show element info",
             action: function(d, i) {
                 let elm = this;
                 if (opts.model.schema.isA("TransformerEnd", d3.select(elm).datum()) === true) {
                     elm = elm.parentElement;
                 }
                 if (selected.indexOf(elm) === -1) {
                     self.deselectAll();
                     selected.push(elm);
                     self.updateSelected();
                 }
                 $(selected).filter('[data-toggle="popover"]').popover("show");
             }
         },
         {
             title: "Add new operational limit set",
             action: function(d, i) {
                 self.addNewLimitSet(this, d, i);
             }
         }   
     ];
     // context menu for multi-segment objects
     let multiMenu = menu.concat(
         [{
             title: "Add points",
             action: function(d, i) {
                 let oldStatus = self.status;
                 let elm = this;
                 self.disableAll();
                 self.deselectAll();
                 selected.push(elm);
                 // disable general context menu
                 d3.select("svg").on("contextmenu.general", null);
                 self.addDrawing(d, function() {
                     let svg = d3.select("svg");
                     let path = svg.selectAll("svg > path");
                     let circle = svg.selectAll("svg > circle");
                     d3.event.preventDefault();
                     self.addNewPoint(d);
                     self.deleteFromDiagram(elm);
                     opts.model.addToActiveDiagram(d, d.lineData);
                     svg.on("mousemove", null);
                     path.attr("d", null);
                     circle.attr("transform", "translate(0, 0)");
                     d3.select("svg > path").datum(null);
                     // disable ourselves
                     svg.on("contextmenu.add", null);
                     svg.on("click.add", null);
                     // enable old status
                     switch (oldStatus) {
                         case "DRAG": {
                             self.enableDrag();
                             break;
                         }
                         case "ZOOM": {
                             self.enableZoom();
                             break;
                         }
                         case "CONNECT": {
                             self.enableConnect();
                             break;
                         }
                         default: {
                             let type = oldStatus.substring("ADD".length);
                             if (type.startsWith("Multi")) {
                                 type = type.substring("Multi".length);
                                 self.enableAddMulti(type);
                             } else {
                                 self.enableAdd(type);
                             }
                             break;
                         } 
                     }
                     // enable general context menu
                     d3.select("svg").on("contextmenu.general", d3.contextMenu(diagramMenu));
                 });
                 d3.select("svg").on("click.add", clicked);
                 function clicked() {
                     self.addNewPoint(d);
                 };
             }
         }]);
     // context menu for a point of a multi-segment object
     let resizeMenu = [
         {
             title: "Delete point",
             action: function(d, i) {
                 // applies to only one element
                 let target = d3.selectAll(selected).data().filter(el => el === d[0])[0];
                 selected = selected.filter(el => d3.select(el).datum() !== d[0]);
                 self.deselectAll();
                 selected.push(target);
                 self.updateSelected();

                 self.deleteFromDiagram(this.parentNode);
                 d[0].lineData = d[0].lineData.filter(el => el.seq !== d[1]);
                 for (let p of d[0].lineData) {
                     if (p.seq > d[1]) {
                         p.seq = p.seq - 1;
                     }
                 }
                 opts.model.addToActiveDiagram(d[0], d[0].lineData);
             }
         }
     ];
     // context menu for terminals
     let terminalsMenu = [
         {
             title: "Add new operational limit set",
             action: function(d, i) {
                 self.addNewLimitSet(this, d, i);
             }
         },
         {
             title: "Add regulating control",
             action: function(d, i) {
                 self.addRegulatingControl(this, d, i);
             }
         },
         {
             title: "Add tap changer control",
             action: function(d, i) {
                 self.addTCControl(this, d, i);
             }
         }
     ];
     // context menu for terminals of transformers 
     let trafoTermsMenu = terminalsMenu.concat(
         [{
             title: "Add ratio tap changer",
             action: function(d, i) {
                 self.addTC(this, d, i);
             }
         }]);
     // context menu for transformer ends 
     let trafoEndsMenu = menu.concat(
         [{
             title: "Add ratio tap changer",
             action: function(d, i) {
                 self.addTC(this, d, i);
             }
         }]);
     // context menu for connections between objects
     let edgesMenu = [
         {
             title: "Delete",
             action: function(d, i) {
                 let cn = self.getLinkedCNs([d.target])[0];
                 if (typeof(cn) !== "undefined") {
                     let cnUUID = opts.model.ID(cn);
                     let cnElem = d3.select("svg").selectAll("g#cimdiagram-"+cnUUID).node();
                     self.deleteObject(cnElem);
                 } else {
                     opts.model.removeLink(d.source, "cim:" + NODE_TERM, d.target);
                 }
             }
         }
     ];
     // context menu for the main diagram area
     let diagramMenu = [
         {
             title: "Paste",
             disabled: function(d, i) {
                 if (copied.length < 1) {
                     return true;
                 }
                 return false;
             },
             action: function(d, i) {
                 if (copied.length < 1) {
                     return;
                 }
                 let m = d3.mouse(d3.select("svg").node());
                 let transform = d3.zoomTransform(d3.select("svg").node());
                 let xoffset = transform.x;
                 let yoffset = transform.y;
                 let svgZoom = transform.k;
                 let deltax = m[0] - copied[0].x;
                 let deltay = m[1] - copied[0].y;
                 let lineData = null
                 for (let datum of copied) {
                     let newObject = opts.model.createObject(datum.nodeName);
                     for (let attribute of opts.model.getAttributes(datum)) {
                         let attrName = attribute.nodeName;
                         let attrVal = attribute.textContent;
                         opts.model.setAttribute(newObject, attrName, attrVal);
                     }
                     newObject.x = datum.x + deltax;
                     newObject.y = datum.y + deltay;
                     if (newObject.nodeName === "cim:BusbarSection") {
                         let cn = opts.model.getNode(datum);
                         if (cn === null) {
                             return;
                         }
                         lineData = cn.lineData;
                     } else {
                         lineData = datum.lineData;
                     }
                     opts.model.addToActiveDiagram(newObject, lineData);
                 }
                 copied = [];
             }
         }
     ];
     // move one point of the multi-segment. "lineData" coordinates
     // are relative to d.x and d.y, and the first point is always (0,0).
     // Therefore, we must handle the translation of the first point in a different way.
     let resizeDrag = d3.drag().on("drag", function(d) {
         // hide popovers
         $(selected).filter('[data-toggle="popover"]').popover("hide");
         let lineDatum = {x: d3.event.x, y: d3.event.y, seq: d[1]};
         let aligned = self.align(d[0], lineDatum, true);
         movePoint(d[0], d[1], aligned);
         opts.model.updateActiveDiagram(d[0], d[0].lineData);

         function movePoint(d, seq, delta) {
             let p = d.lineData.filter(el => el.seq === seq)[0];
             let ev = self.parent.rotate({x: delta.x, y: delta.y}, d.rotation * (-1));
             if (p.seq !== 1) {
                 p.x = delta.x;
                 p.y = delta.y;
             } else {
                 d.x = d.x + delta.x;
                 d.y = d.y + delta.y;
                 for (let point of d.lineData) {
                     if (point.seq === 1) {
                         continue;
                     }
                     point.x = point.x - ev.x;
                     point.y = point.y - ev.y;
                 }
             }
         };
     }).on("start", function(d) {
         self.removeFromQuadtree(); // update quadtree
     }).on("end", function(d) {
         self.highlight(null);
         opts.model.updateActiveDiagram(d[0], d[0].lineData);
         self.addToQuadtree(d3.selectAll(selected)); // update quadtree
     });

     // Initialization function (executed when the tag is mounted)
     self.on("mount", function() {
         // setup diagram buttons
         $("#select").change(function() {
             self.disableAll();
             self.enableDrag();
         });
         
         $("#pan").change(function() {
             self.disableAll();
             self.enableZoom();
         });

         $("#connect").change(function() {
             self.disableAll();
             self.enableConnect();
         });
         $("#legendToggle").change(function() {
             const t = d3.transition()
                       .duration(750)
                       .ease(d3.easeLinear);
             if (this.checked === false) {
                 d3.select("#legend").transition(t).attr("transform", d3.zoomIdentity.translate(1200, 50)); 
             } else {
                 d3.select("#legend").transition(t).attr("transform", d3.zoomIdentity.translate(1050, 50));
             }
         });

     });

     // listen to 'moveTo' event from parent
     self.parent.on("moveTo", function(element) {
         self.deselectAll();
         let cimObject = opts.model.getObject(element);
         let equipments = null;
         let terminals = null;
         let cn = null, cnUUID = null;
         let diagramElem = null;
         if (typeof(cimObject) === "undefined") {
             return;
         }
         switch (cimObject.nodeName) {
             case "cim:Substation":
             case "cim:Line":
                 equipments = opts.model.getTargets(
                     [cimObject],
                     "EquipmentContainer.Equipments");
                 for (let equipment of equipments) {
                     // handle busbars
                     if (equipment.nodeName === "cim:BusbarSection") {
                         cn = opts.model.getNode(equipment);
                         if (cn !== null) {
                             equipment = cn;
                         }
                     }
                     diagramElem = d3.select("svg").select("#cimdiagram-" + opts.model.ID(equipment)).node();
                     if (diagramElem !== null) {
                         selected.push(diagramElem);
                     }
                 }
                 break;
             case "cim:Analog":
             case "cim:Discrete":
                 terminals = opts.model.getTargets(
                     [cimObject],
                     "Measurement.Terminal");
                 for (let terminal of terminals) {
                     diagramElem = d3.select("svg").select("#cimdiagram-" + opts.model.ID(terminal)).node();
                     if (diagramElem !== null) {
                         selected.push(diagramElem);
                     }
                 }
                 break;
             case "cim:BusbarSection":
                 cn = opts.model.getNode(cimObject);
                 cnUUID = opts.model.ID(cn);
                 diagramElem = d3.select("svg").selectAll("g#cimdiagram-" + cnUUID).node();
                 selected = [diagramElem];
                 break;
             default:
                 diagramElem = d3.select("svg").selectAll("g#cimdiagram-"+element).node();
                 selected = [diagramElem];
         }
         self.updateSelected();
     });

     // listen to 'deselect' event from parent
     self.parent.on("deselect", function() {
         self.deselectAll();
     });
     
     // listen to 'render' event from parent
     self.parent.on("render", function() {
         // select mode
         let mode = opts.model.getMode();
         if (mode === "BUS_BRANCH") {
             NODE_CLASS = "TopologicalNode";
             NODE_TERM = "TopologicalNode.Terminal";
             TERM_NODE = "Terminal.TopologicalNode";
         } else {
             menu.push(
                 {
                     title: 'Add new measurement',
                     action: function(d, i) {
                         self.addNewMeasurement(this, d, i);
                     }
                 }
             );
             multiMenu.push(
                 {
                     title: 'Add new measurement',
                     action: function(d, i) {
                         self.addNewMeasurement(this, d, i);
                     }
                 }
             );
             terminalsMenu.push(
                 {
                     title: 'Add new measurement',
                     action: function(d, i) {
                         self.addNewMeasurement(this, d, i);
                     }
                 }
             );
         }
         // Setup quadtree. The elements are inserted with the following
         // structure: an object with two fields, one called 'elm' which
         // references the SVG node and one called 'seq' which identifies
         // the sequence number of the diagram object point. In fact for
         // each diagram object point of a given object we must insert
         // a dedicated node in the quadtree.
         let points = d3.select("svg").selectAll("svg > g.diagram > g:not(.edges) > g");
         quadtree.x(function(d) {
             let obj = d3.select(d.elm).datum();
             let lineDatum = obj.lineData.filter(el => el.seq === d.seq);
             return obj.x + lineDatum[0].x;
         }).y(function(d) {
             let obj = d3.select(d.elm).datum();
             let lineDatum = obj.lineData.filter(el => el.seq === d.seq);
             return obj.y + lineDatum[0].y;
         });
         self.addToQuadtree(points);
         // setup context menu
         let edges = d3.select("svg").selectAll("svg > g.diagram > g.edges > g");
         self.addContextMenu(points);
         d3.select("svg").on("contextmenu.general", d3.contextMenu(diagramMenu));
         edges.on("contextmenu", d3.contextMenu(edgesMenu));
         // enable drag by default
         self.disableZoom();
         self.disableConnect();
         self.enableDrag();
         $("#cim-diagram-controls").removeClass("invisible");
         // modality for drag+zoom
         let oldStatus = null;         
         d3.select("body")
           .on("keydown", function() {
               if (typeof(d3.event) === "undefined") {
                   return;
               }
               // trap the ctrl key being pressed
               if (d3.event.ctrlKey) {
                   if (oldStatus === null) {
                       oldStatus = self.status;
                   }
                   self.disableDrag();
                   self.disableZoom();
                   self.enableZoom();
               }
           })
           .on("keyup", function() {
               if (d3.event.keyCode === 17) { // "Control"
                   self.disableZoom();
                   switch(oldStatus) {
                       case "DRAG":
                           self.enableDrag();
                           break;
                       case "ZOOM":
                           self.enableZoom();
                           break;
                       default:
                           self.status = oldStatus;
                           break;
                   }
                   oldStatus = null;
               }
               // handle escape key
               if (d3.event.keyCode === 27) { // "Escape"
                   d3.contextMenu("close");
               }
           });
     });

     // listen to 'addToDiagram' event from parent 
     self.parent.on("addToDiagram", function(selection) {
         if (selection.size() === 1) {
             self.addToQuadtree(selection);
             if (self.status === "DRAG") {
                 self.disableAll();
                 self.enableDrag();
             }
             self.addContextMenu(selection);
         }
     });

     // listen to 'createEdges' event from parent
     self.parent.on("createEdges", function(edgesEnter) {
         edgesEnter.on("contextmenu", d3.contextMenu(edgesMenu));
     });

     disableAll() {
         self.disableDrag();
         self.disableZoom();
         self.disableConnect();
         self.disableAdd();
     }

     deselectAll() {
         d3.selectAll(selected).selectAll("rect.selection-rect").remove();
         d3.selectAll(selected).selectAll("g.resize").remove();
         d3.selectAll(selected).selectAll("circle.selection-circle").remove();
         selected = [];
     }

     /**
        Enable dragging of objects.
      */
     enableDrag() {
         let cnsToMove = [];
         self.disableDrag();
         d3.select(self.root).selectAll("#cim-diagram-controls > label:not(#selectLabel)").classed("active", false);
         self.status = "DRAG";
         let drag = d3
             .drag()
             .on("start", function(d) {
                 d3.contextMenu("close");
                 // reset the current path
                 let hashComponents = window.location.hash.substring(1).split("/");
                 let basePath = hashComponents[0] + "/" + hashComponents[1] + "/" + hashComponents[2];
                 route(basePath + "/");
                 if (selected.indexOf(this) === -1) {
                     self.deselectAll();
                 }
                 if (selected.length === 0) {
                     selected.push(this);
                     self.updateSelected();
                 }
                 self.removeFromQuadtree(); // update quadtree
                 // handle movement of cn, for the special case when
                 // the cn connects only two elements and it is a single
                 // point object (i.e. it is not a linear object like
                 // a busbar).
                 if (opts.model.schema.isA("ConductingEquipment", d) === true) {
                     let terminals = opts.model.getTerminals([d]);
                     cnsToMove = self.getLinkedCNs(terminals);
                 }
                 let terminals = opts.model.getTerminals(d3.selectAll(selected).data());
                 let links = d3.select("svg").selectAll("svg > g.diagram > g.edges > g").filter(function(d) {
                     return d3.selectAll(selected).data().indexOf(d.source) > -1 || terminals.indexOf(d.target) > -1;
                 });
                 links.select("path").attr("stroke", "green").attr("stroke-width", "3");
             })
             .on("drag", function(d) {
                 $(selected).filter('[data-toggle="popover"]').popover("hide");
                 let deltax = d3.event.x - d.x;
                 let deltay = d3.event.y - d.y;
                 let delta = {x: 0.0, y: 0.0};
                 for (let selNode of selected) {
                     let dd = d3.select(selNode).data()[0];
                     dd.x = dd.x + deltax;
                     dd.px = dd.x;
                     dd.y = dd.y + deltay;
                     dd.py = dd.y;
                     if (delta.x !== 0.0 || delta.y !== 0.0) {
                         continue;
                     }
                     for (let lineDatum of dd.lineData) {
                         let aligned = self.align(dd, lineDatum, false);
                         delta = {x: aligned.x - lineDatum.x, y: aligned.y - lineDatum.y};
                         if (delta.x !== 0.0 || delta.y !== 0.0) {
                             if (lineDatum.seq > 1) {
                                 delta = self.parent.rotate(delta, dd.rotation);
                             }
                             break;
                         }
                     }
                 }
                 for (let selNode of selected) {
                     let dd = d3.select(selNode).data()[0];
                     movePoint(dd, null, delta);
                     opts.model.updateActiveDiagram(dd, dd.lineData);
                 }

                 for (let c of cnsToMove) {
                     // handle rotation of terminals
                     let t1XY = {x: c.cnTerms[0].x, y: c.cnTerms[0].y};
                     let t2XY = {x: c.cnTerms[1].x, y: c.cnTerms[1].y};
                     if (c.cnTerms[0].rotation > 0) {
                         t1XY = self.parent.rotateTerm(c.cnTerms[0]);
                     }
                     if (c.cnTerms[1].rotation > 0) {
                         t2XY = self.parent.rotateTerm(c.cnTerms[1]);
                     }
                     // update position of cn
                     c.cn.x = (t1XY.x + t2XY.x)/2;
                     c.cn.y = (t1XY.y + t2XY.y)/2;
                     opts.model.updateActiveDiagram(c.cn, c.cn.lineData);
                 }

                 function movePoint(d, seq, delta) {
                     d.x = d.x + delta.x;
                     d.y = d.y + delta.y;
                     d.px = d.x;
                     d.py = d.y;
                 };
             })
             .on("end", function(d) {
                 self.addToQuadtree(d3.selectAll(selected)); // update quadtree
                 cnsToMove = [];
                 let terminals = opts.model.getTerminals(d3.selectAll(selected).data());
                 let links = d3.select("svg").selectAll("svg > g.diagram > g.edges > g").filter(function(d) {
                     return d3.selectAll(selected).data().indexOf(d.source) > -1 || terminals.indexOf(d.target) > -1;
                 });
                 links.select("path").attr("stroke", "black").attr("stroke-width", "1");
                 self.highlight("x", null);
                 self.highlight("y", null);
             });
         d3.select("svg").selectAll("svg > g.diagram > g:not(.edges) > g").call(drag);
         d3.select("svg").select("g.brush").call(
             d3.brush()
               .on("start", function() {
                   // reset the current path
                   let hashComponents = window.location.hash.substring(1).split("/");
                   let basePath = hashComponents[0] + "/" + hashComponents[1] + "/" + hashComponents[2];
                   route(basePath + "/");
                   self.deselectAll();
                   $('[data-toggle="popover"]').popover("hide");
                   d3.contextMenu("close");
               })
               .on("end", selectInsideBrush)
         );

         function selectInsideBrush() {
             // hide the brush
             d3.select("svg").select("g.brush").selectAll("*:not(.overlay)").style("display", "none");
             // update selection with quadtree
             let extent = d3.event.selection;
             if (extent === null) {
                 return;
             }
             self.deselectAll();
             let transform = d3.zoomTransform(d3.select("svg").node());
             let tx = transform.x;
             let ty = transform.y;
             let tZoom = transform.k;        
             selected = self.search(quadtree, (extent[0][0] - tx)/tZoom, (extent[0][1] - ty)/tZoom, (extent[1][0] - tx)/tZoom, (extent[1][1] - ty)/tZoom);
             self.updateSelected();
         };
     }

     // Find the nodes within the specified rectangle.
     search(quadtree, x0, y0, x3, y3) {
         let neighbours = new Set();
         quadtree.visit(function(node, x1, y1, x2, y2) {
             if (!node.length) {
                 do {
                     let d = node.data;
                     let datum = d3.select(d.elm).datum();
                     for (let lineDatum of datum.lineData) {
                         // the object can be rotated
                         let lineDatumR = self.parent.rotate(lineDatum, datum.rotation);
                         let dx = datum.x + lineDatumR.x;
                         let dy = datum.y + lineDatumR.y;
                         if((dx >= x0) && (dx < x3) && (dy >= y0) && (dy < y3)) {
                             neighbours.add(d.elm);
                             break;
                         }
                     }
                 } while (node = node.next);
             }
             return x1 >= x3 || y1 >= y3 || x2 < x0 || y2 < y0;
         });
         return [...neighbours];
     }

     addToQuadtree(selection) {
         let nodes = [];
         selection.each(function(el) {
             for (let lineDatum of el.lineData) {
                 nodes.push({elm: this, seq: lineDatum.seq});
             }
         });
         quadtree.addAll(nodes); // update the quadtree
     }
     
     removeFromQuadtree() {
         let nodes = quadtree.data().filter(el => selected.indexOf(el.elm) > -1);
         quadtree.removeAll(nodes); // update the quadtree
     }

     updateSelected() {
         d3.selectAll(selected)
           .each(function(d) {
               self.hover(this);
           })
           .selectAll("g.resize")
           .call(resizeDrag)
           .filter(function(d) {
               // if we have more than two points,
               // allow the delete operation
               return d[0].lineData.length > 2;
           })
           .on("contextmenu", d3.contextMenu(resizeMenu));
     }

     getLinkedCNs(terminals) {
         let linkedCNs = [];
         let cns = opts.model.getTargets(
             terminals,
             TERM_NODE);
         for (let cn of cns) {
             if (typeof(cn.lineData) === "undefined") {
                 continue;
             }
             if (cn.lineData.length > 1) {
                 continue;
             }
             let cnTerms = opts.model.getTargets(
                 [cn],
                 NODE_TERM);
             if (cnTerms.length === 2) {
                 let linkedCN = {cn: cn, cnTerms: cnTerms};
                 linkedCNs.push(linkedCN);
             }
         }
         return linkedCNs;
     }

     disableDrag() {
         d3.select("svg").selectAll("svg > g.diagram > g:not(.edges) > g").on(".drag", null);
         d3.select("svg").select("g.brush").on(".brush", null);
         if (self.status === "DRAG") {
             // delete any brush
             d3.select("svg").select("g.brush").call(d3.brush().move, null);
         }
     }
     
     enableZoom() {
         self.status = "ZOOM";
         $('[data-toggle="popover"]').popover("hide");
         d3.select("svg").selectAll("svg > g.diagram > g:not(.edges) > g")
           .on("click.zoom", function (d) {
               let hashComponents = window.location.hash.substring(1).split("/");
               let basePath = hashComponents[0] + "/" + hashComponents[1] + "/" + hashComponents[2];
               if (window.location.hash.substring(1) !== basePath + "/" + opts.model.ID(d)) {
                   route(basePath + "/" + opts.model.ID(d));
               }
           });
         let zoomComp = d3.zoom();
         zoomComp.on("zoom", this.zooming);
         // enable zooming on svg node
         d3.select("svg").call(zoomComp);
     }

     disableZoom() {
         d3.select("svg").selectAll("svg > g.diagram > g:not(.edges) > g").on("click.zoom", null);
         d3.select("svg").on(".zoom", null);
     }

     zooming() {
         d3.select("svg").select("g.diagram").attr("transform", d3.event.transform);
         self.parent.trigger("transform");
         // Update path data.
         // Needed if zooming while connecting objects or drawing multi-lines.
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
         let pathDatum = pathData.obj;
         if (typeof(pathDatum.lineData) === "undefined") {
             lineData.push({x: ((pathDatum.x)*transform.k) + transform.x,
                            y: ((pathDatum.y)*transform.k) + transform.y});
         } else {
             for (let linePoint of pathDatum.lineData) {
                 lineData.push({x: ((linePoint.x+pathDatum.x)*transform.k) + transform.x,
                                y: ((linePoint.y+pathDatum.y)*transform.k) + transform.y});
             }
         }
         lineData.push({x: cx, y: cy});
         path.attr("d", function() {
             return line(lineData);
         });
     }

     enableConnect() {
         self.deselectAll();
         // handle escape key
         d3.select("body").on("keyup.connect", function() {
             if (d3.event.keyCode === 27) { // "Escape"
                 self.disableConnect();
                 self.enableConnect();
             }
         });
         d3.select(self.root).selectAll("#cim-diagram-controls > label:not(#connectLabel)").classed("active", false);
         self.status = "CONNECT";

         d3.select("svg").selectAll("svg > g.diagram > g:not(.edges) > g > g.Terminal")
           .on("click", function (d) {
               let line = d3.line()
                            .x(function(d) { return d.x; })
                            .y(function(d) { return d.y; });
               // handle rotation of terminal
               let termXY = {x: d.x, y: d.y};
               if (d.rotation > 0) {
                   termXY = self.parent.rotateTerm(d);
               }

               let svg = d3.select("svg");
               let path = d3.select("svg > path");
               let circle = d3.select("svg > circle");
               let termToChange = path.datum();
               if (typeof(termToChange) !== "undefined") {
                   termToChange = termToChange.obj;
               }
               // Directly connect terminals: if 'termToChange' is defined than
               // we have now clicked on the 'target' terminal.
               if (typeof(termToChange) !== "undefined") {
                   let cn = opts.model.getTargets(
                       [d],
                       TERM_NODE)[0];
                   if (typeof(cn) === "undefined") {
                       cn = opts.model.getTargets(
                           [termToChange],
                           TERM_NODE)[0];
                   } else {
                       // we are connecting 'termToChange' with another CN: if
                       // it is already connected to a CN maybe that it should
                       // now be deleted.
                       let cnsToRemove = self.getLinkedCNs([termToChange]);
                       for (let cnToRemove of cnsToRemove) {
                           let cnUUID = opts.model.ID(cnToRemove.cn);
                           let cnElem = d3.select("svg > g.diagram > g." + NODE_CLASS + "s > g#cimdiagram-" + cnUUID).node();
                           self.deleteObject(cnElem);
                       }
                   }
                   d3.select("svg").selectAll("svg > path").attr("d", null);
                   d3.select("svg").selectAll("svg > circle").attr("transform", "translate(0, 0)");
                   if (typeof(cn) === "undefined") {
                       // handle rotation of the origin terminal
                       let term1XY = {x: termToChange.x, y: termToChange.y};
                       if (termToChange.rotation > 0) {
                           term1XY = self.parent.rotateTerm(termToChange);
                       }
                       cn = opts.model.createObject("cim:" + NODE_CLASS);
                       opts.model.setAttribute(cn, "cim:IdentifiedObject.name", "new1");
                       cn.x = (term1XY.x + termXY.x)/2;
                       cn.y = (term1XY.y + termXY.y)/2;
                       opts.model.addToActiveDiagram(cn, [{x: 0, y: 0, seq: 1}]);
                   }
                   d3.select("svg").on("mousemove", null);
                   // update the model
                   let schemaLinkName = "cim:" + TERM_NODE;
                   opts.model.setLink(termToChange, schemaLinkName, cn);
                   opts.model.setLink(d, schemaLinkName, cn);
                   path.datum(null);
               } else {
                   svg.on("mousemove", mousemoved);
                   path.datum({obj: d});
                   function mousemoved() {
                       let m = d3.mouse(this);
                       let transform = d3.zoomTransform(d3.select("svg").node());
                       circle.attr("transform", function () {
                           let mousex = m[0] + 10;
                           let mousey = m[1] + 10;
                           return "translate(" + mousex + "," + mousey +")";
                       });
                       path.attr("d", function() {
                           let newx = (termXY.x*transform.k) + transform.x;
                           let newy = (termXY.y*transform.k) + transform.y;
                           return line([{x: newx, y: newy}, {x: m[0], y: m[1]}]);
                       });
                   };
               }
           });
         d3.select("svg").selectAll("svg > g.diagram > g." + NODE_CLASS + "s > g." + NODE_CLASS)
           .on("click", function (d) {
               connect(d);
           });
         d3.select("svg").selectAll("svg > g.diagram > g.edges > g")
           .on("click", function (d) {
               connect(d.source);
           });
         
         function connect(cn) {
             d3.select("svg").selectAll("svg > path").attr("d", null);
             d3.select("svg").selectAll("svg > circle").attr("transform", "translate(0, 0)");
             let termToChange = d3.select("svg > path").datum();
             if (typeof(termToChange) !== "undefined") {
                 d3.select("svg").on("mousemove", null);
                 // update the model
                 opts.model.setLink(termToChange.obj, "cim:" + TERM_NODE, cn);
                 d3.select("svg > path").datum(null);
             }
         };
     }

     disableConnect() {
         d3.select("body").on("keyup.connect", null);
         d3.select("svg").selectAll("svg > g.diagram > g:not(.edges) > g > g.Terminal")
           .on("click", null);
         d3.select("svg").selectAll("svg > g.diagram > g." + NODE_CLASS + "s > g." + NODE_CLASS)
           .on("click", null);
         d3.select("svg").selectAll("svg > g.diagram > g.edges > g")
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
         let type = "";
         let text = "";
         if (typeof(e) === "object") {
             type = e.target.id;
             text = e.target.textContent;
         } else {
             type = e;
             text = d3.select("#" + type).text();
         }
         let options = undefined;
         if (text === "Three-winding Transformer") {
             options = {windNum: 3};
         }
         self.disableAll();
         d3.select(self.root).selectAll("#cim-diagram-controls > label").classed("active", false);
         // contexted jquesry selector
         $("input", this.root).prop('checked', false);
         $("#addElement").text(text);
         self.status = "ADD" + type;
         d3.select("svg").on("click.add", clicked);
         function clicked() {
             if (d3.event.ctrlKey === false) {
                 let newObject = opts.model.createObject("cim:" + type, options);
                 self.parent.addToDiagram(newObject);
             }
         }
     }

     // draw multi-segment objects
     enableAddMulti(e) {
         let type = "";
         let text = "";
         let svg = d3.select("svg");
         let path = svg.selectAll("svg > path");
         let circle = svg.selectAll("svg > circle");
         self.disableAll();
         d3.select("svg").on("contextmenu.general", null);
         // handle escape key
         d3.select("body").on("keyup.addMulti", function() {
             if (d3.event.keyCode === 27) { // "Escape"
                 self.disableAdd();
                 self.enableAddMulti(e);
             }
         });
         if (typeof(e) === "object") {
             type = e.target.id;
             text = e.target.textContent;
         } else {
             type = e;
             text = d3.select("#" + type).text();
         }
         d3.select(self.root).selectAll("#cim-diagram-controls > label").classed("active", false);
         // contexted jquesry selector
         $("input", this.root).prop('checked', false);
         $("#addElement").text(text);
         self.status = "ADDMulti" + type;
         d3.select("svg").on("click.add", clicked);
         let newObject = undefined;
         function clicked() {
             if (d3.event.ctrlKey === false) {
                 if (self.status === "ADDMulti" + type) {
                     newObject = opts.model.createObject("cim:" + type);
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
                     newObject.rotation = 0;
                     self.addDrawing(newObject, function() {
                         d3.event.preventDefault();
                         self.addNewPoint(newObject);
                         opts.model.addToActiveDiagram(newObject, newObject.lineData);
                         self.status = "ADDMulti" + type;
                         svg.on("mousemove", null);
                         path.attr("d", null);
                         circle.attr("transform", "translate(0, 0)");
                         d3.select("svg > path").datum(null);
                         // disable ourselves
                         svg.on("contextmenu.add", null);
                     });
                 } else {
                     self.addNewPoint(newObject);
                 }
             }
         };
     }

     addDrawing(newObject, finish) {
         self.status = "ADDdrawing";
         let svg = d3.select("svg");
         svg.on("contextmenu.add", finish);
         svg.on("mousemove", mousemoved);

         // Show a path corresponding to the mouse position,
         // so that the user can see where to put the new point.
         function mousemoved() {
             let m = d3.mouse(this);
             let transform = d3.zoomTransform(svg.node());
             // highlight when aligned
             let absx = ((m[0] - transform.x) / transform.k);
             let absy = ((m[1] - transform.y) / transform.k);
             let lineDatum = {
                 x: absx - newObject.x,
                 y: absy - newObject.y,
                 seq: null
             };
             let unrotated = self.parent.rotate(lineDatum, newObject.rotation * (-1));
             let aligned = self.align(newObject, unrotated, true);
             let rotated = self.parent.rotate(aligned, newObject.rotation);
             movePoint(newObject, null, rotated);
         };
         
         function movePoint(d, seq, delta) {
             let transform = d3.zoomTransform(svg.node());
             let path = svg.selectAll("svg > path");
             let circle = svg.selectAll("svg > circle");
             let line = d3.line()
                          .x(function(d) { return d.x; })
                          .y(function(d) { return d.y; });
             // Draw a circe in correspondence to the mouse position.
             circle.attr("transform", function () {
                 let mousex = ((d.x + delta.x)*transform.k) + transform.x + 10;
                 let mousey = ((d.y + delta.y)*transform.k) + transform.y + 10;
                 return "translate(" + mousex + "," + mousey +")";
             });
             // Update the path with the segment between the mouse position and
             // the last point.
             path.attr("d", function() {
                 let lineData = [];
                 for (let linePoint of d.lineData) {
                     let rotated = self.parent.rotate(linePoint, newObject.rotation);
                     lineData.push({x: ((rotated.x+d.x)*transform.k) + transform.x,
                                    y: ((rotated.y+d.y)*transform.k) + transform.y});
                 }
                 lineData.push({
                     x: ((d.x + delta.x)*transform.k) + transform.x,
                     y: ((d.y + delta.y)*transform.k) + transform.y
                 });
                 return line(lineData);
             });
             // Update the data associated to the path
             path.datum({obj: newObject, x: d.x + delta.x, y: d.y + delta.y});
         };
     }

     addNewPoint(newObject) {
         let svg = d3.select("svg");
         let path = svg.selectAll("svg > path");
         let point = path.datum();
         let newx = point.x - newObject.x;
         let newy = point.y - newObject.y;
         let newSeq = newObject.lineData.length + 1;
         let rot = self.parent.rotate({x: newx, y: newy}, newObject.rotation * (-1));
         newObject.lineData.push({x: rot.x, y: rot.y, seq: newSeq});
         // remove highlight
         self.highlight(null);
     }

     // Check alignment of a point of a given object d with its neighbours.
     // If withItself is true it also checks alignment with itself.
     // If lineDatum.seq is null it is assumed that the point is a new one.
     // Returns the aligned lineDatum coordinates.
     align(d, lineDatum, withItself) {
         let transform = d3.zoomTransform(d3.select("svg").node());
         let xaligned = false;
         let yaligned = false;
         // the object can be rotated
         let lineDatumR = self.parent.rotate(lineDatum, d.rotation);
         let absx = d.x + lineDatumR.x;
         let absy = d.y + lineDatumR.y;
         let movex = lineDatumR.x;
         let movey = lineDatumR.y;
         // search nearby points in a rectangle centered on the object
         let x1 = absx - (250/transform.k);
         let y1 = absy - (250/transform.k);
         let x2 = absx + (250/transform.k);
         let y2 = absy + (250/transform.k);
         let nearNodes = self.search(quadtree, x1, y1, x2, y2);
         let near = d3.selectAll(nearNodes).data();
         if (withItself === true) {
             near.push(d);
         }
         // check alignment with nearby points
         for (let datum of near) {
             ploop: for (let p of datum.lineData) {
                 if (datum === d && p.seq === lineDatum.seq) {
                     continue ploop;
                 }
                 // the object can be rotated
                 let pr = self.parent.rotate(p, datum.rotation);
                 let absxP = pr.x + datum.x;
                 let absyP = pr.y + datum.y;
                 let deltax = absx - absxP;
                 let deltay = absy - absyP;
                 if (Math.abs(deltax) < 5) {
                     absx = absxP;
                     movex = absx - d.x;
                     let rotx = ((absxP) * transform.k) + transform.x;
                     self.highlight("x", rotx);
                     xaligned = true;
                     xhighlight = true;
                 }
                 if (Math.abs(deltay) < 5) {
                     absy = absyP;
                     movey = absy - d.y;
                     let roty = ((absyP) * transform.k) + transform.y;
                     self.highlight("y", roty);
                     yaligned = true;
                     yhighlight = true;
                 }
             }
         }
         if (xaligned === false && xhighlight === true) {
             self.highlight("x", null);
             xhighlight = false;
         }
         if (yaligned === false && yhighlight === true) {
             self.highlight("y", null);
             yhighlight = false;
         }
         // we must return the un-rotated aligned coordinates, except if
         // this is the first point.
         let rotated = {x: movex, y: movey};
         let unrotated = self.parent.rotate(rotated, d.rotation * (-1));
         if (lineDatum.seq === 1) {
             return rotated;
         }
         return unrotated;
     }

     highlight(direction, val, rotation) {
         let hG = d3.select("svg").select("g.diagram-highlight");
         let x1 = null;
         let y1 = null;
         let x2 = null;
         let y2 = null;
         let height = parseInt(d3.select("svg").style("height"));
         let width = parseInt(d3.select("svg").style("width"));
         let size = Math.max(height, width) * 2;
         if (direction === "x") {
             x1 = val;
             y1 = size * (-1);
             x2 = val;
             y2 = size;
             hG.select("line.highlight-x")
               .attr("x1", x1)
               .attr("y1", y1)
               .attr("x2", x2)
               .attr("y2", y2);
         } else {
             if (direction === "y") {
                 x1 = size * (-1);
                 y1 = val;
                 x2 = size;
                 y2 = val;
                 hG.select("line.highlight-y")
                   .attr("x1", x1)
                   .attr("y1", y1)
                   .attr("x2", x2)
                   .attr("y2", y2);
             } else {
                 hG.select("line.highlight-x")
                   .attr("x1", x1)
                   .attr("y1", y1)
                   .attr("x2", x2)
                   .attr("y2", y2);
                 hG.select("line.highlight-y")
                   .attr("x1", x1)
                   .attr("y1", y1)
                   .attr("x2", x2)
                   .attr("y2", y2);
             }
         }
         
         
         if (arguments.length === 3) {
             hG.attr("transform", "rotate(" + rotation.val + "," + rotation.x + "," + rotation.y + ")");
         } else {
             hG.attr("transform", null);
         }
     }

     disableAdd() {
         $("#addElement").text("Insert element");
         d3.select("body").on("keyup.addMulti", null);
         d3.select("svg").on("click.add", null);
         d3.select("svg").on("contextmenu.add", null);
         d3.select("svg").on("contextmenu.general", d3.contextMenu(diagramMenu));
         d3.select("svg").on("mousemove", null);
         d3.select("svg > path").attr("d", null);
         d3.select("svg > circle").attr("transform", "translate(0, 0)");
         // delete from model
         let datum = d3.select("svg > path").datum();
         if (typeof(datum) !== "undefined") {
             // if the object is new, we delete it
             // if we are adding new points to an existing object
             // we just delete the new points
             let dobjs = opts.model.getDiagramObjects([datum.obj]);
             if (dobjs.length === 0) {
                 opts.model.deleteObject(datum.obj);
             } else {
                 self.parent.calcLineData(datum.obj);
             }
         }
         d3.select("svg > path").datum(null);
         self.highlight("x", null);
         self.highlight("y", null);
     }

     hover(hoverD) {
         let node = d3.select(hoverD);
         // 'normal' elements
         node
           .filter("g:not(.ACLineSegment)")
           .filter("g:not(." + NODE_CLASS + ")")
           .filter("g:not(.Terminal)")
           .each(function (d) {
               d3.select(this).append("rect")
                 .attr("x", this.getBBox().x)
                 .attr("y", this.getBBox().y)
                 .attr("width", this.getBBox().width)
                 .attr("height", this.getBBox().height)
                 .attr("stroke", "black")
                 .attr("stroke-width", 2)
                 .attr("stroke-dasharray", "5,5")
                 .attr("fill", "none")
                 .attr("class", "selection-rect");             
           });
         // resizable elements (TODO: junction)
         let res = node
                     .filter("g.ACLineSegment,g." + NODE_CLASS) 
                     .selectAll("g.resize")
                     .data(function(d) {
                         // data is the element plus the coordinate point seq number
                         let ret = d.lineData.map(el => [d, el.seq]);
                         return ret;
                     }).enter().append("g").attr("class", "resize");
         res.append("rect")
            .attr("x", function(d) {
                return d[0].lineData.filter(el => el.seq === d[1])[0].x - 2;
            })
            .attr("y", function(d) {
                return d[0].lineData.filter(el => el.seq === d[1])[0].y - 2;
            })
            .attr("width", 4)
            .attr("height", 4);
         // terminals
         node
           .filter("g.Terminal")
           .each(function (d) {
               let term = d3.select(this).select("circle");
               d3.select(this).append("circle")
                 .attr("cx", term.attr("cx"))
                 .attr("cy", term.attr("cy"))
                 .attr("r", 8)
                 .attr("stroke-width", 0)
                 .attr("fill", "red")
                 .attr("fill-opacity", "0.7")
                 .attr("class", "selection-circle");
           });
     }

     addNewMeasurement(elm, d, i) {
         // applies to only one element
         self.deselectAll();
         if (d.nodeName !== "cim:Terminal") { // TODO: select element associated with terminal
             selected.push(elm);
             self.updateSelected();
         }
         let newObject = null;
         if (opts.model.schema.isA("Switch", d) === true) {
             newObject = opts.model.createObject("cim:Discrete");
         } else {
             newObject = opts.model.createObject("cim:Analog");
         }
         if (d.nodeName === "cim:Terminal") {
             let psr = opts.model.getTargets(
                 [d],
                 "Terminal.ConductingEquipment")[0];
             opts.model.setLink(newObject, "cim:Measurement.Terminal", d);
             opts.model.setLink(newObject, "cim:Measurement.PowerSystemResource", psr);
         } else {
             if (d.nodeName === "cim:" + NODE_CLASS) {
                 let busbar = opts.model.getBusbar(d);
                 if (busbar !== null) {
                     opts.model.setLink(newObject, "cim:Measurement.PowerSystemResource", busbar);
                 }
             } else {
                 opts.model.setLink(newObject, "cim:Measurement.PowerSystemResource", d);
             }
         }
         opts.model.addToActiveDiagram(newObject, []);
     }

     addNewLimitSet(elm, d, i) {
         // applies to only one element
         self.deselectAll();
         let element = elm;
         let datum = d;
         // handle transformer ends
         if (opts.model.schema.isA("TransformerEnd", d3.select(elm).datum()) === true) {
             element = elm.parentElement;
             datum = d3.select(element).datum();
         }
         
         if (datum.nodeName !== "cim:Terminal") { // TODO: select element associated with terminal
             selected.push(element);
             self.updateSelected();
         }
         let newObject = opts.model.createObject("cim:OperationalLimitSet");
         if (datum.nodeName === "cim:Terminal") {
             let psr = opts.model.getTargets(
                 [datum],
                 "Terminal.ConductingEquipment")[0];
             opts.model.setLink(newObject, "cim:OperationalLimitSet.Terminal", datum);
         } else {
             if (datum.nodeName === "cim:" + NODE_CLASS) {
                 let busbar = opts.model.getBusbar(datum);
                 if (busbar !== null) {
                     opts.model.setLink(newObject, "cim:OperationalLimitSet.Equipment", busbar);
                 }
             } else {
                 opts.model.setLink(newObject, "cim:OperationalLimitSet.Equipment", datum);
             }
         }
         opts.model.addToActiveDiagram(newObject, []);
     }

     addRegulatingControl(elm, d, i) {
         // applies to only one element
         self.deselectAll();
         let newObject = opts.model.createObject("cim:RegulatingControl");
         opts.model.setLink(newObject, "cim:RegulatingControl.Terminal", d);
         opts.model.addToActiveDiagram(newObject, []);
     }

     addTCControl(elm, d, i) {
         // applies to only one element
         self.deselectAll();
         let newObject = opts.model.createObject("cim:TapChangerControl");
         opts.model.setLink(newObject, "cim:RegulatingControl.Terminal", d);
         opts.model.addToActiveDiagram(newObject, []);
     }

     // Associate a new tap changer to the object 'd', which can be either
     // a terminal or a transformer end. If 'd' is already associated with a
     // tap changer the function does nothing.
     addTC(elm, d, i) {
         // applies to only one element
         self.deselectAll();
         let wind = d;
         if (opts.model.schema.isA("Terminal", d) === true) {
             wind = opts.model.getTargets(
                 [d],
                 "Terminal.TransformerEnd")[0];             
         }
         let tc = opts.model.getTargets([wind], "TransformerEnd.RatioTapChanger");
         if (tc.length === 0) {
             let newObject = opts.model.createObject("cim:RatioTapChanger");
             opts.model.setLink(newObject, "cim:RatioTapChanger.TransformerEnd", wind);
             opts.model.addToActiveDiagram(newObject, []);
         }
     }
     
     addContextMenu(selection) {
         selection.filter("g:not(.ACLineSegment)")
                  .filter("g:not(." + NODE_CLASS + ")")
                  .filter("g:not(.PowerTransformer)")
                  .on("contextmenu", d3.contextMenu(menu));
         let multis = selection.filter("g.ACLineSegment,g." + NODE_CLASS);
         multis.selectAll("path").on("contextmenu", function(d, i, nodes) {
             d3.contextMenu(multiMenu).bind(this.parentNode)(d, i, nodes);
             d3.event.stopPropagation();
         });
         // setup context menu for terminals
         let terminals = selection.filter("g:not(.PowerTransformer)").selectAll("g.Terminal");
         terminals.on("contextmenu", function(d, i, nodes) {
             d3.contextMenu(terminalsMenu).bind(this)(d, i, nodes);
             d3.event.stopPropagation();
         });
         let trafoTerms = selection.filter("g.PowerTransformer").selectAll("g.Terminal");
         trafoTerms.on("contextmenu", function(d, i, nodes) {
             d3.contextMenu(trafoTermsMenu).bind(this)(d, i, nodes);
             d3.event.stopPropagation();
         });
         let trafoEnds = selection.filter("g.PowerTransformer").selectAll("g.TransformerEnd");
         trafoEnds.on("contextmenu", function(d, i, nodes) {
             d3.contextMenu(trafoEndsMenu).bind(this)(d, i, nodes);
             d3.event.stopPropagation();
         });
     }

     deleteObject(elm) {
         let selection = self.deleteSelection(elm);
         // delete from model
         opts.model.deleteObjects(selection.data());
     }

     deleteFromDiagram(elm) {
         let selection = self.deleteSelection(elm);
         // delete from model
         for (let datum of selection.data()) {
             opts.model.deleteFromDiagram(datum);
         }
     }

     deleteSelection(elm) {
         if (selected.indexOf(elm) === -1) {
             self.deselectAll();
             selected.push(elm);
         }
         let selection = d3.selectAll(selected);
         let terminals = opts.model.getTerminals(selection.data());
         let cnsToRemove = self.getLinkedCNs(terminals);
         for (let cnToRemove of cnsToRemove) {
             let cnUUID = opts.model.ID(cnToRemove.cn);
             let cnElem = d3.select("svg > g.diagram > g." + NODE_CLASS + "s > g#cimdiagram-" + cnUUID).node();
             selected.push(cnElem);
         }
         self.removeFromQuadtree(); // update quadtree
         selection = d3.selectAll(selected);
         $(selected).filter('[data-toggle="popover"]').popover("dispose");
         selection.remove();
         return selection;
     }
    </script>

</cimDiagramControls>

