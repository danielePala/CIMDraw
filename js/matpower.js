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
    mpcFile = mpcFile + "% MATPOWER Case Format : Version 2\n";
    mpcFile = mpcFile + "mpc.version = '" + version + "';\n";
    // baseMVA
    mpcFile = mpcFile + "% system MVA base\n";
    mpcFile = mpcFile + "mpc.baseMVA = " + baseMVA + ";\n";
    // bus
    mpcFile = mpcFile + "% bus data\n";
    mpcFile = mpcFile + "mpc.bus = [\n";
    mpcFile = mpcFile + "%bus_i\ttype\tPd\tQd\tGs\tBs\tarea\tVm\tVa\tbaseKV\tzone\tVmax\tVmin\n";
    let busNums = new Map();
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
	mpcFile = mpcFile + baseV + "\t";    // baseKV
	mpcFile = mpcFile + 1 + "\t";        // zone
	mpcFile = mpcFile + 1.1 + "\t";      // Vmax
	mpcFile = mpcFile + 0.9 + ";\t";     // Vmin
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
    // mapping from CIM to PSS/E.
    let machines = model.getObjects(["cim:SynchronousMachine"])["cim:SynchronousMachine"];
    mpcFile = mpcFile + "% generator data\n";
    mpcFile = mpcFile + "mpc.gen = [\n";
    mpcFile = mpcFile + "%bus\tPg\tQg\tQmax\tQmin\tVg\tmBase\tstatus\tPmax\tPmin\tPc1\tPc2\tQc1min\tQc1max\tQc2min\tQc2max\tramp_agc\tramp_10\tramp_30\tramp_q\tapf\n";
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
	    mpcFile = mpcFile + p + "\t";      // Pg
	    mpcFile = mpcFile + q + "\t";      // Qg
	    mpcFile = mpcFile + qmax + "\t";   // Qmax
	    mpcFile = mpcFile + qmin + "\t";   // Qmin
	    mpcFile = mpcFile + 1 + "\t";      // Vg
	    mpcFile = mpcFile + mbase + "\t";  // mBase
	    mpcFile = mpcFile + 1 + "\t";      // status
	    mpcFile = mpcFile + pmax + "\t";   // Pmax
	    mpcFile = mpcFile + pmin + "\t";   // Pmin
	    mpcFile = mpcFile + 0 + "\t";      // Pc1
	    mpcFile = mpcFile + 0 + "\t";      // Pc2
	    mpcFile = mpcFile + 0 + "\t";      // Qc1min
	    mpcFile = mpcFile + 0 + "\t";      // Qc1max
	    mpcFile = mpcFile + 0 + "\t";      // Qc2min
	    mpcFile = mpcFile + 0 + "\t";      // Qc2max
	    mpcFile = mpcFile + 0 + "\t";      // ramp_agc
	    mpcFile = mpcFile + 0 + "\t";      // ramp_10
	    mpcFile = mpcFile + 0 + "\t";      // ramp_30
	    mpcFile = mpcFile + 0 + "\t";      // ramp_q
	    mpcFile = mpcFile + 0 + ";\t";     // apf
	    mpcFile = mpcFile + "\n";
	});
    });
    mpcFile = mpcFile + "];\n"
    // branch (lines)
    let aclines = model.getObjects(["cim:ACLineSegment"])["cim:ACLineSegment"];
    mpcFile = mpcFile + "% branch data\n";
    mpcFile = mpcFile + "mpc.branch = [\n";
    mpcFile = mpcFile + "%fbus\ttbus\tr\tx\tb\trateA\trateB\trateC\tratio\tangle\tstatus\tangmin\tangmax\n";
    aclines.forEach(function(acline) {
	let terms = model.getTargets([acline], "ConductingEquipment.Terminals");
	let nodes = model.getTargets(terms, "Terminal.TopologicalNode");
	if (nodes.length === 2) {
	    // calculate base impedance: z_base = (v_base)^2/s_base
	    let baseVobj = model.getTargets(nodes, "TopologicalNode.BaseVoltage")[0];
	    let baseV = getAttrDefault(baseVobj, "cim:BaseVoltage.nominalVoltage", "0");
	    let baseZ = (parseFloat(baseV) * parseFloat(baseV)) / parseFloat(baseMVA);
	    let r = getAttrDefault(acline, "cim:ACLineSegment.r", "0");
	    let x = getAttrDefault(acline, "cim:ACLineSegment.x", "0");
	    let b = getAttrDefault(acline, "cim:ACLineSegment.bch", "0"); 
	    let rpu = parseFloat(r) / baseZ; 
	    let xpu = parseFloat(x) / baseZ;
	    let bpu = parseFloat(b) / baseZ;
	    mpcFile = mpcFile + busNums.get(nodes[0]) + "\t"; // “from” bus number
	    mpcFile = mpcFile + busNums.get(nodes[1]) + "\t"; // “to” bus number
	    mpcFile = mpcFile + rpu + "\t";                   // resistance (p.u.)
	    mpcFile = mpcFile + xpu + "\t";                   // reactance (p.u.)
	    mpcFile = mpcFile + bpu + "\t";                   // total line charging susceptance (p.u.)
	    mpcFile = mpcFile + 0 + "\t";                     // MVA rating A (long term rating)
	    mpcFile = mpcFile + 0 + "\t";                     // MVA rating B (short term rating)
	    mpcFile = mpcFile + 0 + "\t";                     // MVA rating C (emergency rating)
	    mpcFile = mpcFile + 0 + "\t";                     // transformer off nominal turns ratio
	    mpcFile = mpcFile + 0 + "\t";                     // transformer phase shift angle (degrees)
	    mpcFile = mpcFile + 1 + "\t";                     // initial branch status, 1 = in-service, 0 = out-of-service
	    mpcFile = mpcFile + "-360" + "\t";                // minimum angle difference
	    mpcFile = mpcFile + "360" + ";\t";                // maximum angle difference
	    mpcFile = mpcFile + "\n";
	}
    });
    // branch (transformers)
    let trafos = model.getObjects(["cim:PowerTransformer"])["cim:PowerTransformer"];
    trafos.forEach(function(trafo) {
	// A PowerTransformerEnd is associated with each Terminal of a PowerTransformer.
	// The impedance values r, r0, x, and x0 of a PowerTransformerEnd represents a star equivalent as follows:
	// 1) for a two Terminal PowerTransformer the high voltage PowerTransformerEnd has non zero values on r, r0,
	//    x, and x0 while the low voltage PowerTransformerEnd has zero values for r, r0, x, and x0.
	// 2) for a three Terminal PowerTransformer the three PowerTransformerEnds represents a star equivalent with
	//    each leg in the star represented by r, r0, x, and x0 values.
	// 3) for a PowerTransformer with more than three Terminals the PowerTransformerEnd impedance values cannot
	//    be used. Instead use the TransformerMeshImpedance or split the transformer into multiple PowerTransformers.
	
    });
    
    mpcFile = mpcFile + "];\n";
    
    
    
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
