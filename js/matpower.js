function exportToMatpower(model) {
    let mpcFile = "function mpc = cim\n";
    // some fixed values
    let version = "2";
    let baseMVA = "100";

    // version
    mpcFile = mpcFile + "mpc.version = '" + version + "';\n";
    // baseMVA
    mpcFile = mpcFile + "mpc.baseMVA = " + baseMVA + ";\n";
    // bus
    mpcFile = mpcFile + "mpc.bus = [";
    let allNodes = model.getObjects(["cim:TopologicalNode"])["cim:TopologicalNode"];
    // We consider as generators all the rotating machines (in principle, both sync and async)
    // which are associated with a generating unit.
    let genUnits = model.getSubObjects("GeneratingUnit");
    let machines = model.getTargets(genUnits, "GeneratingUnit.RotatingMachine");
    let busNums = new Map();
    for (let i in allNodes) {
	let busNum = parseInt(i) + 1;
	mpcFile = mpcFile + busNum + "\t";   // bus_i
	mpcFile = mpcFile + 2 + "\t";        // type
	mpcFile = mpcFile + 0 + "\t";        // Pd
	mpcFile = mpcFile + 0 + "\t";        // Qd
	mpcFile = mpcFile + 0 + "\t";        // Gs
	mpcFile = mpcFile + 0 + "\t";        // Bs
	mpcFile = mpcFile + 1 + "\t";        // area
	mpcFile = mpcFile + 1 + "\t";        // Vm
	mpcFile = mpcFile + 0 + "\t";        // Va
	mpcFile = mpcFile + 230 + "\t";      // baseKV
	mpcFile = mpcFile + 1 + "\t";        // zone
	mpcFile = mpcFile + 1.1 + "\t";      // Vmax
	mpcFile = mpcFile + 0.9 + ";\t";      // Vmin
	mpcFile = mpcFile + "\n";
	busNums.set(allNodes[i], busNum);
    }
    mpcFile = mpcFile + "];\n"
    // gen
    mpcFile = mpcFile + "mpc.gen = [";
    for (let i in machines) {
	// TODO: the values should be aggregated per generating unit (i.e. a generating unit
	// can include more than one machine. All the machines in a generating unit should
	// be connected to the same bus (is this explicitly declared in CIM?).
	let terminals = model.getTargets([machines[i]], "ConductingEquipment.Terminals");
	let nodes = model.getTargets(terminals, "Terminal.TopologicalNode");
	let genUnit = model.getTargets([machines[i]], "RotatingMachine.GeneratingUnit")[0];
	nodes.forEach(function(node) {
	    let busNum = busNums.get(node);
	    let p = getAttrDefault(machines[i], "cim:RotatingMachine.p", "0");
	    let q = getAttrDefault(machines[i], "cim:RotatingMachine.q", "0");
	    let qmax = getAttrDefault(machines[i], "cim:SynchronousMachine.maxQ", "0");
	    let qmin = getAttrDefault(machines[i], "cim:SynchronousMachine.minQ", "0");
	    let mbase = getAttrDefault(machines[i], "cim:SynchronousMachine.ratedS", baseMVA);
	    let pmax = getAttrDefault(genUnit, "cim:GeneratingUnit.maxOperatingP", "0");
	    let pmin = getAttrDefault(genUnit, "cim:GeneratingUnit.minOperatingP", "0");
	    mpcFile = mpcFile + busNum + "\t"; // bus
	    mpcFile = mpcFile + p + "\t"; // Pg
	    mpcFile = mpcFile + q + "\t"; // Qg
	    mpcFile = mpcFile + qmax + "\t"; // Qmax
	    mpcFile = mpcFile + qmin + "\t"; // Qmin
	    mpcFile = mpcFile + 1 + "\t"; // Vg
	    mpcFile = mpcFile + mbase + "\t"; // mBase
	    mpcFile = mpcFile + 1 + "\t"; // status
	    mpcFile = mpcFile + pmax + "\t"; // Pmax
	    mpcFile = mpcFile + pmin + "\t"; // Pmin
	    mpcFile = mpcFile + 0 + "\t"; // Pc1
	    mpcFile = mpcFile + 0 + "\t"; // Pc2
	    mpcFile = mpcFile + 0 + "\t"; // Qc1min
	    mpcFile = mpcFile + 0 + "\t"; // Qc1max
	    mpcFile = mpcFile + 0 + "\t"; // Qc2min
	    mpcFile = mpcFile + 0 + "\t"; // Qc2max
	    mpcFile = mpcFile + 0 + "\t"; // ramp_agc
	    mpcFile = mpcFile + 0 + "\t"; // ramp_10
	    mpcFile = mpcFile + 0 + "\t"; // ramp_30
	    mpcFile = mpcFile + 0 + "\t"; // ramp_q
	    mpcFile = mpcFile + 0 + ";\t"; // apf
	    mpcFile = mpcFile + "\n";
	});
    }
    mpcFile = mpcFile + "];\n"
    
    console.log(mpcFile);

    function getAttrDefault(el, attr, defVal) {
	let ret = model.getAttribute(el, attr);
	if (typeof(ret) === "undefined") {
	    ret = defVal;
	} else {
	    ret = ret.textContent;
	}
	return ret;
    };
}
