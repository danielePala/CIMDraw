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
    allConnectivityNodes = model.getObjects(["cim:ConnectivityNode"])["cim:ConnectivityNode"];
    console.log(allConnectivityNodes.length);
    // group toghether all the connectivity nodes that are directly
    // connected via a closed switch
    let topos = allConnectivityNodes.reduce(function(r, v) {
	let cnTerminals = model.getTargets([v], "ConnectivityNode.Terminals");
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
	swCns.push(v);
	r.push(new Set(swCns));
	return r;
    }, []);
    // merge all the groups obtained at the provious step that have a nonempty
    // intersection, until no more merging is possible.
    let oldSize = topos.length;
    let newSize = 0;
    while (oldSize !== newSize) {
	oldSize = topos.length;
	topos = topos.reduce(function(r, v) {
	    let merged = false;
	    for (let i in r) {
		let topo = r[i];
		let intersection = new Set([...v].filter(x => topo.has(x)));
		if (intersection.size > 0) {
		    merged = true;
		    r[i] = new Set([...topo].concat([...v]));
		}
	    }
	    if (merged === false) {
		r.push(v);
	    }
	    return r;
	}, []);
	newSize = topos.length;
    }
    console.log(topos);
    // each group represents a topological node, create it
    topos.forEach(function(topo) {
	let tobj = model.createObject("cim:TopologicalNode");
	topo.forEach(function(cn) {
	    model.setLink(cn, "cim:ConnectivityNode.TopologicalNode", tobj);
	});
    });
    return topos;
};
