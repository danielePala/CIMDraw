/*
 This tag renders the whole CIMDraw application, handling routing logic.

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

<cimDraw>
    <style>
     .center-block {
         text-align: center;
     }
     
     .diagramTools {
         margin-bottom: 20px;
     }
     
     .app-container {
         display: flex;
         flex-flow: row nowrap;
     }

     .navbar-light .navbar-text {
         color: rgba(0,0,0,1);
     }

     .navbar-light .navbar-nav .nav-link {
         color: rgba(0,0,0,1);
     }
    </style>
    
    <nav class="navbar navbar-expand-lg navbar-light bg-light">
        <div class="container-fluid">
            <a class="navbar-brand" href="">CIMDraw</a>
            <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse justify-content-between" id="navbarSupportedContent">
                <ul class="nav navbar-nav" id="cim-home-container">
                    <li class="nav-item">
                        <span class="navbar-text" id="cim-filename"></span>
                    </li>
                    <li class="nav-item dropdown">
                        <a href="#" class="nav-link dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">
                            File <span class="caret"></span>
                        </a>
                        <div class="dropdown-menu">
                            <a class="dropdown-item" href="">Open</a>
                            <a class="dropdown-item" id="cim-save" download="file.xml">Save as RDF/XML...</a>
                            <a class="dropdown-item" id="cgmes-save">Save as CGMES...</a>
                            <a class="dropdown-item" id="cgmes-download" download="file.zip" style="display: none;"></a>
                            <a class="dropdown-item" id="cim-export" download="diagram.xml">Export current diagram</a>
                            <a class="dropdown-item" id="matpower-export" download="file.m">Export to Matpower (EXPERIMENTAL)...</a>
                        </div>
                    </li>
                    <li class="nav-item">
                        <cimTopologyProcessor model={cimModel}></cimTopologyProcessor>
                    </li>
                    <li class="nav-item">
                        <select id="cim-diagrams" class="selectpicker"
                                onchange="location = this.options[this.selectedIndex].value;" data-live-search="true" title="Select a diagram" data-style="btn-outline-secondary">
                        </select>
                    </li>
                </ul>
                <span class="navbar-text" id="cim-mode">Mode: Operational</span>
            </div>
        </div>
    </nav>
    
    <div class="container-fluid">
        <div class="row justify-content-center" id="cim-local-file-component">
            <div class="col-md-4"> 
                <div class="row justify-content-center" id="cim-select-file">
                    <div class="col-md-auto">
                        <br><br>
                        <label class="control-label">Select File</label>
                    </div>
                </div>

                <!-- File input plugin -->
                <div class="row justify-content-center">
                    <div class="col-md-12" id="cim-file-input-container">
                        <form enctype="multipart/form-data" method="POST">
                            <input id="cim-file-input" name="cim-file" type="file" class="file" data-show-preview="false" data-show-upload="false">
                        </form>
                    </div>
                </div>
                
                <div class="row justify-content-center">
                    <div class="col-md-auto" id="cim-load-container">
                        <br>
                        <a class="btn btn-primary btn-lg" role="button" id="cim-load">Load</a>
                    </div>
                </div>
                <div class="row justify-content-center">
                    <div class="col-md-auto">
                        <label class="control-label">or</label>
                    </div>
                </div>
                <div class="row justify-content-center">
                    <div class="col-md-auto" id="cim-create-new-container">
                        <a class="btn btn-primary btn-lg" role="button" id="cim-create-new" href="">Create new</a>
                    </div>
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


        <!-- Modal for loading a specific diagram -->
        <div class="modal fade" id="newDiagramModal" tabindex="-1" role="dialog" aria-labelledby="newDiagramModalLabel">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="newDiagramModalLabel">Enter a name for the new diagram</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                        
                    </div>
                    <div class="modal-body">
                        <form>
                            <input type="text" class="form-control" id="newDiagramName" placeholder="untitled">
                        </form> 
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" id="newDiagramBtn">Create</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal for loading diagram list -->
        <div class="modal fade" id="loadingModal" tabindex="-1" role="dialog" aria-labelledby="loadingDiagramModalLabel" data-backdrop="static">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-body">
                        <p id="loadingDiagramMsg">loading diagram...</p>
                    </div>
                    <div class="modal-footer" id="cim-loading-modal-error-container">
                        <button type="button" class="btn btn-primary" id="cim-loading-modal-error">Ok</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal for selecting the modeling type: bus-branch vs node-breaker -->
        <div class="modal fade" id="cimModeModal" tabindex="-1" role="dialog" aria-labelledby="cimModeModalLabel">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="cimModeModalLabel">Choose diagram type</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    </div>
                    <div class="modal-body">
                        <div class="row justify-content-center">
                            <div class="col-md-auto">         
                                <div class="btn-group btn-group-toggle" data-toggle="buttons">
                                    <label class="btn btn-primary active">
                                        <input type="radio" name="options" id="operational" autocomplete="off" checked> Operational
                                    </label>
                                    <label class="btn btn-primary">
                                        <input type="radio" name="options" id="planning" autocomplete="off"> Planning
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" id="cim-create-new-modal">Create</button>
                    </div>
                </div>
            </div>
        </div>

   
    </div>

    <script>
     "use strict";
     let self = this;
     self.cimModel = cimModel();
     let diagramsToLoad = 2;

     self.cimModel.on("setMode", function(mode) {
         if (mode === "NODE_BREAKER") {
             $("#cim-mode").text("Mode: Operational");
         } else {
             $("#cim-mode").text("Mode: Planning");
         }
     });
     
     self.on("loaded", function() {
         diagramsToLoad = diagramsToLoad - 1;
         if (diagramsToLoad === 0) {
             $("#loadingModal").modal("hide");
             $("#loadingDiagramMsg").text("loading diagram...");
             diagramsToLoad = 2;
         }
     });
     
     self.on("mount", function() {
         route.stop(); // clear all the old router callbacks
         let cimFile = {};
         let cimFileReader = {};
         $(".selectpicker").selectpicker();

         $("#operational").change(function() {
             self.cimModel.setMode("NODE_BREAKER");
         });

         $("#planning").change(function() {
             self.cimModel.setMode("BUS_BRANCH");
         });
         
         $("#cim-create-new-container").on("click", function() {
             cimFile = {name: "new1"};
             cimFileReader = null;
             $("#cimModeModal").modal("show");
         });

         $("#cim-loading-modal-error").on("click", function() {
             $("#loadingModal").modal("hide");
             route("/");
         });
         
         $("#cim-create-new-modal").on("click", function() {
             route("/" + cimFile.name + "/diagrams");
         });
         
         // This is the initial route ("the home page").
         route(function(name) {
             // things to show
             $("#cim-local-file-component").show();
             // things to hide
             $("#app-container").hide();
             $("#cim-load-container").hide();
             $("#cim-home-container").hide();
             $(".selectpicker").selectpicker("hide");
             $("#cim-mode").hide();
             $("#cim-topology-processor").hide();
             $("#cim-loading-modal-error-container").hide();
             // main logic
             d3.select("#cim-diagrams").selectAll("option").remove();
             d3.select("#cim-diagrams").append("option").attr("disabled", "disabled").html("Select a diagram");
             d3.select("#cim-filename").html("");    
             $(".selectpicker").selectpicker("refresh");
             // initialize the fileinput component
             $("#cim-file-input").fileinput({theme: "fa"});
             $("#cim-file-input").fileinput("clear");
             // what to do when the user loads a file
             $("#cim-file-input").on("fileloaded", function(event, file, previewId, index, reader) {        
                 cimFile = file;
                 cimFileReader = reader;
                 $("#cim-load").attr("href", "#" + encodeURI(cimFile.name) + "/diagrams");
                 $("#cim-load-container").show();
             });
             // sometimes we must hide the 'load file' button
             $('#cim-file-input').on('fileclear', function(event) {
                 $("#cim-load-container").hide();
             });
         });

         // here we choose a diagram to display
         route('/*/diagrams', function() {
             // things to show
             $("#cim-home-container").show();
             $(".selectpicker").selectpicker("show");
             $("#cim-mode").show();
             // things to hide
             $("#cim-local-file-component").hide();
             $("#app-container").hide();
             $("#cim-export").parent().addClass("disabled");
             $("#cimModeModal").modal("hide");
             // main logic
             if (cimFile.name === d3.select("#cim-filename").html()) {
                 // nothing to do in this case, just refresh the diagram list
                 loadDiagramList(cimFile.name);
                 return;
             }
             $("#loadingDiagramMsg").text("loading CIM network...");
             $("#loadingModal").off("shown.bs.modal");
             $("#loadingModal").on("shown.bs.modal", function(e) {
                 if (typeof(cimFile.name) !== "undefined") {
                     d3.select("#cim-filename").html("[" + cimFile.name + "]&nbsp&nbsp");
                     self.cimModel.load(cimFile, cimFileReader).then(function() {
                         loadDiagramList(cimFile.name);
                         $("#loadingModal").modal("hide");
                         if (cimFile.name !== "new1") {
                             selectMode();
                         }
                     }).catch(function(e) {
                         $("#loadingDiagramMsg").append("<br>" + e);
                         $("#cim-loading-modal-error-container").show();
                     });
                 } else {
                     $("#loadingModal").modal("hide");
                     route("/");
                     return;
                 }

                 function selectMode() {
                     let nodes = self.cimModel.getObjects(["cim:ConnectivityNode", "cim:TopologicalNode"]);
                     let cns = nodes["cim:ConnectivityNode"];
                     let tns = nodes["cim:TopologicalNode"];
                     cns = cns.filter(function(el) {
                         return self.cimModel.isBoundary(el) === false;
                     });
                     if (cns.length > 0 || tns.length === 0) {
                         self.cimModel.setMode("NODE_BREAKER");
                     } else {
                         self.cimModel.setMode("BUS_BRANCH");
                     }
                 };
             });
             $("#loadingModal").modal("show");
             self.trigger("diagrams");
         });

         // here we show a certain diagram
         route('/*/diagrams/*', function(file, name) {
             if (typeof(cimFile.name) === "undefined") {
                 route("/");
                 return;
             }
             if (self.cimModel.activeDiagramName === decodeURI(name)) {
                 self.trigger("showDiagram", file, name);
                 $("#app-container").show();
                 $(".selectpicker").selectpicker("val", decodeURI("#" + file + "/diagrams/" + name));
                 return; // nothing more to do;
             }
             $("#cim-local-file-component").hide();
             $("#loadingDiagramMsg").text("loading diagram...");
             $("#loadingModal").off("shown.bs.modal");
             $("#loadingModal").modal("show");
             $("#loadingModal").on("shown.bs.modal", function(e) {
                 loadDiagram(file, name);
             });
         });

         // creates a new model if it doesn't exist, and shows a diagram.
         function loadDiagram(file, name, element) {
             self.cimModel.loadRemote("/" + file).then(function() {
                 showDiagram();
             }).catch(function(e) {
                 $("#loadingDiagramMsg").append("<br>" + e);
                 $("#cim-loading-modal-error-container").show();
             });
             function showDiagram() {
                 self.cimModel.selectDiagram(decodeURI(name));
                 loadDiagramList(decodeURI(file));
                 $(".selectpicker").selectpicker("val", decodeURI("#" + file + "/diagrams/" + name));
                 self.trigger("showDiagram", file, name, element);
                 $("#app-container").show();

                 // allow exporting a copy of the diagram 
                 $("#cim-export").on("click", function() {
                     let out = self.cimModel.export();
                     let blob = new Blob([out], {type : "text/xml"});
                     let objectURL = URL.createObjectURL(blob);
                     $("#cim-export").attr("href", objectURL);
                 });
                 $("#cim-export").parent().removeClass("disabled");
             };
         };

         function loadDiagramList(filename) {
             $("#cim-save").off("click");
             // allow saving a copy of the file as plain XML
             $("#cim-save").on("click", function() {
                 let out = self.cimModel.save();
                 let blob = new Blob([out], {type : "text/xml"});
                 let objectURL = URL.createObjectURL(blob);
                 $("#cim-save").attr("href", objectURL);
             });
             $("#cgmes-save").off("click");
             // allow saving a copy of the file as CGMES
             $("#cgmes-save").on("click", cgmesSave);
             function cgmesSave() {
                 let out = self.cimModel.saveAsCGMES();
                 out.then(function(content) {
                     let objectURL = URL.createObjectURL(content);
                     $("#cgmes-download").attr("href", objectURL);
                     document.getElementById("cgmes-download").click();
                 }).catch(function(reason) {
                     console.log(reason);
                 });
             };
             $("#matpower-export").off("click");
             // allow saving a copy of the file as plain XML
             $("#matpower-export").on("click", function() {
                 let out = exportToMatpower(self.cimModel);
                 let blob = new Blob([out], {type : "text/plain"});
                 let objectURL = URL.createObjectURL(blob);
                 $("#matpower-export").attr("href", objectURL);
             });
             
             // load diagram list
             $(".selectpicker").selectpicker();
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
             if (diagrams.length === 0) {
                 route(filename + "/createNew");
             }
         };
         
         route("/*/diagrams/*/*", function(file, name, element) {
             $("#cim-local-file-component").hide();
             self.trigger("showDiagram", file, name, element);
         });

         route("/*/createNew", function(file) {
             window.history.back();
             $("#newDiagramModal").modal("show");
             d3.select("#newDiagramBtn").on("click", function() {
                 let diagramName = d3.select("#newDiagramName").node().value;
                 let hashComponents = window.location.hash.substring(1).split("/");
                 let basePath = hashComponents[0] + "/diagrams/";
                 let fullPath = basePath + diagramName;
                 $('#newDiagramModal').modal("hide");
                 route(fullPath);
             });
         });

         // start router
         route.start(true);
     });
    </script>
</cimDraw>
