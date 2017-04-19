/*
 Fundamental functions to load and manipulate CIM RDF/XML files.

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

"use strict";

function cimModel() {
    // The CIM XML namespace used by CIMDraw. This is the CIM 16 namespace,
    // as used by ENTSO-E CGMES.
    const cimNS = "http://iec.ch/TC57/2013/CIM-schema-cim16#";
    // The ENTSO-E namespace
    const entsoeNS = "http://entsoe.eu/CIM/SchemaExtension/3/1#";
    // The model description namespace, for CGMES files
    const modelNS = "http://iec.ch/TC57/61970-552/ModelDescription/1#";
    // The RDF namespace
    const rdfNS = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
    // The Eqipment namespace.
    const eqNS = "http://entsoe.eu/CIM/EquipmentShortCircuit/3/1";
    // The Diagram Layout namespace.
    const dlNS = "http://entsoe.eu/CIM/DiagramLayout/3/1";
    // The State Variables namespace.
    const svNS = "http://entsoe.eu/CIM/StateVariables/4/1";
    // An empty CIM file, used when creating a new file.
    const emptyFile = "<?xml version=\"1.0\" encoding=\"UTF-8\" ?>" +
	  "<rdf:RDF xmlns:cim=\""+ cimNS + "\" xmlns:entsoe=\"" + entsoeNS +
	  "\" xmlns:md=\"" + modelNS + "\" xmlns:rdf=\"" + rdfNS + "\">" +
	  "</rdf:RDF>";
    // CIM data for the current file.
    // 'all' is used for plain RDF/XML files
    // 'eq' is for the equipment file
    // 'dl' is for the diagram layout file
    let data = {all: undefined, eq:undefined, dl:undefined, sv: undefined};
    // CIM schema data.
    // 'EQ' is for the equipment schema
    // 'DL' is for the diagram layout schema  
    let schemaData = {EQ: null, DL: null, SV: null};
    // CGMES schema files
    const rdfsEQ = "rdf-schema/EquipmentProfileCoreShortCircuitOperationRDFSAugmented-v2_4_15-16Feb2016.rdf";
    const rdfsDL = "rdf-schema/DiagramLayoutProfileRDFSAugmented-v2_4_15-16Feb2016.rdf";
    const rdfsSV = "rdf-schema/StateVariablesProfileRDFSAugmented-v2_4_15-16Feb2016.rdf"
    // A map of schema link names vs inverse schema link name.
    // Used for faster lookup.
    let schemaInvLinksMap = new Map();

    // Parse and load an ENTSO-E CIM file. Only the EQ and DL profiles
    // are parsed. The given callback is called after having loaded
    // the model.
    // This is a 'private' function (not visible in the model object).
    function parseZip(callback, zip) {
	let parser = new DOMParser();
	let zipFilesProcessed = 0;
	let zipFilesTotal = 0; 
	function success(content) {
	    zipFilesProcessed = zipFilesProcessed + 1;
	    if (typeof(data.eq) === "undefined" ||
		typeof(data.dl) === "undefined") {
		let parsed = parser.parseFromString(content, "application/xml");
		let fullModel = [].filter.call(
		    parsed.children[0].children, function(el) {
			return el.nodeName === "md:FullModel";
		    })[0];
		let profile = model.getAttribute(fullModel, "md:Model.profile");
		if (profile.textContent.includes("Equipment")) {
		    data.eq = parsed;
		}
		if (profile.textContent.includes("DiagramLayout")) {
		    data.dl = parsed;
		}
	    }
	    // at the end we need to have at least the EQ file
	    if (typeof(data.eq) !== "undefined" &&
		zipFilesProcessed === zipFilesTotal) {
		if (typeof(data.dl) === "undefined") {
		    data.dl = createNewDLDocument(data.eq);
		}
		buildModel(callback);
	    }
	};

	return function parseZip(zip) {
	    zipFilesTotal = Object.keys(zip.files).length;
	    zip.forEach(function (relativePath, zipEntry) {
		zipEntry.async("string")
		    .then(success);	
	    });
	};
    };

    // Create a new equipment document, in case the input
    // CGMES file is a plain XML file.
    // This is a 'private' function (not visible in the model object).
    function createNewEQDocument() {
	let parser = new DOMParser();
	let empty = parser.parseFromString(emptyFile, "application/xml");
	// create 'FullModel' element
	let eqModelDesc = document.createElementNS(modelNS, "md:FullModel");
	empty.children[0].appendChild(eqModelDesc);
	let eqModelDescID = eqModelDesc.setAttribute("rdf:about", "urn:uuid:" + generateUUID().substring(1));
	// set the profile link
	model.setAttribute(eqModelDesc, "md:Model.profile", eqNS);
	return empty;
    };
    
    // Create a new diagram layout document, in case the input
    // CGMES file contains only the EQ profile.
    // This is a 'private' function (not visible in the model object).
    function createNewDLDocument(eqDoc) {
	let parser = new DOMParser();
	let empty = parser.parseFromString(emptyFile, "application/xml");
	// create 'FullModel' element
	let dlModelDesc = document.createElementNS(modelNS, "md:FullModel");
	empty.children[0].appendChild(dlModelDesc);
	let dlModelDescID = dlModelDesc.setAttribute("rdf:about", "urn:uuid:" + generateUUID().substring(1));
	// set the profile link
	model.setAttribute(dlModelDesc, "md:Model.profile", dlNS);
	// set model dependency
	let eqModelDesc = [].filter.call(
	    eqDoc.children[0].children, function(el) {
		return el.nodeName === "md:FullModel";
	    })[0];
	let dlModelDep = dlModelDesc.ownerDocument.createElement("md:Model.DependentOn");
	let dlModelDepVal = dlModelDep.setAttribute("rdf:resource", eqModelDesc.attributes.getNamedItem("rdf:about").value);
	dlModelDesc.appendChild(dlModelDep);
	return empty;
    };

    function cgmesDocument(ns, deps) {
	let parser = new DOMParser();
	let empty = parser.parseFromString(emptyFile, "application/xml");
	// create 'FullModel' element
	let modelDesc = document.createElementNS(modelNS, "md:FullModel");
	empty.children[0].appendChild(modelDesc);
	let modelDescID = modelDesc.setAttribute("rdf:about", "urn:uuid:" + generateUUID().substring(1));
	// set the profile link
	model.setAttribute(modelDesc, "md:Model.profile", ns);
	// set model dependency
	deps.forEach(function(dep) {
	    let depModelDesc = [].filter.call(
		dep.children[0].children, function(el) {
		    return el.nodeName === "md:FullModel";
		})[0];
	    let modelDep = modelDesc.ownerDocument.createElement("md:Model.DependentOn");
	    let modelDepVal = modelDep.setAttribute("rdf:resource", depModelDesc.attributes.getNamedItem("rdf:about").value);
	    modelDesc.appendChild(modelDep);
	});
	return empty;
    };

    
    // Build initial model data structures and call a user callback.
    // This is a 'private' function (not visible in the model object).
    function buildModel(callback) {
	// build a map (UUID)->(object) and a map
	// (link name, target UUID)->(source objects)
	let allObjects = getAllObjects();
	for (let i in allObjects) {
	    let object = allObjects[i];
	    if (typeof(object.attributes) === "undefined") {
		continue;
	    }
	    if (object.attributes.getNamedItem("rdf:ID") === null) {
		continue;
	    }
	    model.dataMap.set("#" + object.attributes.getNamedItem("rdf:ID").value, object);
	    if (typeof(object.attributes) !== "undefined") {
		let links = model.getLinks(object);
		for (let link of links) {
 		    let key = link.localName + link.attributes[0].value;
		    let val = model.linksMap.get(key);
		    if (typeof(val) === "undefined") {
			model.linksMap.set(key, [object]);
		    } else {
			val.push(object);
		    }
		}   
	    } 
	}
	
	// let's read schema files, if necessary
	if (schemaData["EQ"] === null) {
	    d3.xml(rdfsEQ, function(error, schemaDataEQ) {
		schemaData["EQ"] = schemaDataEQ;
		populateInvLinkMap(schemaData["EQ"]);
		d3.xml(rdfsDL, function(schemaDataDL) {
		    schemaData["DL"] = schemaDataDL;
		    populateInvLinkMap(schemaData["DL"]);
		    d3.xml(rdfsSV, function(schemaDataSV) {
			schemaData["SV"] = schemaDataSV;
			populateInvLinkMap(schemaData["SV"]);
			callback(null);
		    });
		});
	    });
	} else {
	    callback(null);
	}

	function populateInvLinkMap(schemaData) {
	    let allSchemaObjects = schemaData.children[0].children;
	    for (let i in allSchemaObjects) {
		let schemaObject = allSchemaObjects[i];
		if (typeof(schemaObject.children) === "undefined") {
		    continue;
		}
		let invRoleName = [].filter.call(schemaObject.children, function(el) {
		    return el.nodeName === "cims:inverseRoleName";
		})[0];
		if (typeof(invRoleName) !== "undefined") {
		    schemaInvLinksMap.set(
			schemaObject.attributes[0].value.substring(1),
			invRoleName.attributes[0].value.substring(1));
		}
	    }
	};
    };

    // Get all objects (doesn't filter by diagram).
    // This is a 'private' function (not visible in the model object).
    function getAllObjects() {
	let ret = [];
	for (let i of Object.keys(data)) {
	    if (typeof(data[i]) !== "undefined") {
		ret = ret.concat([...data[i].children[0].children]);
	    }
	}
	return ret;
    };

    // Add a terminal to a given object.
    // This is a 'private' function (not visible in the model object).
    function createTerminal(object) {
	let term = model.cimObject("cim:Terminal");
	addLink(term, "cim:Terminal.ConductingEquipment", object);
	return term;
    };

    // Get the document for the given CIM object.
    // This is a 'private' function (not visible in the model object).
    function getDocument(cimObjName) {
	if (typeof(data.all) !== "undefined") {
	    return data.all;
	}
	// can be Diagram Layout or Equipment
	if (["cim:Diagram", "cim:DiagramObject", "cim:DiagramObjectPoint"].indexOf(cimObjName) > -1) {
	    return data.dl;
	} else {
	    return data.eq;
	}
    };

    // Get all the superclasses for a given type.
    // This function works for any profile, since
    // it is based on the getSchemaObject function.
    // This is a 'private' function (not visible in the model object).
    function getAllSuper(type) {
	let allSuper = [];
	let object = model.getSchemaObject(type);
	// handle unknown objects 
	if (object === null) {
	    return allSuper;
	}
	let aSuper = [].filter.call(object.children, function(el) {
	    return el.nodeName === "rdfs:subClassOf";
	})[0];
	if (typeof(aSuper) !== "undefined") {
	    let aSuperName = aSuper.attributes[0].value.substring(1);
		allSuper.push(aSuperName);
	    allSuper = allSuper.concat(getAllSuper(aSuperName));
	}
	return allSuper;
    };

    // Check if a link is set in the correct way,
    // otherwise reverse it.
    function checkLink(source, linkName) {
	let ret = linkName;
	let schLink = model.getAllSchemasLink(source.localName, linkName.split(":")[1]);
	if (typeof(schLink) !== "undefined") {
	    let linkUsed = [].filter.call(schLink.children, function(el) {
		return el.nodeName === "cims:AssociationUsed";
	    })[0];
	    if (linkUsed.textContent === "No") {
		let invLinkName = schemaInvLinksMap.get(linkName.split(":")[1]);
		ret = "cim:" + invLinkName;
	    } 
	}
	return ret;
    };

    // Add a new link to a given source.
    // This is a 'private' function (not visible in the model object).
    function addLink(source, linkName, target) {
	// see if the link is already set
	let targets = model.getTargets([source], linkName);
	if (targets.length > 0) {
	    return;
	}
	let link = source.ownerDocument.createElementNS(cimNS, linkName);
	let linkValue = source.ownerDocument.createAttribute("rdf:resource");
	linkValue.nodeValue = "#";
	link.setAttributeNode(linkValue);
	source.appendChild(link);
	// set the new value
	link.attributes[0].value = "#" + target.attributes.getNamedItem("rdf:ID").value;
	
	let key = link.localName + link.attributes[0].value;
	let val = model.linksMap.get(key);
	if (typeof(val) === "undefined") {
	    model.linksMap.set(key, [source]);
	} else {
	    val.push(source);
	}
	model.trigger("addLink", source, linkName, target);
    };

    // Returns all relations between given sources and other objects,
    // via a given link name. The inverse link name should be supplied too.
    // It doesn't filter by diagram.
    // This is a 'private' function (not visible in the model object).
    function getGraph(sources, linkName) {
	let invLinkName = schemaInvLinksMap.get(linkName);
	let resultKeys = new Map();
	let result = [];
	for (let source of sources) {
	    let srcUUID = source.attributes.getNamedItem("rdf:ID").value;
	    let links = model.getLink(source, "cim:" + linkName);
	    for (let link of links) {
		let target = model.dataMap.get(
		    link.attributes.getNamedItem("rdf:resource").value);
		if (typeof(target) !== "undefined") {
		    let dstUUID = target.attributes.getNamedItem("rdf:ID").value;
		    result.push({
			source: source,
			target: target
		    });
		    resultKeys.set(srcUUID + dstUUID, 1);
		}
	    }
	    // handle inverse relation
	    let targets = model.linksMap.get(invLinkName + "#" + srcUUID);
	    if (typeof(targets) === "undefined") {
		continue;
	    }
	    for (let target of targets) {
		let dstUUID = target.attributes.getNamedItem("rdf:ID").value;
		if (typeof(resultKeys.get(srcUUID + dstUUID)) === "undefined") {
		    result.push({
			source: source,
			target: target
		    });
		}   
	    }
	}
	return result;
    };

    // Get a graph of objects and DiagramObjects, for each object
    // that have at least one DiagramObject in the current diagram.
    // If an array of objects is given as argument, only the
    // subgraph for that objects is returned.
    // This is a 'private' function (not visible in the model object).
    function getDiagramObjectGraph(identObjs) {
	let ioEdges = [];
	if (arguments.length === 0) {
	    let allDiagramObjects = []; 
	    if (typeof(model.activeDiagram) !== "undefined") {
		allDiagramObjects = model.getTargets(
		    [model.activeDiagram],
		    "Diagram.DiagramElements");
	    }
	    ioEdges = getGraph(
		allDiagramObjects,
		"DiagramObject.IdentifiedObject",
		"IdentifiedObject.DiagramObjects");
	} else {
	    if (typeof(model.activeDiagram) !== "undefined") {
		let allDiagramObjects = model.getTargets(
		    identObjs,
		    "IdentifiedObject.DiagramObjects");
		allDiagramObjects = getGraph(
		    allDiagramObjects,
		    "DiagramObject.Diagram",
		    "Diagram.DiagramElements")
		    .filter(el => el.target === model.activeDiagram)
		    .map(el => el.source);
		ioEdges = getGraph(
		    allDiagramObjects,
		    "DiagramObject.IdentifiedObject",
		    "IdentifiedObject.DiagramObjects");
	    }
	}
	return ioEdges;
    };

    // Get a graph of equipments and terminals, for each equipment
    // that have at least one DiagramObject in the current diagram.
    // If an array of equipments is given as argument, only the
    // subgraph for that equipments is returned.
    // This is a 'private' function (not visible in the model object).
    function getConductingEquipmentGraph(identObjs) {
	let ceEdges = [];
	if (arguments.length === 0) {
	    if (typeof(model.activeDiagram) !== "undefined") {
		let ioEdges = getDiagramObjectGraph();
		let graphicObjects = ioEdges.map(el => el.target);
		ceEdges = getGraph(
		    graphicObjects,
		    "ConductingEquipment.Terminals",
		    "Terminal.ConductingEquipment");
	    } 
	} else {
	    if (typeof(model.activeDiagram) !== "undefined") {
		let ioEdges = getDiagramObjectGraph(identObjs);
		let graphicObjects = ioEdges.map(el => el.target);
		ceEdges = getGraph(
		    graphicObjects,
		    "ConductingEquipment.Terminals",
		    "Terminal.ConductingEquipment");
	    } else {
		ceEdges = getGraph(
		    identObjs,
		    "ConductingEquipment.Terminals",
		    "Terminal.ConductingEquipment");
	    }
	}
	return ceEdges;
    };

    // Generate a new random UUID.
    // This is a 'private' function (not visible in the model object).
    function generateUUID() {
	let d = new Date().getTime();
	let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	    let r = (d + Math.random()*16)%16 | 0;
	    d = Math.floor(d/16);
	    return (c=='x' ? r : (r&0x3|0x8)).toString(16);
	});
	return "_" + uuid;
    };
    
    // This is the fundamental object used by CIMDraw to manipulate CIM files.
    let model = {
	// The name of the CIM file which is actually loaded.
	fileName: null,
	dataMap: new Map(),
	linksMap: new Map(),
	// The name of the CIM diagram which is actually loaded.
	activeDiagramName: "none",
	// Loads a CIM file from the local filesystem. If reader is null, then
	// it creates a new empty file. After loading the file, the passed
	// callback is called. The input file can be a plain RDF/XML file
	// or a zipped file, conforming to ENTSO-E format (i.e. the
	// zipped file contains many XML files, one for each profile
	// (EQ, DL, TP etc).
	load(file, reader, callback) {
	    // should we create a new empty file?
	    if (reader === null) {
		let parser = new DOMParser();
		data.all = parser.parseFromString(emptyFile, "application/xml");
		model.fileName = file.name;
		buildModel(callback);
		return;
	    }
	    // see if this file is already loaded
	    if (model.fileName !== file.name) {
		reader.onload = function(e) {
                    let parser = new DOMParser();
		    let cimXML = reader.result;
		    data.all = parser.parseFromString(cimXML, "application/xml");
		    buildModel(callback);
		}
		model.fileName = file.name;
		if (file.name.endsWith(".zip")) {
		    // zip file loading (ENTSO-E).
		    JSZip.loadAsync(file).then(parseZip(callback));
		} else {
		    // plain RDF/XML file loading
		    reader.readAsText(file);
		}
	    } else {
		callback(null);
	    }
	},

	// Load a CIM file from a remote location. After loading the file, the
	// passed callback is called. The input file must be a plain
	// RDF/XML file.
	loadRemote(fileName, callback) {
	    if (model.fileName !== decodeURI(fileName).substring(1)) {
		model.fileName = decodeURI(fileName).substring(1);
		d3.xml(fileName, function(error, data) {
		    if (error !== null) {
			callback(error);
			return;
		    }
		    data.all = data;
		    buildModel(callback);
		});
	    } else {
		callback(null);
	    }
	},

	// Serialize the current CIM file as a plain XML.
	save() {
	    let oSerializer = new XMLSerializer();
	    let sXML = "";
	    if (typeof(data.all) !== "undefined") {
		sXML = oSerializer.serializeToString(data.all);
		return sXML;
	    } else {
		let parser = new DOMParser();
		let all = parser.parseFromString(emptyFile, "application/xml");
		for (let datum of data.eq.children[0].children) {
		    all.children[0].appendChild(datum.cloneNode(true));
		}
		for (let datum of data.dl.children[0].children) {
		    all.children[0].appendChild(datum.cloneNode(true));
		}
		sXML = oSerializer.serializeToString(all);
		data.eq = undefined;
		data.dl = undefined;
		data.all = all;
	    }
	    return sXML;
	},

	// Serialize the current CIM file in CGMES format.
	// Currently limited to EQ and DL profiles.
	saveAsCGMES() {
	    let oSerializer = new XMLSerializer();
	    let zip = new JSZip();
	    if (typeof(data.all) !== "undefined") {
		let all = data.all.children[0].children;
		// set links according to CGMES schemas
		let linksToChange = [];
		for (let datum of all) {
		    let links = model.getLinks(datum);
		    links.forEach(function(link) {
			let linkToUse = checkLink(datum, link.nodeName);
			if (linkToUse !== link.nodeName) {
			    let targets = model.getTargets([datum], link.localName);
			    targets.forEach(function(target) {
				linksToChange.push({s: target, l: linkToUse, t: datum});
			    });
			}
		    });
		}
		linksToChange.forEach(function(linkToChange) {
		    model.setLink(linkToChange.s, linkToChange.l, linkToChange.t);
		});
		// create EQ file
		let eqDoc = profile("EQ", eqNS, all, []);
		// create DL file
		let dlDoc = profile("DL", dlNS, all, [eqDoc]);
		// create SV file
		let svDoc = profile("SV", svNS, all, [eqDoc]);
		zip.file("EQ.xml", oSerializer.serializeToString(eqDoc));
		zip.file("DL.xml", oSerializer.serializeToString(dlDoc));
		zip.file("SV.xml", oSerializer.serializeToString(svDoc));
		data.all = undefined;
		data.eq = eqDoc;
		data.dl = dlDoc;
		data.sv = svDoc;
	    } else {
		zip.file("EQ.xml", oSerializer.serializeToString(data.eq));
		zip.file("DL.xml", oSerializer.serializeToString(data.dl));
	    }
	    return zip.generateAsync({type:"blob", compression: "DEFLATE"});

	    function profile(name, ns, data, deps) {
		let all = [].filter.call(data, function(el) {
		    let obj = model.getSchemaObject(el.localName, name);
		    return (obj !== null); 
		}).slice();
		let doc = cgmesDocument(ns, deps);
		populateProfile(doc, all, name);
		return doc;
	    };
	    
	    function populateProfile(doc, data, profile) {
		for (let datum of data) {
		    // delete non-profile attributes
		    let attrs = model.getAttributes(datum);
		    attrs.forEach(function(attr) {
			let schAttr = model.getSchemaAttribute(datum.localName, attr.localName, profile);
			if (typeof(schAttr) === "undefined") {
			    attr.remove();
			}
		    });
		    // delete non-profile links
		    let links = model.getLinks(datum);
		    links.forEach(function(link) {		  
			let schLink = model.getSchemaLink(datum.localName, link.localName, profile);
			if (typeof(schLink) === "undefined") {
			    link.remove();
			}
		    });
		    doc.children[0].appendChild(datum);
		}
	    };
	},

	// Serialize the current diagram. Nodes are cloned, otherwise they would
	// be removed from the original document.
	export() {
	    let parser = new DOMParser();
	    let data = parser.parseFromString(emptyFile, "application/xml");
	    // fill the file
	    data.children[0].appendChild(model.activeDiagram.cloneNode(true));
	    let allDiagramObjects = model.getTargets(
		[model.activeDiagram],
		"Diagram.DiagramElements");
	    for (let diagramObject of allDiagramObjects) {
		data.children[0].appendChild(diagramObject.cloneNode(true));
	    }
	    let allEquipments = model.getTargets(
		allDiagramObjects,
		"DiagramObject.IdentifiedObject");
	    for (let equipment of allEquipments) {
		data.children[0].appendChild(equipment.cloneNode(true));
	    }
	    let allDiagramObjectPoints = model.getTargets(
		allDiagramObjects,
		"DiagramObject.DiagramObjectPoints");
	    for (let diagramObjectPoint of allDiagramObjectPoints) {
		data.children[0].appendChild(diagramObjectPoint.cloneNode(true));
	    }
	    let allTerminals = model.getTerminals(allEquipments);
	    for (let terminal of allTerminals) {
		data.children[0].appendChild(terminal.cloneNode(true));
	    }
	    let allConnectivityNodes = model.getConnectivityNodes();
	    for (let connectivityNode of allConnectivityNodes) {
		data.children[0].appendChild(connectivityNode.cloneNode(true));
	    }
	    let allEqContainers = model.getLinkedObjects(
		["cim:Substation", "cim:Line"],
		"EquipmentContainer.Equipments");
	    let allSubstations = allEqContainers["cim:Substation"];
	    for (let substation of allSubstations) {
		data.children[0].appendChild(substation.cloneNode(true));
	    }
	    let allLines = allEqContainers["cim:Line"];
	    for (let line of allLines) {
		data.children[0].appendChild(line.cloneNode(true));
	    }
	    let allBaseVoltages = model.getTargets(
		allEquipments,
		"ConductingEquipment.BaseVoltage");
	    for (let baseVoltage of allBaseVoltages) {
		data.children[0].appendChild(baseVoltage.cloneNode(true));
	    }
	    let allTrafoEnds = model.getTargets(
		allEquipments,
		"PowerTransformer.PowerTransformerEnd");
	    for (let trafoEnd of allTrafoEnds) {
		data.children[0].appendChild(trafoEnd.cloneNode(true));
	    }
	    // TODO: measurements can also be tied to power system resources
	    // (e.g. busbars), not only terminals
	    let allMeasurements = model.getTargets(
		allTerminals,
		"ACDCTerminal.Measurements");
	    for (let measurement of allMeasurements) {
		data.children[0].appendChild(measurement.cloneNode(true));
	    }
	    let allAnalogValues = model.getTargets(
		allMeasurements,
		"Analog.AnalogValues");
	    for (let analogValue of allAnalogValues) {
		data.children[0].appendChild(analogValue.cloneNode(true));
	    }
	    
	    var oSerializer = new XMLSerializer();
	    var sXML = oSerializer.serializeToString(data);
	    return sXML;
	},

	// Get a list of diagrams in the current CIM file.
	getDiagramList() {
	    let diagrams = model.getObjects(["cim:Diagram"])["cim:Diagram"]
		.map(el => {
		    let name = model.getAttribute(el, "cim:IdentifiedObject.name");
		    if (typeof(name) === "undefined") {
			model.setAttribute(el, "cim:IdentifiedObject.name", "unnamed diagram");
		    }
		    return model.getAttribute(el, "cim:IdentifiedObject.name");
		})
		.map(el => el.textContent);
	    return diagrams;
	},

	// Get the objects of a given type (doesn't filter by diagram).
	getObjects(types) {
	    let ret = {};
 	    let allObjects = getAllObjects();
	    for (let type of types) {
		ret[type] = [];
	    }
	    ret = [].reduce.call(allObjects, function(r, v) {
		if (typeof(r[v.nodeName]) !== "undefined") {
		    r[v.nodeName].push(v);
		}
		return r;
	    }, ret);
	    return ret;
	},

	// Get the schema description of a given object, e.g. Breaker.
	// If this function is called with only one argument, it will
	// search into all of the known schemas, otherwise it will search
	// in the requested schema only.
	// Some objects are defined in more than one schema (like the
	// Breaker object, for example). However, this is not a problem
	// since the definition is the same in all of the schemas.
	getSchemaObject(type, schema) {
	    let ret = null;
	    for (let profile of Object.keys(schemaData)) {
		if (arguments.length === 2 && schema !== profile) {
		    continue;
		}
		let schData = schemaData[profile];
		let allSchemaObjects = schData.children[0].children;
		let schObj = [].filter.call(allSchemaObjects, function(el) {
		    return el.attributes[0].value === "#" + type;
		})[0];
		if (typeof(schObj) !== "undefined") {
		    ret = schObj;
		    break;
		}
	    };
	    return ret;
	},

	// Get the (EQ) schema enumeration values of a given attribute.
	getSchemaEnumValues(attr) {
	    let type = [].filter.call(attr.children, function(el) {
		return el.nodeName === "rdfs:range";
	    })[0];
	    let typeVal = type.attributes.getNamedItem("rdf:resource").value;
	    let enumName = typeVal.substring(1);
	    let allSchemaObjects = schemaData["EQ"].children[0].children;
	    let enumValues = [].filter.call(allSchemaObjects, function(el) {
		return el.attributes[0].value.startsWith("#" + enumName + ".");
	    });
	    return enumValues.map(el => [].filter.call(el.children, function(el) {
		return el.nodeName === "rdfs:label";
	    })[0].textContent);
	},

	// Get the enum name a given attribute.
	// It is not limited to EQ schema.
	getSchemaEnumName(attr) {
	    let type = [].filter.call(attr.children, function(el) {
		return el.nodeName === "rdfs:range";
	    })[0];
	    let typeVal = type.attributes.getNamedItem("rdf:resource").value;
	    let enumName = typeVal.substring(1);
	    return enumName;
	},

	// Get all the attributes associated to a given type.
	// The type is without namespace, e.g. "Breaker".
	// An optional 'schema' argument can be used to indicate the schema,
	// which can be 'EQ', 'DL' or 'SV'. If the argument is missing, the
	// EQ schema is used.
	getSchemaAttributes(type, schema) {
	    let schData = schemaData["EQ"];
	    if (arguments.length === 2) {
		schData = schemaData[schema];
	    }
	    let allSchemaObjects = schData.children[0].children;
	    let ret = [].filter.call(allSchemaObjects, function(el) {
		return el.attributes[0].value.startsWith("#" + type + ".");
	    });
	    let supers = getAllSuper(type);
	    for (let i in supers) {
		ret = ret.concat([].filter.call(allSchemaObjects, function(el) {
		    return el.attributes[0].value.startsWith("#" + supers[i] + ".");
		}));
	    }
	    ret = ret.filter(function(el) {
		let name = el.attributes[0].value;
		let isLiteral = false;
		let localName = name.split(".")[1];
		if (typeof(localName) !== "undefined") {
		    isLiteral = (localName.toLowerCase().charAt(0) === localName.charAt(0));
		}
		return isLiteral;
	    });
	    return ret;
	},

	// Get a specific attribute associated to a given type.
	// The type is without namespace, e.g. "Breaker".
	// An optional 'schema' argument can be used to indicate the schema,
	// which can be 'EQ', 'DL' or 'SV'. If the argument is missing, the
	// EQ schema is used.
	getSchemaAttribute(type, attrName, schema) {
	    let schemaAttributes = model.getSchemaAttributes(type, schema);
	    return schemaAttributes.filter(el => el.attributes[0].value.substring(1) === attrName)[0];
	},

	// Test if a given attribute is an enum.
	// It is not limited to EQ schema.
	isEnum(attr) {
	    let type = [].filter.call(attr.children, function(el) {
		return el.nodeName === "cims:dataType";
	    })[0];
	    // enums don't have a dataType
	    if (typeof(type) === "undefined") {
		return true;
	    }
	    return false;
	},

	// Get the type of a given attribute.
	// It is not limited to EQ schema.
	getSchemaAttributeType(attr) {
	    let unit = "none";
	    let multiplier = "none";
	    if (model.isEnum(attr)) {
		return ["#Enum", unit, multiplier];
	    }
	    let type = [].filter.call(attr.children, function(el) {
		return el.nodeName === "cims:dataType";
	    })[0];
	    let typeVal = type.attributes.getNamedItem("rdf:resource").value;
	    let typeObj = model.getSchemaObject(typeVal.substring(1));
	    let typeStereotype = [].filter.call(typeObj.children, function(el) {
		return el.nodeName === "cims:stereotype";
	    })[0].textContent;
	    
	    if (typeStereotype === "CIMDatatype") {
		let valueObj = model.getSchemaObject(typeVal.substring(1) + ".value");
		let unitObj = model.getSchemaObject(typeVal.substring(1) + ".unit");
		let multiplierObj = model.getSchemaObject(typeVal.substring(1) + ".multiplier");
		typeVal = [].filter.call(valueObj.children, function(el) {
		    return el.nodeName === "cims:dataType";
		})[0].attributes.getNamedItem("rdf:resource").value;
		if (unitObj !== null) {
		    unit = [].filter.call(unitObj.children, function(el) {
			return el.nodeName === "cims:isFixed";
		    })[0].attributes.getNamedItem("rdfs:Literal").value;
		}
		if (multiplierObj !== null) {
		    let isFixed = [].filter.call(multiplierObj.children, function(el) {
			return el.nodeName === "cims:isFixed";
		    })[0];
		    if (typeof(isFixed) !== "undefined") {
			multiplier = isFixed.attributes.getNamedItem("rdfs:Literal").value;
		    } 
		}
	    } 
	    return [typeVal, unit, multiplier];
	},

	// Get the schema links for a given type.
	// An optional 'schema' argument can be used to indicate the schema,
	// which can be 'EQ', 'DL' or 'SV'. If the argument is missing, the
	// EQ schema is used.
	getSchemaLinks(type, schema) {
	    let schData = schemaData["EQ"];
	    if (arguments.length === 2) {
		schData = schemaData[schema];
	    }
	    let allSchemaObjects = schData.children[0].children;
	    let ret = [].filter.call(allSchemaObjects, function(el) {
		return el.attributes[0].value.startsWith("#" + type + ".");
	    });
	    let supers = getAllSuper(type);
	    for (let i in supers) {
		ret = ret.concat([].filter.call(allSchemaObjects, function(el) {
		    return el.attributes[0].value.startsWith("#" + supers[i] + ".");
		}));
	    }
	    ret = ret.filter(function(el) {
		let name = el.attributes[0].value;
		let isLiteral = false;
		let localName = name.split(".")[1];
		if (typeof(localName) !== "undefined") {
		    isLiteral = (localName.toLowerCase().charAt(0) !== localName.charAt(0));
		}
		return isLiteral;
	    });
	    return ret;
	},

	// Get the schema links for a given type, related to any
	// known profile (EQ, DL...).
	getAllSchemasLinks(type) {
	    let ret = [];
	    Object.keys(schemaData).forEach(function(profile) {
		ret = ret.concat(model.getSchemaLinks(type, profile));
	    });
	    return ret;
	},

	// Get a specific link associated to a given type.
	// The type is without namespace, e.g. "Breaker".
	// An optional 'schema' argument can be used to indicate the schema,
	// which can be 'EQ' or 'DL'. If the argument is missing, the
	// EQ schema is used.
	getSchemaLink(type, linkName, schema) {
	    let schemaLinks = model.getSchemaLinks(type, schema);
	    return schemaLinks.filter(el => el.attributes[0].value.substring(1) === linkName)[0];
	},

	// Get a specific link associated to a given type, related to any
	// known profile (EQ, DL...).
	getAllSchemasLink(type, linkName) {
	    let schemaLinks = model.getAllSchemasLinks(type);
	    return schemaLinks.filter(el => el.attributes[0].value.substring(1) === linkName)[0];
	},

	// Get the objects of a given type that have at least one
	// DiagramObject in the current diagram.
	// The input is an array of types, like ["cim:ACLineSegment", "cim:Breaker"].
	// The output is an object, its keys are the types and the values are the
	// corresponding arrays, like {cim:ACLineSegment: [array1], cim:Breaker: [array2]}.
	getGraphicObjects(types) {
	    let ret = {};
 	    let allObjects = getDiagramObjectGraph().map(el => el.target);
	    let allObjectsSet = new Set(allObjects); // we want uniqueness
	    for (let type of types) {
		ret[type] = [];
	    }
	    ret = [...allObjectsSet].reduce(function(r, v) {
		if (typeof(r[v.nodeName]) !== "undefined") {
		    r[v.nodeName].push(v);
		}
		return r;
	    }, ret);
	    return ret;
	},

	// Get the connectivity nodes that belong to the current diagram.
	getConnectivityNodes() {
	    let allConnectivityNodes = model.getObjects(["cim:ConnectivityNode"])["cim:ConnectivityNode"];
	    let graphic = model.getGraphicObjects(["cim:ConnectivityNode"])["cim:ConnectivityNode"];
	    let nonGraphic = allConnectivityNodes.filter(el => graphic.indexOf(el) === -1);
	    nonGraphic = nonGraphic.filter(function(d) {
		let busbarSection = model.getBusbar(d);
		let equipments = model.getEquipments(d);
		if (busbarSection !== null) {
		    return true;
		}
		return (equipments.length > 1);
	    });
	    return graphic.concat(nonGraphic);
	},

	// Get the Connectors (busbars or junctions)
	// that belong to the current diagram.
	getConnectors(types) {
	    let ret = {};
	    for (let type of types) {
		let allObjs = model.getObjects([type])[type];
		let graphic = model.getGraphicObjects([type])[type];
		let nonGraphic = allObjs.filter(el => graphic.indexOf(el) === -1);
		nonGraphic = nonGraphic.filter(function(d) {
		    let cn = model.getConnectivityNode(d);
		    if (cn !== null) {
		    let dobjs = model.getDiagramObjects([cn]);
			return (dobjs.length > 0);
		    }
		    return false;
		});
		ret[type] = graphic.concat(nonGraphic);
	    }
	    return ret;
	},

	// Get all the objects of the given types that either
	// have at least a diagram object in the current diagram or are
	// linked to some object which is in the current diagram
	// via the given link. The 'types' parameter must be an array of
	// namespace qualified types, like ["cim:Substation", "cim:Line"].
	// The output is an object whose keys are the types and the values
	// are the corresponding arrays, like {cim:Substation: [sub1, sub2],
	// cim:Line: [line1]}. Each object returned is an Element.
	// This function is useful for many CIM objects, like:
	// Substations, Lines, Measurements, GeneratingUnits, RegulatingControls.
	getLinkedObjects(types, linkName) {
	    let ret = {};
	    for (let type of types) {
		ret[type] = model.getObjects([type])[type].filter(function(src) {
		    let srcs = [src];
		    if (type === "cim:Substation") { // substations are not so simple
			let vlevs = model.getTargets([src], "Substation.VoltageLevels");
			let bays = model.getTargets(vlevs, "VoltageLevel.Bays");
			srcs = srcs.concat(vlevs).concat(bays);
		    }
		    let targets = model.getTargets(srcs, linkName);
		    let dobjs = model.getDiagramObjects(srcs.concat(targets));
		    return (dobjs.length > 0);
		});
	    } 
	    return ret;
	},
		
	// Get all the terminals of given conducting equipments. 
	getTerminals(identObjs) {
	    let terminals = getConductingEquipmentGraph(identObjs).map(el => el.target);
	    let terminalsSet = new Set(terminals);
	    terminals = [...terminalsSet]; // we want uniqueness
	    return terminals;
	},

	// Get an object given its UUID.
	getObject(uuid) {
	    return model.dataMap.get("#" + uuid);
	},

	// Get all the attributes of a given object which are actually set.
	getAttributes(object) {
	    return [].filter.call(object.children, function(el) {
		return el.attributes.length === 0;
	    });
	},

	// Get a specific attribute of a given object.
	getAttribute(object, attrName) {
	    if (typeof(object) === "undefined") {
		return "undefined";
	    }
	    let attributes = model.getAttributes(object);
	    return attributes.filter(el => el.nodeName === attrName)[0];
	},

	// Set a specific attribute of a given object. If it doesen't exists, it is created.
	setAttribute(object, attrName, value) {
	    let attribute = model.getAttribute(object, attrName);
	    if (typeof(attribute) !== "undefined") {
		attribute.innerHTML = value;
	    } else {
		attribute = object.ownerDocument.createElement(attrName);
		attribute.innerHTML = value;
		object.appendChild(attribute);
	    }
	    model.trigger("setAttribute", object, attrName, value);
	    return;
	},

	// Set a specific enum of a given object. If it doesen't exists, it is created.
	setEnum(object, enumName, value) {
	    let enumAttr = model.getEnum(object, enumName);
	    if (typeof(enumAttr) === "undefined") {
		enumAttr = object.ownerDocument.createElement(enumName);
		let enumValue = object.ownerDocument.createAttribute("rdf:resource");
		enumValue.nodeValue = "#";
		enumAttr.setAttributeNode(enumValue);
		object.appendChild(enumAttr);
	    }
	    enumAttr.attributes[0].value = cimNS + value;
	    model.trigger("setEnum", object, enumName, value);
	    return;
	},

	// Create an object of a given type.
	createObject(type, uuid) {
	    let newElement = model.cimObject(type, uuid);
	    model.setAttribute(newElement, "cim:IdentifiedObject.name", "new1");
	    if (getAllSuper(newElement.localName).indexOf("ConductingEquipment") < 0) {
		// if not a conducting equipment, we are done
		model.trigger("createObject", newElement);
		return newElement;
	    }
	    let term1 = createTerminal(newElement);
	    let term2 = null;
	    // create second terminal if needed
	    if (type === "cim:ACLineSegment" ||
		type === "cim:Breaker" ||
		type === "cim:Disconnector" ||
		type === "cim:LoadBreakSwitch" ||
		type === "cim:Jumper" ||
		type === "cim:Junction" ||
		type === "cim:PowerTransformer") {
		term2 = createTerminal(newElement);
	    }
	    if (type === "cim:BusbarSection") {
		let cn = model.cimObject("cim:ConnectivityNode");
		addLink(term1, "cim:Terminal.ConnectivityNode", cn);
	    }
	    if (type === "cim:PowerTransformer") {
		// TODO: the number of windings should be configurable
		let w1 = model.cimObject("cim:PowerTransformerEnd");
		let w2 = model.cimObject("cim:PowerTransformerEnd");
		model.setAttribute(w1, "cim:IdentifiedObject.name", "winding1");
		model.setAttribute(w2, "cim:IdentifiedObject.name", "winding2");
		addLink(newElement, "cim:PowerTransformer.PowerTransformerEnd", w1);
		addLink(newElement, "cim:PowerTransformer.PowerTransformerEnd", w2);
		addLink(w1, "cim:TransformerEnd.Terminal", term1);
		addLink(w2, "cim:TransformerEnd.Terminal", term2);
	    }
	    model.trigger("createObject", newElement);
	    return newElement;
	},

	// Delete an object: also, delete its terminals and graphic objects.
	// Moreover, delete contained objects (like transformer windings,
	// voltage levels, bays etc.) and handle BusbarSections.
	deleteObject(object) {
	    let objUUID = object.attributes.getNamedItem("rdf:ID").value;
	    // all the links to 'object' must be deleted
	    let linksToDelete = [];
	    let objsToDelete = [];
	    // handle connectivity nodes
	    if (object.nodeName === "cim:ConnectivityNode") {
		objsToDelete = getBusbars(object);
	    }
	    // handle busbars
	    if (object.nodeName === "cim:BusbarSection") {
		objsToDelete = getConnectivityNode(object);
	    }
	    
	    for (let [linkAndTarget, sources] of model.linksMap) {
		let linkName = "cim:" + linkAndTarget.split("#")[0];
		// delete links of 'object'
		if (sources.indexOf(object) > -1) {
		    let target = model.dataMap.get("#" + linkAndTarget.split("#")[1]);
		    // target may be undefined, if it is defined in an external file
		    // (like a boundary set file for example)
		    if (typeof(target) !== "undefined") {
			if (checkRelatedObject(object, target)) {
			    objsToDelete.push(target);
			}
			linksToDelete.push({s: object, l: linkName, t: target});
		    }
		}
		// delete links pointing to 'object'
		if (linkAndTarget.endsWith(objUUID) === false) {
		    continue;
		}
		for (let source of sources) {
		    linksToDelete.push({s: source, l: linkName, t: object});
		    if (checkRelatedObject(object, source)) {
			objsToDelete.push(source);
		    }
		}
	    }
	    for (let linkToDelete of linksToDelete) {
		model.removeLink(linkToDelete.s, linkToDelete.l, linkToDelete.t);
	    }
	    for (let objToDelete of objsToDelete) {
		model.deleteObject(objToDelete);
	    }
	    // update the 'dataMap' map
	    model.dataMap.delete("#" + objUUID);
	    // delete the object
	    object.remove();

	    function checkRelatedObject(object, related) {
		// terminals of conducting equipment
		if (object.nodeName !== "cim:ConnectivityNode") {
		    if (related.nodeName === "cim:Terminal") {
			return true;
		    }
		}
		// diagram object points
		if (related.nodeName === "cim:DiagramObjectPoint") {
		    return true;
		}
		// diagram objects
		// this check is to avoid infinite recursion
		if (object.nodeName !== "cim:DiagramObjectPoint") {
		    if (related.nodeName === "cim:DiagramObject") {
			return true;
		    }
		}
		// trafo ends
		if (object.nodeName === "cim:PowerTransformer") {
		    if (related.nodeName === "cim:PowerTransformerEnd") {
			return true;
		    }
		}
		// subgeographical regions
		if (object.nodeName === "cim:GeographicalRegion") {
		    if (related.nodeName === "cim:SubGeographicalRegion") {
			return true;
		    }
		}
		// substations
		if (object.nodeName === "cim:SubGeographicalRegion") {
		    if (related.nodeName === "cim:Substation") {
			return true;
		    }
		}
		// voltage levels
		if (object.nodeName === "cim:Substation") {
		    if (related.nodeName === "cim:VoltageLevel") {
			return true;
		    }
		}
		// bays
		if (object.nodeName === "cim:VoltageLevel") {
		    if (related.nodeName === "cim:Bay") {
			return true;
		    }
		}
		
		return false;
	    };

	    // functions to navigate busbars <-> connectivity nodes.
	    // these are internal to this function, since they don't
	    // filter by diagram, while in all other situations you
	    // want that filter.
	    function getConnectivityNode(busbar) {
		if (busbar.nodeName === "cim:BusbarSection") {
		    let terminal = model.getTargets(
			[busbar],
			"ConductingEquipment.Terminals");
		    let cn = model.getTargets(
			terminal,
			"Terminal.ConnectivityNode");
		    return cn;		
		}
		return [];
	    };

	    function getBusbars(connectivityNode) {
		if (connectivityNode.nodeName === "cim:ConnectivityNode") {
		    let cnTerminals = model.getTargets(
			[connectivityNode],
			"ConnectivityNode.Terminals");
		    // let's try to get some equipment
		    let equipments = model.getTargets(
			cnTerminals,
			"Terminal.ConductingEquipment");
		    let busbars = equipments.filter(
			el => el.nodeName === "cim:BusbarSection");
		    return busbars;
		}
		return [];
	    };

	    model.trigger("deleteObject", objUUID);
	},

	// Function to navigate busbar -> connectivity node.
	getConnectivityNode(busbar) {
	    if (busbar.nodeName === "cim:BusbarSection") {
		let terminal = model.getTargets(
		    [busbar],
		    "ConductingEquipment.Terminals");
		let cn = model.getTargets(
		    terminal,
		    "Terminal.ConnectivityNode");
		if (cn.length === 0) {
		    return null;
		}
		return cn[0];
	    }
	    return null;
	},

	// Function to navigate connectivity node -> busbar.
	// It filters by diagram (i.e. the busbar
	// OR the connectivity node must be in the diagram).
	getBusbar(connectivityNode) {
	    if (connectivityNode.nodeName === "cim:ConnectivityNode") {
		let terminals = model.getTargets(
		    [connectivityNode],
		    "ConnectivityNode.Terminals");
		let equipments = model.getTargets(
		    terminals,
		    "Terminal.ConductingEquipment");
		let busbars = equipments.filter(el => el.localName === "BusbarSection");
		let dobjs = model.getDiagramObjects([connectivityNode].concat(busbars));
		if (busbars.length > 0 && dobjs.length > 0) {
		    return busbars[0];
		}
	    }
	    return null;
	},

	// Test weather an object is of a given type.
	isA(type, object) {
	    if (getAllSuper(object.localName).indexOf(type) < 0) {
		return false;
	    }
	    return true;
	},

	// Delete an object from the current diagram.
	deleteFromDiagram(object) {
	    let objUUID = object.attributes.getNamedItem("rdf:ID").value;
	    let dobjs = model.getDiagramObjects([object]);
	    let points = model.getTargets(
		dobjs,
		"DiagramObject.DiagramObjectPoints");
	    for (let dobj of dobjs) {
		model.deleteObject(dobj);
	    }
	    for (let point of points) {
		model.deleteObject(point);
	    }
	    model.trigger("deleteFromDiagram", objUUID);
	},

	// Add an object to the active diagram.
	addToActiveDiagram(object, lineData) {
	    // create a diagram object and a diagram object point
	    let dobj = model.cimObject("cim:DiagramObject");
	    for (let linePoint of lineData) {
		let point = model.cimObject("cim:DiagramObjectPoint");
		model.setAttribute(point, "cim:DiagramObjectPoint.xPosition", linePoint.x + object.x);
		model.setAttribute(point, "cim:DiagramObjectPoint.yPosition", linePoint.y + object.y);
		model.setAttribute(point, "cim:DiagramObjectPoint.sequenceNumber", linePoint.seq);
		addLink(point, "cim:DiagramObjectPoint.DiagramObject", dobj);
	    }
	    addLink(dobj, "cim:DiagramObject.IdentifiedObject", object);
	    addLink(dobj, "cim:DiagramObject.Diagram", model.activeDiagram);
	    model.trigger("addToActiveDiagram", object);
	},

	// Update the model based on new position data. This is based on the
	// given object's x and y attributes as well as a 'lineData' array 
	// for extended objects: each element of the array must be an object
	// with x and y keys, which are mapped to DiagramObjectPoints.
	updateActiveDiagram(object, lineData) {
	    // save new position.
	    let dobjs = model.getDiagramObjects([object]);
	    if (object.nodeName === "cim:ConnectivityNode" && dobjs.length === 0) {
		let equipments = model.getEquipments(object);
		let busbarSection = equipments.filter(el => el.localName === "BusbarSection")[0];
		if (typeof(busbarSection) !== "undefined") {
		    dobjs = model.getDiagramObjects([busbarSection]);
		}
	    }
	    for (let dobj of dobjs) {
		model.setAttribute(dobj, "cim:DiagramObject.rotation", object.rotation);
	    }
	    let points = model.getTargets(
		dobjs,
		"DiagramObject.DiagramObjectPoints");
	    if (points.length > 0) {
		for (let point of points) {
		    let seq = 1;
		    let seqObject = model.getAttribute(point, "cim:DiagramObjectPoint.sequenceNumber");
		    if (typeof(seqObject) !== "undefined") {
			seq = parseInt(seqObject.innerHTML);
		    }
		    let actLineData = object.lineData.filter(el => el.seq === seq)[0];
		    model.getAttribute(point, "cim:DiagramObjectPoint.xPosition").innerHTML = actLineData.x + object.x;
		    model.getAttribute(point, "cim:DiagramObjectPoint.yPosition").innerHTML = actLineData.y + object.y;
		}
		model.trigger("updateActiveDiagram", object);
	    } else {
		model.addToActiveDiagram(object, object.lineData);
	    }
	},

	// TODO: this should probably be private.
	cimObject(name, uuid) {
	    let document = getDocument(name);
	    let obj = document.createElementNS(cimNS, name);
	    document.children[0].appendChild(obj);
	    let objID = document.createAttribute("rdf:ID");
	    if (typeof(uuid) !== "undefined") {
		objID.nodeValue = uuid;
	    } else {
		objID.nodeValue = generateUUID();
	    }
	    obj.setAttributeNode(objID);
	    model.dataMap.set("#" + obj.attributes.getNamedItem("rdf:ID").value, obj);
	    return obj;
	},
	
	// Get all the links of a given object which are actually set.
	getLinks(object) {
	    return [].filter.call(object.children, function(el) {
		let resource = el.attributes.getNamedItem("rdf:resource");
		if (el.attributes.length === 0 || resource === null) {
		    return false;
		}
		return (resource.value.charAt(0) === "#");
	    });
	},

	// Get a specific link of a given object.
	// If the link is many-valued, it mey return more than one element.
	getLink(object, linkName) {
	    let links = model.getLinks(object);
	    return links.filter(el => el.nodeName === linkName);
	},

	// Get all the enums of a given object which are actually set.
	getEnums(object) {
	    return [].filter.call(object.children, function(el) {
		let resource = el.attributes.getNamedItem("rdf:resource");
		if (el.attributes.length === 0 || resource === null) {
		    return false;
		}
		return (resource.value.charAt(0) !== "#");
	    });
	},

	// Get a specific enum of a given object.
	getEnum(object, enumName) {
	    let enums = model.getEnums(object);
	    return enums.filter(el => el.nodeName === enumName)[0];
	},

	// Set a specific link of a given object.
	// If a link with the same name already exists, it is removed.
	setLink(source, linkName, target) {
	    let oldTargets = model.getTargets([source], linkName.split(":")[1]);
	    for (let oldTarget of oldTargets) {
		model.removeLink(source, linkName, oldTarget);
	    }
	    addLink(source, linkName, target);
	},

	// Remove a specific link of a given object.
	removeLink(source, linkName, target) {
	    let link = model.getLink(source, linkName);
	    removeLinkInternal(link, source, target);
	    let invLinkName = schemaInvLinksMap.get(linkName.split(":")[1]);
	    // remove inverse, if present in schema 
	    if (typeof(invLinkName) !== "undefined") {
		let invLink = model.getLink(target, "cim:" + invLinkName);
		removeLinkInternal(invLink, target, source);
	    }
	    model.trigger("removeLink", source, linkName, target);

	    function removeLinkInternal(link, sourceInt, targetInt) {
		// the link may be many-valued
		for (let linkEntry of link) {
		    let targetUUID = linkEntry.attributes.getNamedItem("rdf:resource").value;
		    if (targetUUID === "#" + targetInt.attributes.getNamedItem("rdf:ID").value) {
			let linksMapKey = linkEntry.localName + targetUUID;
			let linksMapValue = model.linksMap.get(linksMapKey);
			linkEntry.remove();
			if (linksMapValue.length === 1) {
			    model.linksMap.delete(linksMapKey);
			} else {
			    linksMapValue.splice(linksMapValue.indexOf(sourceInt), 1);
			}
		    }
		}
	    };
	},

	// Returns all the nodes connected with the given sources
	// via the link 'linkName' (or the inverse, 'invLinkName').
	getTargets(sources, linkName) {
	    let graph = getGraph(sources, linkName);
	    let targets = graph.map(el => el.target);
	    return [...new Set(targets)]; // we want uniqueness
	},

	// Get all the diagram objects in the current diagram.
	// If an array of objects is given as argument, only the
	// diagram objects associated to that objects are returned.
	getDiagramObjects(identObjs) {
	    let graph = getDiagramObjectGraph(identObjs);
	    let targets = graph.map(el => el.source);
	    return [...new Set(targets)]; // we want uniqueness
	},

	// Get the equipments in the current diagram associated to the
	// given connectivity node.
	getEquipments(connectivityNode) {
	    let cnTerminals = model.getTargets(
		[connectivityNode],
		"ConnectivityNode.Terminals");
	    // let's try to get some equipment
	    let equipments = model.getTargets(
		cnTerminals,
		"Terminal.ConductingEquipment");
	    equipments = getConductingEquipmentGraph(equipments)
		.map(el => el.source);
	    return [...new Set(equipments)]; // we want uniqueness
	},

	// Selects a given diagram in the current CIM file.
	// TODO: perform some checks...
	selectDiagram(diagramName) {
	    if (diagramName !== model.activeDiagramName) {
		model.activeDiagramName = diagramName;
		model.activeDiagram = model.getObjects(["cim:Diagram"])["cim:Diagram"]
	            .filter(el => model.getAttribute(el, "cim:IdentifiedObject.name").textContent === model.activeDiagramName)[0];
	    }
	    // see if we must generate a new diagram
	    if (typeof(model.activeDiagram) === "undefined") {
		model.activeDiagram = model.cimObject("cim:Diagram");
		model.setAttribute(model.activeDiagram, "cim:IdentifiedObject.name", diagramName);
		model.activeDiagramName = diagramName;
		model.trigger("createdDiagram");
	    }
	    model.trigger("changedDiagram");
	}
    };
    riot.observable(model);
    return model;
};
