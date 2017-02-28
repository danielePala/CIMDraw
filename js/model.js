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
    // The Diagram Layout namespace.
    const dlNS = "http://entsoe.eu/CIM/DiagramLayout/3/1";
    // An empty CIM file, used when creating a new file.
    const emptyFile = "<?xml version=\"1.0\" encoding=\"UTF-8\" ?>" +
	  "<rdf:RDF xmlns:cim=\""+ cimNS + "\" xmlns:entsoe=\"" + entsoeNS +
	  "\" xmlns:md=\"" + modelNS + "\" xmlns:rdf=\"" + rdfNS + "\">" +
	  "</rdf:RDF>";
    // CIM data for the current file.
    // 'all' is used for plain RDF/XML files
    // 'eq' is for the equipment file
    // 'dl' is for the diagram layout file
    let data = {all: undefined, eq:undefined, dl:undefined};
    // A map of schema attribute names vs schema attribute objects.
    // Used for faster lookup.
    let schemaAttributesMap =  new Map();
    // A map of schema link names vs schema link objects.
    // Used for faster lookup.
    let schemaLinksMap = new Map();

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
		    data.dl = createNewDLDocument();
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

    // Create a new diagram layout document, in case the input
    // CGMES file contains only the EQ profile.
    // This is a 'private' function (not visible in the model object).
    function createNewDLDocument() {
	let parser = new DOMParser();
	let empty = parser.parseFromString(emptyFile, "application/xml");
	
	let eqModelDesc = [].filter.call(
	    data.eq.children[0].children, function(el) {
		return el.nodeName === "md:FullModel";
	    })[0];
	let dlModelDesc = document.createElementNS(modelNS, "md:FullModel");
	empty.children[0].appendChild(dlModelDesc);
	let dlModelDescID = document.createAttribute("rdf:about");
	dlModelDescID.nodeValue = eqModelDesc.attributes.getNamedItem("rdf:about").value;
	dlModelDesc.setAttributeNode(dlModelDescID);
	model.setAttribute(dlModelDesc, "md:Model.profile", dlNS);
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
	
	// let's read schema files
	let rdfsEQ = "rdf-schema/EquipmentProfileCoreShortCircuitOperationRDFSAugmented-v2_4_15-16Feb2016.rdf";
	let rdfsDL = "rdf-schema/DiagramLayoutProfileRDFSAugmented-v2_4_15-16Feb2016.rdf";
	let rdfsSV = "rdf-schema/StateVariablesProfileRDFSAugmented-v2_4_15-16Feb2016.rdf"
	d3.xml(rdfsEQ, function(error, schemaDataEQ) {
	    model.schemaDataEQ = schemaDataEQ;
	    d3.xml(rdfsDL, function(schemaDataDL) {
		model.schemaDataDL = schemaDataDL;
		d3.xml(rdfsSV, function(schemaDataSV) {
		    model.schemaDataSV = schemaDataSV;
		    callback(null);
		});
	    });
	});
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
	addLink(object, "cim:ConductingEquipment.Terminals", term);
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

    // Get all the (EQ) superclasses for a given type.
    // This is a 'private' function (not visible in the model object).
    function getAllSuper(type) {
	let allSuper = [];
	let object = model.getSchemaObject(type);
	// handle unknown objects (e.g. non-EQ objects)
	if (typeof(object) === "undefined") {
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

    // Add a new link to a given source.
    // This is a 'private' function (not visible in the model object).
    function addLink(source, linkName, target) {
	let invLink = model.getInvLink("#" + linkName.split(":")[1]);
	let invLinkName = "cim:" + invLink.attributes[0].value.substring(1);
	let targets = model.getTargets([source], linkName, invLinkName);
	// see if the link is already set
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

	// Serialize the current CIM file.
	save() {
	    let oSerializer = new XMLSerializer();
	    if (typeof(data.all) !== "undefined") {
		let sXML = oSerializer.serializeToString(data.all);
		return sXML;
	    }
	    let zip = new JSZip();
	    zip.file("EQ.xml", oSerializer.serializeToString(data.eq));
	    zip.file("DL.xml", oSerializer.serializeToString(data.dl));
	    return zip.generateAsync({type:"blob", compression: "DEFLATE"});
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
		"Diagram.DiagramObjects",
		"DiagramObject.Diagram");
	    for (let diagramObject of allDiagramObjects) {
		data.children[0].appendChild(diagramObject.cloneNode(true));
	    }
	    let allEquipments = model.getTargets(
		allDiagramObjects,
		"DiagramObject.IdentifiedObject",
		"IdentifiedObject.DiagramObjects");
	    for (let equipment of allEquipments) {
		data.children[0].appendChild(equipment.cloneNode(true));
	    }
	    let allDiagramObjectPoints = model.getTargets(
		allDiagramObjects,
		"DiagramObject.DiagramObjectPoints",
		"DiagramObjectPoint.DiagramObject");
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
	    let allEqContainers = model.getEquipmentContainers(
		["cim:Substation", "cim:Line"]);
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
		"ConductingEquipment.BaseVoltage",
		"BaseVoltage.ConductingEquipment");
	    for (let baseVoltage of allBaseVoltages) {
		data.children[0].appendChild(baseVoltage.cloneNode(true));
	    }
	    let allTrafoEnds = model.getTargets(
		allEquipments,
		"PowerTransformer.PowerTransformerEnd",
		"PowerTransformerEnd.PowerTransformer");
	    for (let trafoEnd of allTrafoEnds) {
		data.children[0].appendChild(trafoEnd.cloneNode(true));
	    }
	    // TODO: measurements can also be tied to power system resources
	    // (e.g. busbars), not only terminals
	    let allMeasurements = model.getTargets(
		allTerminals,
		"Terminal.Measurements",
		"Measurement.Terminal");
	    for (let measurement of allMeasurements) {
		data.children[0].appendChild(measurement.cloneNode(true));
	    }
	    let allAnalogValues = model.getTargets(
		allMeasurements,
		"Analog.AnalogValues",
		"AnalogValue.Analog");
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

	// Get all the measurements in the current diagram.
	getMeasurements() {
	    let gMeasurements = model.getGraphicObjects(["cim:Analog", "cim:Discrete"]);
	    let ceGraph = model.getConductingEquipmentGraph();
	    let allEquipments = ceGraph.map(el => el.source);
	    let terminals = ceGraph.map(el => el.target);
	    let tMeasurements = model.getTargets(
		terminals,
		"Terminal.Measurements",
		"Measurement.Terminal");
	    let eqMeasurements = model.getTargets(
		allEquipments,
		"PowerSystemResource.Measurements",
		"Measurement.PowerSystemResource");
	    gMeasurements = [].reduce.call(tMeasurements.concat(eqMeasurements), function(r, v) {
		if (typeof(r[v.nodeName]) !== "undefined" && r[v.nodeName].indexOf(v) < 0) {
		    r[v.nodeName].push(v);
		}
		return r;
	    }, gMeasurements);
	    return gMeasurements; 
	},

	// Get the (EQ) schema description of a given object, e.g. Breaker. 
	getSchemaObject(type) {
	    let allSchemaObjects = model.schemaDataEQ.children[0].children;
	    return [].filter.call(allSchemaObjects, function(el) {
		return el.attributes[0].value === "#" + type;
	    })[0];
	},

	// Get the (EQ) schema enumeration values of a given attribute.
	getSchemaEnumValues(attr) {
	    let type = [].filter.call(attr.children, function(el) {
		return el.nodeName === "rdfs:range";
	    })[0];
	    let typeVal = type.attributes.getNamedItem("rdf:resource").value;
	    let enumName = typeVal.substring(1);
	    let allSchemaObjects = model.schemaDataEQ.children[0].children;
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
	// It is limited to EQ schema.
	getSchemaAttributes(type) {
	    let ret = schemaAttributesMap.get(type);
	    if (typeof(ret) === "undefined") {
		let allSchemaObjects = model.schemaDataEQ.children[0].children;
		ret = [].filter.call(allSchemaObjects, function(el) {
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
		schemaAttributesMap.set(type, ret);
	    }
	    
	    return ret;
	},

	// Get a specific attribute associated to a given type.
	// The type is without namespace, e.g. "Breaker".
	// It is limited to EQ schema.
	getSchemaAttribute(type, attrName) {
	    let schemaAttributes = model.getSchemaAttributes(type);
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
		if (typeof(unitObj) !== "undefined") {
		    unit = [].filter.call(unitObj.children, function(el) {
			return el.nodeName === "cims:isFixed";
		    })[0].attributes.getNamedItem("rdfs:Literal").value;
		}
		if (typeof(multiplierObj) !== "undefined") {
		    multiplier = [].filter.call(multiplierObj.children, function(el) {
			return el.nodeName === "cims:isFixed";
		    })[0].attributes.getNamedItem("rdfs:Literal").value;
		}
	    } 
	    return [typeVal, unit, multiplier];
	},

	// Get the (EQ) schema links for a given type.
	getSchemaLinks(type) {
	    let ret = schemaLinksMap.get(type);
	    if (typeof(ret) === "undefined") {
		let allSchemaObjects = model.schemaDataEQ.children[0].children;
		ret = [].filter.call(allSchemaObjects, function(el) {
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
		schemaLinksMap.set(type, ret);
	    }
	    return ret;
	},

	// Get the objects of a given type that have at least one
	// DiagramObject in the current diagram.
	// The input is an array of types, like ["cim:ACLineSegment", "cim:Breaker"].
	// The output is an object, its keys are the types and the values are the
	// corresponding arrays, like {cim:ACLineSegment: [array1], cim:Breaker: [array2]}.
	getGraphicObjects(types) {
	    let ret = {};
 	    let allObjects = model.getDiagramObjectGraph().map(el => el.source);
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
		let cnTerminals = model.getTargets(
		    [d],
		    "ConnectivityNode.Terminals",
		    "Terminal.ConnectivityNode");
		// let's try to get some equipment
		let equipments = model.getTargets(
		    cnTerminals,
		    "Terminal.ConductingEquipment",
		    "ConductingEquipment.Terminals");
		equipments = model.getConductingEquipmentGraph(equipments).map(el => el.source);
		// let's try to get a busbar section
		let busbarSection = equipments.filter(el => el.localName === "BusbarSection")[0];
		equipments = equipments.filter(el => el !== busbarSection);
		let equipmentsSet = new Set(equipments);
		equipments = [...equipmentsSet]; // we want uniqueness
		return (equipments.length > 1) || (typeof(busbarSection) !== "undefined");
	    });
	    return graphic.concat(nonGraphic);
	},

	// Get the equipment containers that belong to the current diagram.
	getEquipmentContainers(types) {
	    let ret = {};
	    for (let type of types) {
		ret[type] = model.getObjects([type])[type].filter(function(container) {
		    let allContainedObjects = model.getTargets(
			[container],
			"EquipmentContainers.Equipment",
			"Equipment.EquipmentContainer");
		    let graphicObjects = model.getDiagramObjectGraph([container]);
		    let graphicContainedObjects = model.getDiagramObjectGraph(allContainedObjects);
		    return (graphicObjects.length > 0 || graphicContainedObjects.length > 0);
		});
	    }
	    return ret;
	},

	// Get all the terminals of given conducting equipments. 
	getTerminals(identObjs) {
	    let terminals = model.getConductingEquipmentGraph(identObjs).map(el => el.target);
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
	// Moreover, delete transformer windings and handle BusbarSections.
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
			"ConductingEquipment.Terminals",
			"Terminal.ConductingEquipment");
		    let cn = model.getTargets(
			terminal,
			"Terminal.ConnectivityNode",
			"ConnectivityNode.Terminals");
		    return cn;		
		}
		return [];
	    };

	    function getBusbars(connectivityNode) {
		if (connectivityNode.nodeName === "cim:ConnectivityNode") {
		    let cnTerminals = model.getTargets(
			[connectivityNode],
			"ConnectivityNode.Terminals",
			"Terminal.ConnectivityNode");
		    // let's try to get some equipment
		    let equipments = model.getTargets(
			cnTerminals,
			"Terminal.ConductingEquipment",
			"ConductingEquipment.Terminals");
		    let busbars = equipments.filter(
			el => el.nodeName === "cim:BusbarSection");
		    return busbars;
		}
		return [];
	    };

	    model.trigger("deleteObject", objUUID);
	},

	// Function to navigate busbar -> connectivity node.
	// It filters by diagram (i.e. the busbar must be in the diagram).
	getConnectivityNode(busbar) {
	    if (busbar.nodeName === "cim:BusbarSection") {
		let terminal = model.getConductingEquipmentGraph([busbar]).map(el => el.target)[0];
		if (typeof(terminal) === "undefined") {
		    return null;
		}
		let cn = model.getTargets(
		    [terminal],
		    "Terminal.ConnectivityNode",
		    "ConnectivityNode.Terminals")[0];
		return cn;
	    }
	    return null;
	},

	// Function to navigate connectivity node -> busbar.
	// It filters by diagram (i.e. the busbar must be in the diagram).
	getBusbar(connectivityNode) {
	    if (connectivityNode.nodeName === "cim:ConnectivityNode") {
		let busbars = model.getEquipments(connectivityNode).filter(el => el.localName === "BusbarSection");
		if (busbars.length > 0) {
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
	    let dobjs = model.getDiagramObjectGraph([object]).map(el => el.target);
	    let points = model.getTargets(
		dobjs,
		"DiagramObject.DiagramObjectPoints",
		"DiagramObjectPoint.DiagramObject");
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
		addLink(dobj, "cim:DiagramObject.DiagramObjectPoints", point);
	    }
	    addLink(object, "cim:IdentifiedObject.DiagramObjects", dobj);
	    addLink(dobj, "cim:DiagramObject.Diagram", model.activeDiagram);
	    model.trigger("addToActiveDiagram", object);
	},

	// Update the model based on new position data. This is based on the
	// given object's x and y attributes as well as a 'lineData' array 
	// for extended objects: each element of the array must be an object
	// with x and y keys, which are mapped to DiagramObjectPoints.
	updateActiveDiagram(object, lineData) {
	    // save new position.
	    let ioEdges = model.getDiagramObjectGraph([object]);
	    let dobjs = ioEdges.map(el => el.target);
	    if (object.nodeName === "cim:ConnectivityNode" && dobjs.length === 0) {
		let equipments = model.getEquipments(object);
		let busbarSection = equipments.filter(el => el.localName === "BusbarSection")[0];
		if (typeof(busbarSection) !== "undefined") {
		    dobjs = model.getDiagramObjectGraph([busbarSection]).map(el => el.target);
		}
	    }
	    for (let dobj of dobjs) {
		model.setAttribute(dobj, "cim:DiagramObject.rotation", object.rotation);
	    }
	    let points = model.getTargets(
		dobjs,
		"DiagramObject.DiagramObjectPoints",
		"DiagramObjectPoint.DiagramObject");
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

	// TODO: this shoul probably be private.
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
	    
	    function generateUUID() {
		var d = new Date().getTime();
		var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		    var r = (d + Math.random()*16)%16 | 0;
		    d = Math.floor(d/16);
		    return (c=='x' ? r : (r&0x3|0x8)).toString(16);
		});
		return "_" + uuid;
	    };
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
	    let invLinkSchema = model.getInvLink("#" + linkName.split(":")[1]);
	    let invLinkName = "cim:" + invLinkSchema.attributes[0].value.substring(1);
	    let oldTargets = model.getTargets([source], linkName, invLinkName);
	    for (let oldTarget of oldTargets) {
		model.removeLink(source, linkName, oldTarget);
	    }
	    addLink(source, linkName, target);
	},

	// Remove a specific link of a given object.
	removeLink(source, linkName, target) {
	    let link = model.getLink(source, linkName);
	    removeLinkInternal(link, target);
	    let invLinkSchema = model.getInvLink("#" + linkName.split(":")[1]);
	    // remove inverse, if present in schema 
	    if (typeof(invLinkSchema) !== "undefined") {
		let invLinkName = "cim:" + invLinkSchema.attributes[0].value.substring(1);
		let invLink = model.getLink(target, invLinkName);
		removeLinkInternal(invLink, source);
	    }
	    model.trigger("removeLink", source, linkName, target);

	    function removeLinkInternal(link, target) {
		// the link may be many-valued
		for (let linkEntry of link) {
		    let targetUUID = linkEntry.attributes.getNamedItem("rdf:resource").value;
		    if (targetUUID === "#" + target.attributes.getNamedItem("rdf:ID").value) {
			let linksMapKey = linkEntry.localName + targetUUID;
			let linksMapValue = model.linksMap.get(linksMapKey);
			linkEntry.remove();
			if (linksMapValue.length === 1) {
			    model.linksMap.delete(linksMapKey);
			} else {
			    linksMapValue.splice(linksMapValue.indexOf(source), 1);
			}
		    }
		}
	    };
	},

	// Returns the inverse of a given link.
	getInvLink(link) {
	    let invRoleNameString = link;
	    if (typeof(link) !== "string") {
		let invRoleName = [].filter.call(link.children, function(el) {
		    return el.nodeName === "cims:inverseRoleName";
		})[0];
		invRoleNameString = invRoleName.attributes[0].value;
	    }
	    // search in EQ schema
	    let allSchemaObjects = model.schemaDataEQ.children[0].children;
	    let invRole = [].filter.call(allSchemaObjects, function(el) {
		return el.attributes[0].value.startsWith(invRoleNameString);
	    })[0];
	    // if fail, search in DL schema
	    if (typeof(invRole) === "undefined") {
		allSchemaObjects = model.schemaDataDL.children[0].children;
		invRole = [].filter.call(allSchemaObjects, function(el) {
		    return el.attributes[0].value.startsWith(invRoleNameString);
		})[0];
	    }
	    // if fail, search in SV schema
	    if (typeof(invRole) === "undefined") {
		allSchemaObjects = model.schemaDataSV.children[0].children;
		invRole = [].filter.call(allSchemaObjects, function(el) {
		    return el.attributes[0].value.startsWith(invRoleNameString);
		})[0];
	    }
	    return invRole;
	},

	// Returns all relations between given sources and other objects,
	// via a given link name. The inverse link name should be supplied too.
	// It doesn't filter by diagram.
	getGraph(sources, linkName, invLinkName, invert) {
	    if (arguments.length === 3) {
		invert = false;
	    }
	    let resultKeys = new Map();
	    let result = [];
	    for (let i in sources) {
		let links = model.getLinks(sources[i]).filter(el => el.localName === linkName);
		for (let j in links) {
		    let targetObj = model.dataMap.get(links[j].attributes[0].value);
		    if (typeof(targetObj) != "undefined") {
			if (invert === false) {
			    result.push({
				source: targetObj,
				target: sources[i]
			    });
			    resultKeys.set(targetObj.attributes.getNamedItem("rdf:ID").value + sources[i].attributes.getNamedItem("rdf:ID").value, 1);
			} else {
			    result.push({
				source: sources[i],
				target: targetObj
			    });
			    resultKeys.set(sources[i].attributes.getNamedItem("rdf:ID").value + targetObj.attributes.getNamedItem("rdf:ID").value, 1);
			}
		    }
		}
		// handle inverse relation
		let allObjs = model.linksMap.get(invLinkName+"#"+sources[i].attributes.getNamedItem("rdf:ID").value);
		if (typeof(allObjs) === "undefined") {
		    continue;
		}
		for (let j = 0; j < allObjs.length; j++) {
		    if (invert === false) {
			if (typeof(resultKeys.get(allObjs[j].attributes.getNamedItem("rdf:ID").value + sources[i].attributes.getNamedItem("rdf:ID").value)) === "undefined") {
			    result.push({
				source: allObjs[j],
				target: sources[i]
			    });
			}
		    } else {
			if (typeof(resultKeys.get(sources[i].attributes.getNamedItem("rdf:ID").value + allObjs[j].attributes.getNamedItem("rdf:ID").value)) === "undefined") {
			    result.push({
				source: sources[i],
				target: allObjs[j]
			    });
			}   
		    }
		}
	    }
	    return result;
	},

	// Returns all the nodes connected with the given sources
	// via the link 'linkName' (or the inverse, 'invLinkName').
	getTargets(sources, linkName, invLinkName) {
	    let graph = model.getGraph(sources, linkName, invLinkName);
	    let targets = graph.map(el => el.source);
	    return [...new Set(targets)]; // we want uniqueness
	},

	// Get a graph of equipments and terminals, for each equipment
	// that have at least one DiagramObject in the current diagram.
	// If an array of equipments is given as argument, only the
	// subgraph for that equipments is returned.
	getConductingEquipmentGraph(identObjs) {
	    let ceEdges = [];
	    if (arguments.length === 0) {
		if (typeof(model.activeDiagram) !== "undefined") {
		    let ioEdges = model.getDiagramObjectGraph();
		    let graphicObjects = ioEdges.map(el => el.source);
		    ceEdges = model.getGraph(graphicObjects, "ConductingEquipment.Terminals", "Terminal.ConductingEquipment", true);
		} 
	    } else {
		if (typeof(model.activeDiagram) !== "undefined") {
		    let ioEdges = model.getDiagramObjectGraph(identObjs);
		    let graphicObjects = ioEdges.map(el => el.source);
		    ceEdges = model.getGraph(graphicObjects, "ConductingEquipment.Terminals", "Terminal.ConductingEquipment", true);
		} else {
		    ceEdges = model.getGraph(identObjs, "ConductingEquipment.Terminals", "Terminal.ConductingEquipment", true);
		}
	    }
	    return ceEdges;
	},

	// Get a graph of objects and DiagramObjects, for each object
	// that have at least one DiagramObject in the current diagram.
	// If an array of objects is given as argument, only the
	// subgraph for that objects is returned.
	getDiagramObjectGraph(identObjs) {
	    let ioEdges = [];
	    if (arguments.length === 0) {
		let allDiagramObjects = []; 
		if (typeof(model.activeDiagram) !== "undefined") {
		    allDiagramObjects = model.getTargets([model.activeDiagram], "Diagram.DiagramObjects", "DiagramObject.Diagram");
		}
		ioEdges = model.getGraph(allDiagramObjects, "DiagramObject.IdentifiedObject", "IdentifiedObject.DiagramObjects");
	    } else {
		if (typeof(model.activeDiagram) !== "undefined") {
		    ioEdges = model.getGraph(identObjs, "IdentifiedObject.DiagramObjects", "DiagramObject.IdentifiedObject", true);
		    let allDiagramObjects = ioEdges.map(el => el.target);
		    allDiagramObjects = model.getGraph(allDiagramObjects, "DiagramObject.Diagram", "Diagram.DiagramObjects").filter(el => el.source === model.activeDiagram).map(el => el.target);
		    ioEdges = model.getGraph(allDiagramObjects, "DiagramObject.IdentifiedObject", "IdentifiedObject.DiagramObjects");
		}
	    }
	    return ioEdges;
	},

	// Get the equipments in the current diagram associated to the
	// given connectivity node.
	getEquipments(connectivityNode) {
	    let cnTerminals = model.getTargets(
		[connectivityNode],
		"ConnectivityNode.Terminals",
		"Terminal.ConnectivityNode");
	    // let's try to get some equipment
	    let equipments = model.getTargets(
		cnTerminals,
		"Terminal.ConductingEquipment",
		"ConductingEquipment.Terminals");
	    equipments = model.getConductingEquipmentGraph(equipments)
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
