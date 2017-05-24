/*
 Simple topology processor implementation.

 Copyright 2017 Daniele Pala <daniele.pala@rse-web.it>

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

function calcTopology(model) {
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
    });
    return topos;
};
