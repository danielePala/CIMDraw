/*
 This file handles the export of CIM files to Matpower.

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

function exportToMatpower(model) {
    let mpcFile = "function mpc = cim\n";
    // some fixed values
    let version = "2";
    let baseMVA = "100";

    // if in node-breaker mode, we should execute the topology processor
    let allNodes = [];
    let tp = topologyProcessor(model);
    if (model.getMode() === "NODE_BREAKER") {
        allNodes = tp.calcTopology();
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
        let type = 1;
        let baseVobj = model.getTargets([allNodes[i]], "TopologicalNode.BaseVoltage")[0];
        let baseV = getAttrDefault(baseVobj, "cim:BaseVoltage.nominalVoltage", "0");
        let busNum = parseInt(i) + 1;
        let terms = tp.getTerminals(allNodes[i]); 
        let eqs = model.getTargets(terms, "Terminal.ConductingEquipment");
        let loads = eqs.filter(el => model.schema.isA("EnergyConsumer", el) === true);
        let shunts = eqs.filter(el => model.schema.isA("ShuntCompensator", el) === true);
        let gens = eqs.filter(el => model.schema.isA("SynchronousMachine", el) === true);
        let motors = eqs.filter(el => model.schema.isA("AsynchronousMachine", el) === true);
        let windings = model.getTargets(terms, "Terminal.TransformerEnd");
        let pd = 0.0;
        let qd = 0.0;
        let vm = 1.0;
        loads.forEach(function(load) {
            pd = pd + parseFloat(getAttrDefault(load, "cim:EnergyConsumer.p", "0.0"));
            qd = qd + parseFloat(getAttrDefault(load, "cim:EnergyConsumer.q", "0.0"));
        });
        motors.forEach(function(motor) {
            pd = pd + parseFloat(getAttrDefault(motor, "cim:RotatingMachine.p", "0"));
            qd = qd + parseFloat(getAttrDefault(motor, "cim:RotatingMachine.q", "0"));
        });
        let gs = 0.0;
        let bs = 0.0;
        shunts.forEach(function(shunt) {
            let numSections = parseFloat(getAttrDefault(shunt, "cim:ShuntCompensator.sections", "0.0"));
            let gSection = parseFloat(getAttrDefault(shunt, "cim:LinearShuntCompensator.gPerSection", "0.0"));
            let bSection = parseFloat(getAttrDefault(shunt, "cim:LinearShuntCompensator.bPerSection", "0.0"));
            gs = gs + (gSection * numSections);
            bs = bs + (bSection * numSections);
        });
        gs = gs * baseV * baseV;
        bs = bs * baseV * baseV;
        // If the node has generators or shunts with an associated regulating control,
        // then the node is of type PV. Otherwise it will be PQ.
        if (gens.length > 0 || shunts.length > 0) {
            if (shunts.length > 0) {
                let terminals = tp.getTerminals(shunts[0]); 
                let nodes = model.getTargets(terminals, "Terminal.TopologicalNode");
                let regCtrl = model.getTargets([shunts[0]],"RegulatingCondEq.RegulatingControl")[0];
                if (typeof(regCtrl) !== "undefined") {
                    type = 2;
                    let vTarget = getAttrDefault(regCtrl, "cim:RegulatingControl.targetValue", baseV); 
                    vm = parseFloat(vTarget) / parseFloat(baseV);
                }
            }
            if (gens.length > 0) {
                let regCtrl = model.getTargets([gens[0]],"RegulatingCondEq.RegulatingControl")[0];
                if (typeof(regCtrl) !== "undefined") {
                    type = 2;
                }
            }
        }
        // The slack node is the one with reference priority greater than zero.
        let slack = gens.filter(function(gen) {
            let refPrio = parseInt(getAttrDefault(gen, "cim:SynchronousMachine.referencePriority", "0"));
            return refPrio > 0;
        });
        if (slack.length > 0) {
            type = 3;
        }
        // If the node is connected to the primary winding of a two-winding
        // transformer then we must calculate the voltage angle displacement.
        if (windings.length > 0) {
            //console.log(windings);
        }
        mpcFile = mpcFile + busNum + "\t";   // bus_i
        mpcFile = mpcFile + type + "\t";     // type
        mpcFile = mpcFile + pd + "\t";       // Pd
        mpcFile = mpcFile + qd + "\t";       // Qd
        mpcFile = mpcFile + gs + "\t";       // Gs
        mpcFile = mpcFile + bs + "\t";       // Bs
        mpcFile = mpcFile + 1 + "\t";        // area
        mpcFile = mpcFile + vm + "\t";       // Vm 
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
        let terminals = tp.getTerminals(machine); 
        let nodes = model.getTargets(terminals, "Terminal.TopologicalNode");
        let genUnit = model.getTargets([machine], "RotatingMachine.GeneratingUnit")[0];
        let regCtrl = model.getTargets([machine],"RegulatingCondEq.RegulatingControl")[0];
        nodes.forEach(function(node) {
            let busNum = busNums.get(node);
            let p = parseFloat(getAttrDefault(machine, "cim:RotatingMachine.p", "0")) * (-1.0);
            let q = parseFloat(getAttrDefault(machine, "cim:RotatingMachine.q", "0")) * (-1.0);
            let qmax = getAttrDefault(machine, "cim:SynchronousMachine.maxQ", "0");
            let qmin = getAttrDefault(machine, "cim:SynchronousMachine.minQ", "0");
            let vg = 1.0;
            if (typeof(regCtrl) !== "undefined") {
                let baseVobj = model.getTargets([node], "TopologicalNode.BaseVoltage")[0];
                let baseV = getAttrDefault(baseVobj, "cim:BaseVoltage.nominalVoltage", "0");
                let vTarget = getAttrDefault(regCtrl, "cim:RegulatingControl.targetValue", baseV);
                vg = parseFloat(vTarget) / parseFloat(baseV);
            }
            let mbase = getAttrDefault(machine, "cim:SynchronousMachine.ratedS", baseMVA);
            let pmax = getAttrDefault(genUnit, "cim:GeneratingUnit.maxOperatingP", "0");
            let pmin = getAttrDefault(genUnit, "cim:GeneratingUnit.minOperatingP", "0");
            mpcFile = mpcFile + busNum + "\t"; // bus
            mpcFile = mpcFile + p + "\t";      // Pg
            mpcFile = mpcFile + q + "\t";      // Qg
            mpcFile = mpcFile + qmax + "\t";   // Qmax
            mpcFile = mpcFile + qmin + "\t";   // Qmin
            mpcFile = mpcFile + vg + "\t";     // Vg 
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
        let terms = tp.getTerminals(acline); 
        let nodes = model.getTargets(terms, "Terminal.TopologicalNode");
        // TODO: a valid case is that conducting equipment can be connected in
        // one end and open in the other. In particular for an AC line segment,
        // where the reactive line charging can be significant, this is a
        // relevant case. In this case nodes.length === 1, and a "dummy"
        // second node must be created.
        if (nodes.length === 2) {
            // calculate base impedance: z_base = (v_base)^2/s_base
            let baseVobj = model.getTargets(nodes, "TopologicalNode.BaseVoltage")[0];
            let baseV = getAttrDefault(baseVobj, "cim:BaseVoltage.nominalVoltage", "0");
            let baseZ = (parseFloat(baseV) * parseFloat(baseV)) / parseFloat(baseMVA);
            let r = getAttrDefault(acline, "cim:ACLineSegment.r", "0");
            let x = getAttrDefault(acline, "cim:ACLineSegment.x", "0");
            let b = getAttrDefault(acline, "cim:ACLineSegment.bch", "0"); 
            let rpu = (parseFloat(r) / baseZ); 
            let xpu = (parseFloat(x) / baseZ);
            let bpu = (parseFloat(b) * baseZ);
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
        // A PowerTransformerEnd is associated with each Terminal of a
        // PowerTransformer.
        // The impedance values r, r0, x, and x0 of a PowerTransformerEnd
        // represents a star equivalent as follows:
        // 1) for a two Terminal PowerTransformer the high voltage
        //    PowerTransformerEnd has non zero values on r, r0,
        //    x, and x0 while the low voltage PowerTransformerEnd has
        //    zero values for r, r0, x, and x0.
        // 2) for a three Terminal PowerTransformer the three
        //    PowerTransformerEnds represents a star equivalent with
        //    each leg in the star represented by r, r0, x, and x0 values.
        // 3) for a PowerTransformer with more than three Terminals the
        //    PowerTransformerEnd impedance values cannot
        //    be used. Instead use the TransformerMeshImpedance or split
        //    the transformer into multiple PowerTransformers.
        let trafoUUID = trafo.attributes.getNamedItem("rdf:ID").value;
        let trafoEnds = model.getTargets([trafo], "PowerTransformer.PowerTransformerEnd");
        // process the two Terminal PowerTransformers
        if (trafoEnds.length === 2) {
            // find the high voltage PowerTransformerEnd
            let w1 = trafoEnds[0];
            let w2 = trafoEnds[1];
            let r = getAttrDefault(w1, "cim:PowerTransformerEnd.r", "0");
            let x = getAttrDefault(w1, "cim:PowerTransformerEnd.x", "0");
            if (r === "0" && x === "0") {
                w2 = trafoEnds[0];
                w1 = trafoEnds[1];
                r = getAttrDefault(w1, "cim:PowerTransformerEnd.r", "0");
                x = getAttrDefault(w1, "cim:PowerTransformerEnd.x", "0");
            }
            let b = getAttrDefault(w1, "cim:PowerTransformerEnd.b", "0");
            let w1Term = tp.getTerminals(w1); 
            let w1Node = model.getTargets(w1Term, "Terminal.TopologicalNode")[0];
            let w2Term = tp.getTerminals(w2); 
            let w2Node = model.getTargets(w2Term, "Terminal.TopologicalNode")[0];
            if (w1Term.length === 1 && w2Term.length === 1) {
                // calculate base impedance: z_base = (v_base)^2/s_base
                let baseVobj1 = model.getTargets([w1Node], "TopologicalNode.BaseVoltage")[0];
                let baseV1 = getAttrDefault(baseVobj1, "cim:BaseVoltage.nominalVoltage", "0");
                // get also the lv nominal voltage
                let baseVobj2 = model.getTargets([w2Node], "TopologicalNode.BaseVoltage")[0];
                let baseV2 = getAttrDefault(baseVobj2, "cim:BaseVoltage.nominalVoltage", "0");
                // get the rated voltage of the windings (can be different from the base voltages)
                let w1RefV = getAttrDefault(w1, "cim:PowerTransformerEnd.ratedU", baseV1);  
                let w2RefV = getAttrDefault(w2, "cim:PowerTransformerEnd.ratedU", baseV2);
                // calculate pu values
                let baseZ = (parseFloat(baseV1) * parseFloat(baseV1)) / parseFloat(baseMVA);
                let rpu = (parseFloat(r) / baseZ);
                let xpu = (parseFloat(x) / baseZ);
                let bpu = (parseFloat(b) * baseZ);
                // calculate nominal trafo ratio
                // must be calculated (in percent) as:
                // (RatioTapChanger.step - RatioTapChanger.neutralStep) * RatioTapChanger.stepVoltageIncrement
                // we may use the inverse depending on the position of the tap changer (primary vs secondary winding).
                let tc = model.getTargets([w1], "TransformerEnd.RatioTapChanger");
                let ratio = (parseFloat(baseV2)*parseFloat(w1RefV))/(parseFloat(baseV1)*parseFloat(w2RefV));
                let w2Side = false;
                if (tc.length === 0) {
                    tc = model.getTargets([w2], "TransformerEnd.RatioTapChanger");
                    w2Side = true;
                }
                if (tc.length > 0) {
                    let nStep = getAttrDefault(tc[0], "cim:TapChanger.neutralStep", "0");
                    let step = getAttrDefault(tc[0], "cim:TapChanger.step", nStep);
                    let stepVol = getAttrDefault(tc[0], "cim:RatioTapChanger.stepVoltageIncrement", "0");
                    let corr = (parseFloat(step) - parseFloat(nStep)) * parseFloat(stepVol);
                    corr = corr/100;
                    corr = 1.0 + corr;
                    if (w2Side === true) {
                        corr = 1/corr;
                    }
                    ratio = ratio * corr;
                } 
                let w1Clock = getAttrDefault(w1, "cim:PowerTransformerEnd.phaseAngleClock", "0");
                let w2Clock = getAttrDefault(w2, "cim:PowerTransformerEnd.phaseAngleClock", "0");
                let shift = 30.0 * (parseFloat(w1Clock) + parseFloat(w2Clock)); 
                mpcFile = mpcFile + busNums.get(w1Node) + "\t"; // “from” bus number
                mpcFile = mpcFile + busNums.get(w2Node) + "\t"; // “to” bus number
                mpcFile = mpcFile + rpu + "\t";                 // resistance (p.u.)
                mpcFile = mpcFile + xpu + "\t";                 // reactance (p.u.)
                mpcFile = mpcFile + bpu + "\t";                 // total line charging susceptance (p.u.)
                mpcFile = mpcFile + 0 + "\t";                   // MVA rating A (long term rating)
                mpcFile = mpcFile + 0 + "\t";                   // MVA rating B (short term rating)
                mpcFile = mpcFile + 0 + "\t";                   // MVA rating C (emergency rating)
                mpcFile = mpcFile + ratio + "\t";               // transformer off nominal turns ratio
                mpcFile = mpcFile + shift + "\t";               // transformer phase shift angle (degrees)
                mpcFile = mpcFile + 1 + "\t";                   // initial branch status, 1 = in-service, 0 = out-of-service
                mpcFile = mpcFile + "-360" + "\t";              // minimum angle difference
                mpcFile = mpcFile + "360" + ";\t";              // maximum angle difference
                mpcFile = mpcFile + "%Two-winding transformer (" + trafoUUID + ")";
                mpcFile = mpcFile + "\n";           
            }
        }
        // process the three Terminal PowerTransformers
        if (trafoEnds.length === 3) {
            let w1 = trafoEnds[0];
            let w2 = trafoEnds[1];
            let w3 = trafoEnds[2];
            let r1 = getAttrDefault(w1, "cim:PowerTransformerEnd.r", "0");
            let r2 = getAttrDefault(w2, "cim:PowerTransformerEnd.r", "0");
            let r3 = getAttrDefault(w3, "cim:PowerTransformerEnd.r", "0");
            let x1 = getAttrDefault(w1, "cim:PowerTransformerEnd.x", "0");
            let x2 = getAttrDefault(w2, "cim:PowerTransformerEnd.x", "0");
            let x3 = getAttrDefault(w3, "cim:PowerTransformerEnd.x", "0");
            let b1 = getAttrDefault(w1, "cim:PowerTransformerEnd.b", "0");
            let b2 = getAttrDefault(w2, "cim:PowerTransformerEnd.b", "0");
            let b3 = getAttrDefault(w3, "cim:PowerTransformerEnd.b", "0");
            // TODO: add g
            let term1 = tp.getTerminals(w1);
            let term2 = tp.getTerminals(w2);
            let term3 = tp.getTerminals(w3); 
            let node1 = model.getTargets(term1, "Terminal.TopologicalNode")[0];
            let node2 = model.getTargets(term2, "Terminal.TopologicalNode")[0];
            let node3 = model.getTargets(term3, "Terminal.TopologicalNode")[0];
            if (term1.length === 1 && term2.length === 1 && term3.length === 1) {
                // calculate base impedances: z_base = (v_base)^2/s_base
                let baseVobj1 = model.getTargets([node1], "TopologicalNode.BaseVoltage")[0];
                let baseVobj2 = model.getTargets([node2], "TopologicalNode.BaseVoltage")[0];
                let baseVobj3 = model.getTargets([node3], "TopologicalNode.BaseVoltage")[0];
                let baseV1 = getAttrDefault(baseVobj1, "cim:BaseVoltage.nominalVoltage", "0");
                let baseV2 = getAttrDefault(baseVobj2, "cim:BaseVoltage.nominalVoltage", "0");
                let baseV3 = getAttrDefault(baseVobj3, "cim:BaseVoltage.nominalVoltage", "0");
                // get the rated voltage of the windings (can be different from the base voltages)
                let w1RefV = getAttrDefault(w1, "cim:PowerTransformerEnd.ratedU", baseV1);  
                let w2RefV = getAttrDefault(w2, "cim:PowerTransformerEnd.ratedU", baseV2);
                let w3RefV = getAttrDefault(w3, "cim:PowerTransformerEnd.ratedU", baseV3);
                // calculate pu values
                let baseZ1 = (parseFloat(baseV1) * parseFloat(baseV1)) / parseFloat(baseMVA);
                let baseZ2 = (parseFloat(baseV2) * parseFloat(baseV2)) / parseFloat(baseMVA);
                let baseZ3 = (parseFloat(baseV3) * parseFloat(baseV3)) / parseFloat(baseMVA);
                let r1pu = (parseFloat(r1) / baseZ1);
                let r2pu = (parseFloat(r2) / baseZ2);
                let r3pu = (parseFloat(r3) / baseZ3);
                let x1pu = (parseFloat(x1) / baseZ1);
                let x2pu = (parseFloat(x2) / baseZ2);
                let x3pu = (parseFloat(x3) / baseZ3);
                let b1pu = (parseFloat(b1) * baseZ1);
                let b2pu = (parseFloat(b2) * baseZ2);
                let b3pu = (parseFloat(b3) * baseZ3);
                // Let's do a star-delta conversion in order to avoid creating a node for the star point
                let z1pu = math.complex(r1pu, x1pu);
                let z2pu = math.complex(r2pu, x2pu);
                let z3pu = math.complex(r3pu, x3pu);
                let numerator = math.add(math.add(math.multiply(z1pu, z2pu), math.multiply(z2pu, z3pu)), math.multiply(z3pu, z1pu));
                let z12pu = math.multiply(numerator, z3pu.inverse());
                let z23pu = math.multiply(numerator, z1pu.inverse());
                let z31pu = math.multiply(numerator, z2pu.inverse());
                // calculate nominal trafo ratios
                let ratio12 = (parseFloat(baseV2)*parseFloat(w1RefV))/(parseFloat(baseV1)*parseFloat(w2RefV));
                let ratio23 = (parseFloat(baseV3)*parseFloat(w2RefV))/(parseFloat(baseV2)*parseFloat(w3RefV));
                let ratio31 = (parseFloat(baseV1)*parseFloat(w3RefV))/(parseFloat(baseV3)*parseFloat(w1RefV));
                // calculate nominal trafo ratio
                // must be calculated (in percent) as:
                // (RatioTapChanger.step - RatioTapChanger.neutralStep) * RatioTapChanger.stepVoltageIncrement
                // while the sign depends on the position of the tap changer (primary vs secondary winding).
                /*let tc = model.getTargets([hvEnd], "TransformerEnd.RatioTapChanger");
                let corr = 1.0;
                if (tc.length === 0) {
                    tc = model.getTargets([lvEnd], "TransformerEnd.RatioTapChanger");
                    corr = -1.0;
                }
                if (tc.length > 0) {
                    let nStep = getAttrDefault(tc[0], "cim:TapChanger.neutralStep", "0");
                    let step = getAttrDefault(tc[0], "cim:TapChanger.step", nStep);
                    let stepVol = getAttrDefault(tc[0], "cim:RatioTapChanger.stepVoltageIncrement", "0");
                    corr = corr * (parseFloat(step) - parseFloat(nStep)) * parseFloat(stepVol);
                    corr = corr/100;
                } else {
                    corr = 0.0;
                }
                let ratio = 1.0 + corr;
                let hvClock = getAttrDefault(hvEnd, "cim:PowerTransformerEnd.phaseAngleClock", "0");
                let lvClock = getAttrDefault(lvEnd, "cim:PowerTransformerEnd.phaseAngleClock", "0");
                let shift = 30.0 * (parseFloat(hvClock) + parseFloat(lvClock)); */
                
                // We need to create 3 transformers, one for each side of the delta equivalent
                // branch 1-2
                mpcFile = mpcFile + busNums.get(node1) + "\t"; // “from” bus number
                mpcFile = mpcFile + busNums.get(node2) + "\t"; // “to” bus number
                mpcFile = mpcFile + math.re(z12pu) + "\t";     // resistance (p.u.)
                mpcFile = mpcFile + math.im(z12pu) + "\t";     // reactance (p.u.)
                mpcFile = mpcFile + b1pu + "\t";               // total line charging susceptance (p.u.)
                mpcFile = mpcFile + 0 + "\t";                  // MVA rating A (long term rating)
                mpcFile = mpcFile + 0 + "\t";                  // MVA rating B (short term rating)
                mpcFile = mpcFile + 0 + "\t";                  // MVA rating C (emergency rating)
                mpcFile = mpcFile + ratio12 + "\t";            // transformer off nominal turns ratio
                mpcFile = mpcFile + 0/*shift*/ + "\t";         // transformer phase shift angle (degrees)
                mpcFile = mpcFile + 1 + "\t";                  // initial branch status, 1 = in-service, 0 = out-of-service
                mpcFile = mpcFile + "-360" + "\t";             // minimum angle difference
                mpcFile = mpcFile + "360" + ";\t";             // maximum angle difference
                mpcFile = mpcFile + "%Three-winding transformer branch 1-2 (" + trafoUUID + ")";
                mpcFile = mpcFile + "\n";
                // branch 2-3
                mpcFile = mpcFile + busNums.get(node2) + "\t"; // “from” bus number
                mpcFile = mpcFile + busNums.get(node3) + "\t"; // “to” bus number
                mpcFile = mpcFile + math.re(z23pu) + "\t";     // resistance (p.u.)
                mpcFile = mpcFile + math.im(z23pu) + "\t";     // reactance (p.u.)
                mpcFile = mpcFile + b2pu + "\t";               // total line charging susceptance (p.u.)
                mpcFile = mpcFile + 0 + "\t";                  // MVA rating A (long term rating)
                mpcFile = mpcFile + 0 + "\t";                  // MVA rating B (short term rating)
                mpcFile = mpcFile + 0 + "\t";                  // MVA rating C (emergency rating)
                mpcFile = mpcFile + ratio23 + "\t";            // transformer off nominal turns ratio
                mpcFile = mpcFile + 0/*shift*/ + "\t";         // transformer phase shift angle (degrees)
                mpcFile = mpcFile + 1 + "\t";                  // initial branch status, 1 = in-service, 0 = out-of-service
                mpcFile = mpcFile + "-360" + "\t";             // minimum angle difference
                mpcFile = mpcFile + "360" + ";\t";             // maximum angle difference
                mpcFile = mpcFile + "%Three-winding transformer branch 2-3 (" + trafoUUID + ")";
                mpcFile = mpcFile + "\n";
                // branch 3-1
                mpcFile = mpcFile + busNums.get(node3) + "\t"; // “from” bus number
                mpcFile = mpcFile + busNums.get(node1) + "\t"; // “to” bus number
                mpcFile = mpcFile + math.re(z31pu) + "\t";     // resistance (p.u.)
                mpcFile = mpcFile + math.im(z31pu) + "\t";     // reactance (p.u.)
                mpcFile = mpcFile + b3pu + "\t";               // total line charging susceptance (p.u.)
                mpcFile = mpcFile + 0 + "\t";                  // MVA rating A (long term rating)
                mpcFile = mpcFile + 0 + "\t";                  // MVA rating B (short term rating)
                mpcFile = mpcFile + 0 + "\t";                  // MVA rating C (emergency rating)
                mpcFile = mpcFile + ratio31 + "\t";            // transformer off nominal turns ratio
                mpcFile = mpcFile + 0/*shift*/ + "\t";         // transformer phase shift angle (degrees)
                mpcFile = mpcFile + 1 + "\t";                  // initial branch status, 1 = in-service, 0 = out-of-service
                mpcFile = mpcFile + "-360" + "\t";             // minimum angle difference
                mpcFile = mpcFile + "360" + ";\t";             // maximum angle difference
                mpcFile = mpcFile + "%Three-winding transformer branch 3-1 (" + trafoUUID + ")";
                mpcFile = mpcFile + "\n";           
            }
        }
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
