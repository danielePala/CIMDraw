function exportToMatpower(model) {
    let mpcFile = "function mpc = cim\n";
    // some fixed values
    let version = "2";
    let baseMVA = "100";

    // if in node-breaker mode, we should execute the topology processor
    let allNodes = [];
    if (model.getMode() === "NODE_BREAKER") {
	allNodes = calcTopology(model);
    } else {
	allNodes = model.getObjects(["cim:TopologicalNode"])["cim:TopologicalNode"];
    }
    // version
    mpcFile = mpcFile + "mpc.version = '" + version + "';\n";
    // baseMVA
    mpcFile = mpcFile + "mpc.baseMVA = " + baseMVA + ";\n";
    // bus
    mpcFile = mpcFile + "mpc.bus = [";
    let busNums = new Map();
    console.log(allNodes);
    for (let i in allNodes) {
	let baseVobj = model.getTargets([allNodes[i]], "TopologicalNode.BaseVoltage")[0];
	let baseV = getAttrDefault(baseVobj, "cim:BaseVoltage.nominalVoltage", "0");
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
	mpcFile = mpcFile + baseV + "\t";      // baseKV
	mpcFile = mpcFile + 1 + "\t";        // zone
	mpcFile = mpcFile + 1.1 + "\t";      // Vmax
	mpcFile = mpcFile + 0.9 + ";\t";      // Vmin
	mpcFile = mpcFile + "\n";
	busNums.set(allNodes[i], busNum);
    }
    mpcFile = mpcFile + "];\n"
    // gen
    // The general handling of generators is not really clear in CIM: in particular,
    // a Generating Unit may contain more than one machine, and moreover the association
    // may involve both sync and async machines.
    // A first implementation will consider then a Generating Unit may contain
    // at most one machine and always assume that the machine is a synchronous one.
    // This simplification is also reported in the CIM Primer, when illustrating the
    // mapping fro CIM to PSS/E.
    let machines = model.getObjects(["cim:SynchronousMachine"])["cim:SynchronousMachine"];
    mpcFile = mpcFile + "mpc.gen = [";
    machines.forEach(function(machine) {
	let terminals = model.getTargets([machine], "ConductingEquipment.Terminals");
	let nodes = model.getTargets(terminals, "Terminal.TopologicalNode");
	let genUnit = model.getTargets([machine], "RotatingMachine.GeneratingUnit")[0];
	nodes.forEach(function(node) {
	    let busNum = busNums.get(node);
	    let p = getAttrDefault(machine, "cim:RotatingMachine.p", "0");
	    let q = getAttrDefault(machine, "cim:RotatingMachine.q", "0");
	    let qmax = getAttrDefault(machine, "cim:SynchronousMachine.maxQ", "0");
	    let qmin = getAttrDefault(machine, "cim:SynchronousMachine.minQ", "0");
	    let mbase = getAttrDefault(machine, "cim:SynchronousMachine.ratedS", baseMVA);
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
    });
    mpcFile = mpcFile + "];\n"
    // branch
    mpcFile = mpcFile + "mpc.branch = [";
    
    mpcFile = mpcFile + "];\n";
    
    console.log(mpcFile);
    
    return mpcFile;
		     
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
