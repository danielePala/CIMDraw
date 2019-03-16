/*
  Simple topology processor implementation.

  Copyright 2017-2019 Daniele Pala <pala.daniele@gmail.com>

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

"use strict";

function topologyProcessor(model) {
    let tProcessor = {
        calcTopology() {
            let ret = [];
            let allNodes = model.getObjects(["cim:TopologicalNode"])["cim:TopologicalNode"];
            if (model.getMode() === "BUS_BRANCH") {
                // nothing to do
                return allNodes;
            }
            // delete all topological nodes
            let nodeUUIDs = allNodes.map(el => el.attributes.getNamedItem("rdf:ID").value);
            nodeUUIDs.forEach(function(nodeUUID) {
                model.deleteObject(model.getObject(nodeUUID));
            });
            // get all connectivity nodes
            let allConnectivityNodes = model.getObjects(["cim:ConnectivityNode"])["cim:ConnectivityNode"];
            let topos = [];
            let actNodes = allConnectivityNodes;
            while(actNodes.length > 0) {
                let topo = calcTopo(actNodes[0]);
                if (topo.length === 0) {
                    actNodes.splice(0, 1);
                } else {
                    actNodes = actNodes.filter(el => topo.indexOf(el) < 0);
                    topos.push(topo);
                }
            }

            function calcTopo(v) {
                let topo = new Set();
                let oldSize = -1;
                topo.add(v);
                while (oldSize !== topo.size) {
                    oldSize = topo.size;
                    let cnTerminals = model.getTargets([...topo], "ConnectivityNode.Terminals");
                    if (cnTerminals.length === 0) {
                        return [];
                    }
                    let switches = model.getTargets(cnTerminals, "Terminal.ConductingEquipment").filter(function(el) {
                        return model.schema.isA("Switch", el) === true;
                    });
                    switches = switches.filter(function(el) {
                        let ret = true;
                        let status = model.getAttribute(el, "cim:Switch.open");
                        if (typeof(status) !== "undefined") {
                            ret = (status.textContent === "false")
                        }
                        return ret;
                    });
                    let swTerminals = model.getTargets(switches, "ConductingEquipment.Terminals");
                    let swCns = model.getTargets(swTerminals, "Terminal.ConnectivityNode");
                    for (let cn of swCns) {
                        topo.add(cn);
                    }
                }
                return [...topo];
            };
            // each group represents a topological node, create it
            topos.forEach(function(topo) {
                let tobj = model.createObject("cim:TopologicalNode");
                topo.forEach(function(cn) {
                    model.setLink(cn, "cim:ConnectivityNode.TopologicalNode", tobj);
                });
                // find the base voltage of this node
                // we have two ways: via conducting equipment, or via containment in
                // a voltage level: in the second case it can also be that
                // the equipment is contained in a bay, which in turn is contained
                // in a voltage level.
                let terms = model.getTargets(topo, "ConnectivityNode.Terminals");
                let eqs = model.getTargets(terms, "Terminal.ConductingEquipment");
                let baseVs =  model.getTargets(eqs, "ConductingEquipment.BaseVoltage");
                if (baseVs.length > 0) {
                    model.setLink(tobj, "cim:TopologicalNode.BaseVoltage", baseVs[0]);
                } else {
                    let containers = model.getTargets(eqs, "Equipment.EquipmentContainer");
                    // we can use both voltage leves and bays
                    let vlevs = containers.filter(el => model.schema.isA("VoltageLevel", el));
                    baseVs =  model.getTargets(vlevs, "VoltageLevel.BaseVoltage");
                    if (baseVs.length > 0) {
                        model.setLink(tobj, "cim:TopologicalNode.BaseVoltage", baseVs[0]);
                    } else {
                        let bays = containers.filter(el => model.schema.isA("Bay", el));
                        vlevs =  model.getTargets(bays, "Bay.VoltageLevel");
                        baseVs =  model.getTargets(vlevs, "VoltageLevel.BaseVoltage");
                        if (baseVs.length > 0) {
                            model.setLink(tobj, "cim:TopologicalNode.BaseVoltage", baseVs[0]);
                        }
                    }
                }
                // find the terminals of this node
                // this is just the union of the terminals of all the connectivity nodes
                terms.forEach(function(term) {
                    model.setLink(term, "cim:Terminal.TopologicalNode", tobj);
                    // if the user hasn't defined if the terminal is connected,
                    // we assume that the answer is 'yes'.
                    if (typeof(model.getAttribute(term, "cim:ACDCTerminal.connected")) === "undefined") {
                        model.setAttribute(term, "cim:ACDCTerminal.connected", "true");
                    }
                });
                ret.push(tobj);
            });
            return ret;
        },

        // Get the terminals of the given object (TopologicalNode or
        // ConductingEquipment or TransformerEnd). These are the terminals which have
        // the attribute "cim:ACDCTerminal.connected" set to true.
        getTerminals(obj) {
            let terms = [];
            if (model.schema.isA("TopologicalNode", obj)) {
                terms = model.getTargets([obj], "TopologicalNode.Terminal");
            } else {
                if (model.schema.isA("TransformerEnd", obj)) {
                    terms = model.getTargets([obj], "TransformerEnd.Terminal");
                } else {
                    terms = model.getTargets([obj], "ConductingEquipment.Terminals");
                }
            }
            terms = terms.filter(function(term) {
                let isConnected = model.getAttribute(term, "cim:ACDCTerminal.connected");
                if (typeof(isConnected) === "undefined") {
                    return false;
                }
                return isConnected.textContent === "true";
            });
            return terms;
        }

        // TODO: install math.js
        /*function calcAdmittanceMatrix(model) {
          let ret = math.zeros(topos.length, topos.length, "sparse"); // the admittance matrix is sparse
          let objs = model.getObjects(["cim:TopologicalNode", "cim:ACLineSegment"]);
          // update topology (TODO: not needed in planning)
          tProcessor.calcTopology(model);
          let topos = objs["cim:TopologicalNode"];
          // assign a number to topos
          let topoMap = new Map();
          for (let i in topos) {
          topoMap.add(topo, i);
          }
          let aclines =  objs["cim:ACLineSegment"];
          aclines.forEach(function(acline) {
          // get associated topos
          let aclTerms = model.getTargets([acline], "ConductingEquipment.Terminals");
          let aclTopos = model.getTargets(aclTerms, "Terminal.TopologicalNode"); // TODO: can be via conn nodes
          let topo1idx = topoMap.get(aclTopos[0]);
          let topo2idx = topoMap.get(aclTopos[1]);
          // calculate pi-model parameters
          let r = model.getAttribute(acline, "cim:ACLineSegment.r");
          let x = model.getAttribute(acline, "cim:ACLineSegment.x");
          let g = model.getAttribute(acline, "cim:ACLineSegment.gch");
          let b = model.getAttribute(acline, "cim:ACLineSegment.bch");
          let Z = math.complex(r, x);
          let Y = math.complex(g, b);
          let Z0 = math.sqrt(math.divide(Z, Y));
          let Ka = math.sqrt(math.multiply(Z, Y));
          let A = math.cosh(Ka);
          let B = math.multiply(Z0, math.sinh(Ka));
          let y12part = math.divide(1, B);
          let y10part = math.divide(math.subtract(A, 1), B);
          // modify admittance matrix
          let y10 = ret.subset(math.index(topo1idx, topo1idx));
          let y12 = ret.subset(math.index(topo1idx, topo2idx));
          let y20 = ret.subset(math.index(topo2idx, topo2idx));
          ret.subset(math.index(topo1idx, topo1idx), y10 + y10part);
          ret.subset(math.index(topo1idx, topo2idx), y12 - y12part);
          ret.subset(math.index(topo2idx, topo1idx), y12 - y12part);
          ret.subset(math.index(topo2idx, topo2idx), y20 + y10part); // y20part is equal to y10part
          });
          };
        */
    };
    return tProcessor;
};
