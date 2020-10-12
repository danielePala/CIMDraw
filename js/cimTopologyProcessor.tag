/*
 Topology processor user interface.

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

<cimTopologyProcessor>
    <style>
        #cim-topology-processor { display: none }
    </style>

    <!-- Topology processor button -->
    <ul class="nav navbar-nav" id="cim-topology-processor">
        <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">
                <span id="seText">Topology Processor</span>
                <span class="caret"></span>
            </a>
            <div class="dropdown-menu">
                <a class="dropdown-item" id="runLabel" onclick={ run }>Run</a>
            </div>
        </li>
    </ul>

    <!-- modal for topology processor info -->
    <div class="modal fade" id="tpStatusModal" tabindex="-1" role="dialog" aria-labelledby="tpStatusModalLabel">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="seConfigModalLabel">Topology processor results</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                </div>
                <div class="modal-body">
                    <p id="tpMsg">Loading...</p>
                </div>
            </div>
        </div>
    </div>

    <script>
     "use strict";
     let self = this;

     opts.dispatcher.on("diagrams", function() {
         document.querySelector("#cim-topology-processor").style.display = "flex";
     });

     run(e) {
         document.querySelector("#tpMsg").textContent = "Loading...";
         $("#tpStatusModal").modal("show");
         $("#tpStatusModal").on("shown.bs.modal", function (e) {
             let topos = topologyProcessor(opts.model).calcTopology();
             document.querySelector("#tpMsg").textContent = "Done (" + topos.length + " nodes calculated).";
         });

     }
     
    </script>

</cimTopologyProcessor>
