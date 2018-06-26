/*
 This tag renders the controls for a given CIM diagram.

 Copyright 2017, 2018 Daniele Pala <pala.daniele@gmail.com>

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
    <style>
     #cim-diagram-controls { 
         display: none;
     }

     #cim-diagram-elements { 
         display: none; 
     }

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
                            <li id="BusbarSection" onclick={enableAddMulti}><a>Node</a></li>
                            <li class="dropdown-header">Branches</li>
                            <li id="ACLineSegment" onclick={enableAddMulti}><a>AC Line Segment</a></li>
                            <li class="dropdown-header">Switches</li>
                            <li id="Breaker" onclick={enableAdd}><a>Breaker</a></li>
                            <li id="Disconnector" onclick={enableAdd}><a>Disconnector</a></li>
                            <li id="LoadBreakSwitch" onclick={enableAdd}><a>Load Break Switch</a></li>
                            <li id="Jumper" onclick={enableAdd}><a>Jumper</a></li>
                            <!-- junctions are still not implemented properly for now
                            <!--<li class="dropdown-header">Connectors</li>-->
                            <!--<li id="cim:Junction" onclick={enableAdd}><a>Junction</a></li>-->
                            <li class="dropdown-header">Equivalents</li>
                            <li id="EnergySource" onclick={enableAdd}><a>Energy Source</a></li>
                            <li class="dropdown-header">Rotating Machines</li>
                            <li id="SynchronousMachine" onclick={enableAdd}><a>Synchronous Machine</a></li>
                            <li id="AsynchronousMachine" onclick={enableAdd}><a>Asynchronous Machine</a></li>
                            <li class="dropdown-header">Loads</li>
                            <li id="EnergyConsumer" onclick={enableAdd}><a>Energy Consumer</a></li>
                            <li id="ConformLoad" onclick={enableAdd}><a>Conform Load</a></li>
                            <li id="NonConformLoad" onclick={enableAdd}><a>Non Conform Load</a></li>
                            <li class="dropdown-header">Compensators</li>
                            <li id="LinearShuntCompensator" onclick={enableAdd}><a>Linear</a></li>
                            <li id="NonlinearShuntCompensator" onclick={enableAdd}><a>Nonlinear</a></li>
                            <li class="dropdown-header">Transformers</li>
                            <li id="PowerTransformer" onclick={enableAdd}><a>Two-winding Transformer</a></li>
                            <li id="PowerTransformer" onclick={enableAdd}><a>Three-winding Transformer</a></li>
                        </ul>
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
     let menu = [
         {
             title: "Copy",
             action: function(d, i) {
                 let elm = this;
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
                 self.deleteObject(this)
             }
         },
         {
             title: "Delete from current diagram",
             action: function(d, i) {
                 self.deleteFromDiagram(this);
             }
         },
         {
             title: "Show element info",
             action: function(d, i) {
                 let elm = this;
                 if (selected.indexOf(elm) === -1) {
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
     // menu for multi-segment objects
     let multiMenu = menu.concat(
         [{
             title: "Add points",
             action: function(d, i) {
                 let oldStatus = self.status;
                 let elm = this;
                 self.disableAll();
                 self.deselectAll();
                 selected.push(elm);
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
                         case "FORCE": {
                             self.enableForce();
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
                 });
                 d3.select("svg").on("click.add", clicked);
                 function clicked() {
                     self.addNewPoint(d);
                 };
             }
         }]);
     // menu for a point of a multi-segment object
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

                 d[0].lineData = d[0].lineData.filter(el => el.seq !== d[1]);
                 for (let p of d[0].lineData) {
                     if (p.seq > d[1]) {
                         p.seq = p.seq - 1;
                     }
                 }
                 self.deleteFromDiagram(this.parentNode);
                 opts.model.addToActiveDiagram(d[0], d[0].lineData);
             }
         }
     ];
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
     let trafoTermsMenu = terminalsMenu.concat(
         [{
             title: "Add ratio tap changer",
             action: function(d, i) {
                 self.addTC(this, d, i);
             }
         }]);
     let edgesMenu = [
         {
             title: "Delete",
             action: function(d, i) {
                 let cn = d.source;
                 if (opts.model.getBusbar(cn) === null) {
                     let cnTerms = opts.model.getTargets(
                         [cn],
                         NODE_TERM);
                     if (cnTerms.length === 2) {
                         let cnUUID = d.source.attributes.getNamedItem("rdf:ID").value
                         let cnElem = d3.select("svg").selectAll("g#"+cnUUID).node();
                         self.deleteObject(cnElem);
                         return;
                     }
                 }
                 opts.model.removeLink(d.source, "cim:" + NODE_TERM, d.target);
             }
         }
     ];
     let diagramMenu = [
         {
             title: "Paste",
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
         quadtree.removeAll(selected); // update quadtree
     }).on("end", function(d) {
         self.highlight(null);
         opts.model.updateActiveDiagram(d[0], d[0].lineData);
         quadtree.addAll(selected); // update quadtree
     });
     
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

     // listen to 'moveTo' event from parent
     self.parent.on("moveTo", function(element) {
         self.deselectAll();
         let cimObject = opts.model.getObject(element);
         let equipments = null;
         let terminals = null;
         let cn = null, cnUUID = null;
         let diagramElem = null;
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
                     diagramElem = d3.select("svg").select("#" + equipment.attributes.getNamedItem("rdf:ID").value).node();
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
                     diagramElem = d3.select("svg").select("#" + terminal.attributes.getNamedItem("rdf:ID").value).node();
                     if (diagramElem !== null) {
                         selected.push(diagramElem);
                     }
                 }
                 break;
             case "cim:BusbarSection":
                 cn = opts.model.getNode(cimObject);
                 cnUUID = cn.attributes.getNamedItem("rdf:ID").value;
                 diagramElem = d3.select("svg").selectAll("g#" + cnUUID).node();
                 selected = [diagramElem];
                 break;
             default:
                 diagramElem = d3.select("svg").selectAll("g#"+element).node();
                 selected = [diagramElem];
         }
         self.updateSelected();
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
         // setup quadtree
         let points = d3.select("svg").selectAll("svg > g.diagram > g:not(.edges) > g");
         let edges = d3.select("svg").selectAll("svg > g.diagram > g.edges > g");
         quadtree.x(function(d) {
             return d3.select(d).data()[0].x;
         }).y(function(d) {
             return d3.select(d).data()[0].y;
         }).addAll(points.nodes());
         // setup context menu
         self.addContextMenu(points);
         d3.select("svg").on("contextmenu.general", d3.contextMenu(diagramMenu));
         edges.on("contextmenu", d3.contextMenu(edgesMenu));
         // enable drag by default
         self.disableForce();
         self.disableZoom();
         self.disableConnect();
         self.enableDrag();
         $("#cim-diagram-controls").show();
         $("#cim-diagram-elements").show();
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
                   case "DRAG":
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
               // handle escape key
               if (d3.event.keyCode === 27) { // "Escape"
                   d3.contextMenu("close");
               }
           });
     });

     // listen to 'addToDiagram' event from parent 
     self.parent.on("addToDiagram", function(selection) {
         if (selection.size() === 1) {
             quadtree.add(selection.node()); // update the quadtree
             if (self.status === "DRAG") {
                 self.disableAll();
                 self.enableDrag();
             }
             self.addContextMenu(selection);
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

     // listen to 'createEdges' event from parent
     self.parent.on("createEdges", function(edgesEnter) {
         edgesEnter.on("contextmenu", d3.contextMenu(edgesMenu));
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
         d3.selectAll(selected).selectAll("circle.selection-circle").remove();
         selected = [];
     }

     /**
        Enable dragging of objects.
     */
     enableDrag() {
         let cnsToMove = [];
         self.disableDrag();
         d3.select(self.root).selectAll("label:not(#selectLabel)").classed("active", false);
         $("#select").click();
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
                 quadtree.removeAll(selected); // update quadtree
                 // handle movement of cn, for the special case when
                 // the cn connects only two elements and there is no
                 // busbar section associated to it.
                 if (opts.model.schema.isA("ConductingEquipment", d) === true) {
                     let terminals = opts.model.getTerminals([d]);
                     let cns = opts.model.getTargets(
                         terminals,
                         TERM_NODE);
                     for (let cn of cns) {
                         if (opts.model.getBusbar(cn) !== null) {
                             continue;
                         }
                         let cnTerms = opts.model.getTargets(
                             [cn],
                             NODE_TERM);
                         if (cnTerms.length === 2) {
                             let cnToMove = {cn: cn, cnTerms: cnTerms};
                             cnsToMove.push(cnToMove);
                         }
                     }
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
                 quadtree.addAll(selected); // update quadtree
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
             selected = self.search(quadtree, (extent[0][0] - tx)/tZoom, (extent[0][1] - ty)/tZoom, (extent[1][0] - tx)/tZoom, (extent[1][1] - ty)/tZoom);
             self.updateSelected();
         };
     }

     // Find the nodes within the specified rectangle.
     search(quadtree, x0, y0, x3, y3) {
         let neighbours = [];
         quadtree.visit(function(node, x1, y1, x2, y2) {
             if (!node.length) {
                 do {
                     let d = node.data;
                     let datum = d3.select(d).datum();
                     for (let lineDatum of datum.lineData) {
                         let dx = datum.x + lineDatum.x;
                         let dy = datum.y + lineDatum.y;
                         if((dx >= x0) && (dx < x3) && (dy >= y0) && (dy < y3)) {
                             neighbours.push(d);
                             break;
                         }
                     }
                 } while (node = node.next);
             }
             return x1 >= x3 || y1 >= y3 || x2 < x0 || y2 < y0;
         });
         return neighbours;
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

     disableDrag() {
         d3.select("svg").selectAll("svg > g.diagram > g:not(.edges) > g").on(".drag", null);
         d3.select("svg").select("g.brush").on(".brush", null);
         if (self.status === "DRAG") {
             // delete any brush
             d3.select("svg").select("g.brush").call(d3.brush().move, null);
         }
     }

     enableForce() {
         $('[data-toggle="popover"]').popover("hide");
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
         }
     }

     disableForce() {
         if (typeof(self.d3force) !== "undefined") {
             self.d3force.stop();
         }
     }
     
     enableZoom() {
         $("#zoom").click();
         $('[data-toggle="popover"]').popover("hide");
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
         self.deselectAll();
         // handle escape key
         d3.select("body").on("keyup.connect", function() {
             if (d3.event.keyCode === 27) { // "Escape"
                 self.disableConnect();
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
               // handle rotation of terminal
               let termXY = {x: d.x, y: d.y};
               if (d.rotation > 0) {
                   termXY = self.parent.rotateTerm(d);
               }

               let svg = d3.select("svg");
               let path = d3.select("svg > path");
               let circle = d3.select("svg > circle");
               let termToChange = path.datum();
               // directly connect terminals
               if (typeof(termToChange) !== "undefined") {
                   let cn = opts.model.getTargets(
                       [d],
                       TERM_NODE)[0];
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
                       let newx = (termXY.x*transform.k) + transform.x;
                       let newy = (termXY.y*transform.k) + transform.y;
                       return line([{x: newx, y: newy}, {x: m[0], y: m[1]}]);
                   });
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
                 opts.model.setLink(termToChange, "cim:" + TERM_NODE, cn);
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
             type = e.target.parentNode.id;
             text = e.target.textContent;
         } else {
             type = e;
             text = d3.select("#" + type + " > a").text();
         }
         let options = undefined;
         if (text === "Three-winding Transformer") {
             options = {windNum: 3};
         }
         self.disableAll();
         d3.select(self.root).selectAll("label").classed("active", false);
         $("input").prop('checked', false);
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
             type = e.target.parentNode.id;
             text = e.target.textContent;
         } else {
             type = e;
             text = d3.select("#" + type + " > a").text();
         }
         d3.select(self.root).selectAll("label").classed("active", false);
         $("input").prop('checked', false);
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
             let aligned = self.align(newObject, lineDatum, true);
             movePoint(newObject, null, aligned);
         };
         
         function movePoint(d, seq, delta) {
             let transform = d3.zoomTransform(svg.node());
             let path = svg.selectAll("svg > path");
             let circle = svg.selectAll("svg > circle");
             let line = d3.line()
                          .x(function(d) { return d.x; })
                          .y(function(d) { return d.y; });
             circle.attr("transform", function () {
                 let mousex = ((d.x + delta.x)*transform.k) + transform.x + 10;
                 let mousey = ((d.y + delta.y)*transform.k) + transform.y + 10;
                 return "translate(" + mousex + "," + mousey +")";
             });
             path.attr("d", function() {
                 let lineData = [];
                 for (let linePoint of d.lineData) {
                     lineData.push({x: ((linePoint.x+d.x)*transform.k) + transform.x,
                                    y: ((linePoint.y+d.y)*transform.k) + transform.y});
                 }
                 lineData.push({x: ((d.x + delta.x)*transform.k) + transform.x, y: ((d.y + delta.y)*transform.k) + transform.y});
                 return line(lineData);
             });
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
         newObject.lineData.push({x: newx, y: newy, seq: newSeq});
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
                 }
                 if (Math.abs(deltay) < 5) {
                     absy = absyP;
                     movey = absy - d.y;
                     let roty = ((absyP) * transform.k) + transform.y;
                     self.highlight("y", roty);
                     yaligned = true;
                 }
             }
         }
         if (xaligned === false) {
             self.highlight("x", null);
         }
         if (yaligned === false) {
             self.highlight("y", null);
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
         // 'normal' elements
         d3.select(hoverD)
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
         let res = d3.select(hoverD)
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
         d3.select(hoverD)
           .filter("g.Terminal")
           .each(function (d) {
               //$(this.parentNode).filter('[data-toggle="popover"]').popover("show");
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
         if (d.nodeName !== "cim:Terminal") { // TODO: select element associated with terminal
             selected.push(elm);
             self.updateSelected();
         }
         let newObject = opts.model.createObject("cim:OperationalLimitSet");
         if (d.nodeName === "cim:Terminal") {
             let psr = opts.model.getTargets(
                 [d],
                 "Terminal.ConductingEquipment")[0];
             opts.model.setLink(newObject, "cim:OperationalLimitSet.Terminal", d);
         } else {
             if (d.nodeName === "cim:" + NODE_CLASS) {
                 let busbar = opts.model.getBusbar(d);
                 if (busbar !== null) {
                     opts.model.setLink(newObject, "cim:OperationalLimitSet.Equipment", busbar);
                 }
             } else {
                 opts.model.setLink(newObject, "cim:OperationalLimitSet.Equipment", d);
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

     addTC(elm, d, i) {
         // applies to only one element
         self.deselectAll();
         let wind = opts.model.getTargets(
             [d],
             "Terminal.TransformerEnd")[0];
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
     }

     deleteObject(elm) {
         if (selected.indexOf(elm) === -1) {
             self.deselectAll();
             selected.push(elm);
         }
         quadtree.removeAll(selected); // update quadtree
         $(selected).filter('[data-toggle="popover"]').popover("destroy");
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

     deleteFromDiagram(elm) {
         if (selected.indexOf(elm) === -1) {
             self.deselectAll();
             selected.push(elm);
         }
         quadtree.removeAll(selected); // update quadtree
         $(selected).filter('[data-toggle="popover"]').popover("destroy");
         let selection = d3.selectAll(selected);
         let terminals = opts.model.getTerminals(selection.data());
         d3.select("svg").selectAll("svg > g.diagram > g.edges > g").filter(function(d) {
             return selection.data().indexOf(d.source) > -1 || terminals.indexOf(d.target) > -1;
         }).remove();
         selection.remove();
         // delete from model
         for (let datum of selection.data()) {
             opts.model.deleteFromDiagram(datum);
         }
     }
    </script>

</cimDiagramControls>

