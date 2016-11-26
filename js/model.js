"use strict";

function cimDiagramModel() {
    let emptyFile = "<?xml version=\"1.0\" encoding=\"UTF-8\" ?><rdf:RDF xmlns:cim=\"http://iec.ch/TC57/2010/CIM-schema-cim15#\" xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\"></rdf:RDF>";
    
    let model = {	
	// load a CIM file from the local filesystem.
	load(file, reader, callback) {
	    if (reader === null) {
		let parser = new DOMParser();
		let data = parser.parseFromString(emptyFile, "application/xml");
		model.buildModel(data, callback);
		model.fileName = file.name;
		return;
	    }
	    
	    if (model.fileName !== file.name) {
		reader.onload = function(e) {
                    let parser = new DOMParser();
		    let data = parser.parseFromString(reader.result, "application/xml");
		    model.buildModel(data, callback);
		}
		model.fileName = file.name;
		reader.readAsText(file);
	    } else {
		callback(null);
	    }
	},

	// load a CIM file from a remote location
	loadRemote(fileName, callback) {
	    if (model.fileName !== decodeURI(fileName).substring(1)) {
		model.fileName = decodeURI(fileName).substring(1);
		d3.xml(fileName, function(error, data) {
		    if (error !== null) {
			callback(error);
			return;
		    }
		    model.buildModel(data, callback);
		});
	    } else {
		callback(null);
	    }
	},

	buildModel(data, callback) {
	    model.data = data;
	    model.dataMap = new Map();
	    model.linksMap = new Map();
	    model.activeDiagramName = "none";
	    model.schemaAttributesMap = new Map();
	    model.schemaLinksMap = new Map();

	    // build a map (UUID)->(object) and a map (link name, target UUID)->(source objects)
	    for (let i in data.children[0].children) {
		let object = data.children[0].children[i];
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
	    
	    // let's read a schema file
	    let rdfs = "rdf-schema/EquipmentProfileRDFSAugmented-v2_4_15-7Aug2014.rdf";
	    d3.xml(rdfs, function(schemaData) {
		model.schemaData = schemaData;
		callback(null);
	    });
	},

	// serialize the current CIM file.
	save() {
	    var oSerializer = new XMLSerializer();
	    var sXML = oSerializer.serializeToString(model.data);
	    return sXML;
	},

	// serialize the current diagram.
	export() {
	    let emptyFile = "<?xml version=\"1.0\" encoding=\"UTF-8\" ?><rdf:RDF xmlns:cim=\"http://iec.ch/TC57/2010/CIM-schema-cim15#\" xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\"></rdf:RDF>";
	    let parser = new DOMParser();
	    let data = parser.parseFromString(emptyFile, "application/xml");
	    // fill the file
	    data.children[0].appendChild(model.activeDiagram);
	    let allDiagramObjects = model.getGraph([model.activeDiagram], "Diagram.DiagramObjects", "DiagramObject.Diagram").map(el => el.source);
	    for (let diagramObject of allDiagramObjects) {
		data.children[0].appendChild(diagramObject);
	    }
	    let allEquipments = model.getGraph(allDiagramObjects, "DiagramObject.IdentifiedObject", "IdentifiedObject.DiagramObjects").map(el => el.source);
	    for (let equipment of allEquipments) {
		data.children[0].appendChild(equipment);
	    }
	    let allDiagramObjectPoints = model.getGraph(allDiagramObjects, "DiagramObject.DiagramObjectPoints", "DiagramObjectPoint.DiagramObject").map(el => el.source);
	    for (let diagramObjectPoint of allDiagramObjectPoints) {
		data.children[0].appendChild(diagramObjectPoint);
	    }
	    let allTerminals = model.getTerminals(allEquipments);
	    for (let terminal of allTerminals) {
		data.children[0].appendChild(terminal);
	    }
	    let allConnectivityNodes = model.getConnectivityNodes();
	    for (let connectivityNode of allConnectivityNodes) {
		data.children[0].appendChild(connectivityNode);
	    }
	    let allSubstations = model.getEquipmentContainers("cim:Substation");
	    for (let substation of allSubstations) {
		data.children[0].appendChild(substation);
	    }
	    let allLines = model.getEquipmentContainers("cim:Line");
	    for (let line of allLines) {
		data.children[0].appendChild(line);
	    }
	    let allBaseVoltages = model.getGraph(allEquipments, "ConductingEquipment.BaseVoltage", "BaseVoltage.ConductingEquipment").map(el => el.source)
	    console.log(allBaseVoltages);
	    for (let baseVoltage of allBaseVoltages) {
		data.children[0].appendChild(baseVoltage);
	    }
	    let allTrafoEnds = model.getGraph(allEquipments, "PowerTransformer.PowerTransformerEnd", "PowerTransformerEnd.PowerTransformer").map(el => el.source);
	    for (let trafoEnd of allTrafoEnds) {
		data.children[0].appendChild(trafoEnd);
	    }
		
	    var oSerializer = new XMLSerializer();
	    var sXML = oSerializer.serializeToString(data);
	    return sXML;
	},

	// get a list of diagrams in the current CIM file.
	getDiagramList() {
	    let diagrams = model.getObjects("cim:Diagram")
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
	getObjects(type) {
	    let allObjects = model.data.children[0].children;
	    return [].filter.call(allObjects, function(el) {
		return el.nodeName === type;
	    });
	},

	getObjects1(types) {
	    let ret = {};
 	    let allObjects = model.data.children[0].children;
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

	getSchemaObject(type) {
	    let allSchemaObjects = model.schemaData.children[0].children;
	    return [].filter.call(allSchemaObjects, function(el) {
		return el.attributes[0].value === "#" + type;
	    })[0];
	},

	getSchemaAttributes(type) {
	    let ret = model.schemaAttributesMap.get(type);
	    if (typeof(ret) === "undefined") {
		let allSchemaObjects = model.schemaData.children[0].children;
		ret = [].filter.call(allSchemaObjects, function(el) {
		    return el.attributes[0].value.startsWith("#" + type + ".");
		});
		let supers = model.getAllSuper(type);
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
		model.schemaAttributesMap.set(type, ret);
	    }
	    
	    return ret;
	},

	getSchemaLinks(type) {
	    let ret = model.schemaLinksMap.get(type);
	    if (typeof(ret) === "undefined") {
		let allSchemaObjects = model.schemaData.children[0].children;
		ret = [].filter.call(allSchemaObjects, function(el) {
		    return el.attributes[0].value.startsWith("#" + type + ".");
		});
		let supers = model.getAllSuper(type);
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
		model.schemaLinksMap.set(type, ret);
	    }
	    return ret;
	},

	getAllSuper(type) {
	    let allSuper = [];
	    let object = model.getSchemaObject(type);
	    let aSuper = [].filter.call(object.children, function(el) {
		return el.nodeName === "rdfs:subClassOf";
	    })[0];
	    if (typeof(aSuper) !== "undefined") {
		let aSuperName = aSuper.attributes[0].value.substring(1);
		allSuper.push(aSuperName);
		allSuper = allSuper.concat(model.getAllSuper(aSuperName));
	    }
	    return allSuper;
	},

	// Get the objects of a given type that have at least one
	// DiagramObject in the current diagram.
	getGraphicObjects1(types) {
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

	getGraphicObjects(type) {
 	    let allObjects = model.getDiagramObjectGraph().map(el => el.source);
	    let allObjectsSet = new Set(allObjects); // we want uniqueness
	    return [...allObjectsSet].filter(function(el) {
		return el.nodeName === type;
	    });
	},

	// Get the connectivity nodes that belong to the current diagram.
	getConnectivityNodes() {
	    let allConnectivityNodes = model.getObjects("cim:ConnectivityNode");
	    let graphic = model.getGraphicObjects("cim:ConnectivityNode");
	    let nonGraphic = allConnectivityNodes.filter(el => graphic.indexOf(el) === -1);
	    nonGraphic = nonGraphic.filter(function(d) {
		let edges = model.getGraph([d], "ConnectivityNode.Terminals", "Terminal.ConnectivityNode", true);
		let cnTerminals = edges.map(el => el.target);
		// let's try to get some equipment
		let equipments = model.getGraph(cnTerminals, "Terminal.ConductingEquipment", "ConductingEquipment.Terminals").map(el => el.source);
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
	getEquipmentContainers(type) {
	    let allContainers = model.getObjects(type);
	    return allContainers.filter(function(container) {
		let allContainedObjects = model.getGraph([container], "EquipmentContainers.Equipment", "Equipment.EquipmentContainer").map(el => el.source);
		let graphicContainedObjects = model.getDiagramObjectGraph(allContainedObjects);
		return (graphicContainedObjects.length > 0);
	    });
	},

	// get all the terminals of a given object.
	getTerminals(identObjs) {
	    let terminals = model.getConductingEquipmentGraph(identObjs).map(el => el.target);
	    let terminalsSet = new Set(terminals);
	    terminals = [...terminalsSet]; // we want uniqueness
	    return terminals;
	},

	// get all objects (doesn't filter by diagram).
	getAllObjects() {
	    return model.data.children[0].children;
	},

	// get an object given its UUID.
	getObject(uuid) {
	    return model.dataMap.get("#" + uuid);
	},

	// get all the attributes of a given object which are actually set.
	getAttributes(object) {
	    return [].filter.call(object.children, function(el) {
		return el.attributes.length === 0;
	    });
	},

	// get a specific attribute of a given object.
	getAttribute(object, attrName) {
	    if (typeof(object) === "undefined") {
		return "undefined";
	    }
	    let attributes = model.getAttributes(object);
	    return attributes.filter(el => el.nodeName === attrName)[0];
	},

	// set a specific attribute of a given object. If it doesen't exists, it is created.
	setAttribute(object, attrName, value) {
	    let attribute = model.getAttribute(object, attrName);
	    if (typeof(attribute) !== "undefined") {
		attribute.innerHTML = value;
	    } else {
		attribute = model.data.createElement(attrName);
		attribute.innerHTML = value;
		object.appendChild(attribute);
	    }
	    model.trigger("setAttribute", object, attrName, value);
	    return;
	},

	// create an object of a given type
	createObject(type) {
	    let newElement = model.cimObject(type);
	    model.setAttribute(newElement, "cim:IdentifiedObject.name", "new1");
	    let term = model.createTerminal(newElement);
	    // create second terminal if needed
	    if (type === "cim:ACLineSegment" ||
		type === "cim:Breaker" ||
		type === "cim:Disconnector" ||
		type === "cim:LoadBreakSwitch" ||
		type === "cim:Jumper" ||
		type === "cim:Junction") {
		model.createTerminal(newElement);
	    }
	    if (type === "cim:BusbarSection") {
		let cn = model.cimObject("cim:ConnectivityNode");
		model.addLink(term, "cim:Terminal.ConnectivityNode", cn);
	    }
	    model.trigger("createObject", newElement);
	    return newElement;
	},

	// delete an object: also, delete its terminals and graphic objects
	deleteObject(object) {
	    let objUUID = object.attributes.getNamedItem("rdf:ID").value;
	    // delete terminals, if any
	    /*let terminals = model.getTerminals([object]);
	    for (let terminal of terminals) {
		model.deleteObject(terminal);
	    }
	    // delete graphic objects, if any (TODO: must search in ALL the diagrams)
	    let dobjs = model.getDiagramObjectGraph([object]).map(el => el.target);
	    let points = model.getDiagramObjectPointGraph(dobjs).map(el => el.target);
	    for (let dobj of dobjs) {
		model.deleteObject(dobj);
	    }
	    for (let point of points) {
		model.deleteObject(point);
	    }*/
	    // all the links to 'object' must be deleted
	    let keysToDelete = [];
	    let sourcesToDelete = [];
	    for (let [linkAndTarget, sources] of model.linksMap) {
		if (linkAndTarget.endsWith(objUUID)) {
		    let invLinkName = "cim:" + linkAndTarget.split("#")[0];
		    for (let source of sources) {
			let invLink = model.getLink(source, invLinkName);
			invLink.remove();
			keysToDelete.push(linkAndTarget);
			if (["cim:Terminal", "cim:DiagramObject", "cim:DiagramObjectPoint"].indexOf(source.nodeName)) {
			    sourcesToDelete.push(source);
			}
		    }
		}
		let idx = sources.indexOf(object);
		if (idx > -1) {
		    console.log(linkAndTarget.split("#")[1]);
		    let target = model.dataMap.get("#" + linkAndTarget.split("#")[1]);
		    sources.splice(idx, 1);
		    if (["cim:Terminal", "cim:DiagramObject", "cim:DiagramObjectPoint"].indexOf(target.nodeName)) {
			model.deleteObject(target);
		    }
		    
		}
	    }
	    // update the 'linksMap' map
	    for (let keyToDelete of keysToDelete) {
		model.linksMap.delete(keyToDelete);
	    }
	    for (let sourceToDelete of sourcesToDelete) {
		model.deleteObject(sourceToDelete);
	    }
	    
	    // update the 'dataMap' map
	    model.dataMap.delete("#" + objUUID);
	    // delete the object
	    object.remove();

	    model.trigger("deleteObject", objUUID);
	},

	// delete an object from the current diagram
	deleteFromDiagram(object) {
	    let objUUID = object.attributes.getNamedItem("rdf:ID").value;
	    let dobjs = model.getDiagramObjectGraph([object]).map(el => el.target);
	    let points = model.getDiagramObjectPointGraph(dobjs).map(el => el.target);
	    for (let dobj of dobjs) {
		model.deleteObject(dobj);
	    }
	    for (let point of points) {
		model.deleteObject(point);
	    }
	    model.trigger("deleteFromDiagram", objUUID);
	},

	// add a terminal to a given object
	createTerminal(object) {
	    let term = model.cimObject("cim:Terminal");
	    model.addLink(object, "cim:ConductingEquipment.Terminals", term);
	    return term;
	},

	// add an object to the active diagram
	addToActiveDiagram(object, lineData) {
	    if (lineData.length < 1) {
		return;
	    }
	    // create a diagram object and a diagram object point
	    let dobj = model.cimObject("cim:DiagramObject");
	    for (let linePoint of lineData) {
		let point = model.cimObject("cim:DiagramObjectPoint");
		model.setAttribute(point, "cim:DiagramObjectPoint.xPosition", linePoint.x + object.x);
		model.setAttribute(point, "cim:DiagramObjectPoint.yPosition", linePoint.y + object.y);
		model.setAttribute(point, "cim:DiagramObjectPoint.sequenceNumber", linePoint.seq);
		model.addLink(dobj, "cim:DiagramObject.DiagramObjectPoints", point);
	    }
	    model.addLink(object, "cim:IdentifiedObject.DiagramObjects", dobj);
	    model.addLink(dobj, "cim:DiagramObject.Diagram", model.activeDiagram);
	    model.trigger("addToActiveDiagram", object);
	},

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
	    let doEdges = model.getDiagramObjectPointGraph(dobjs);
	    let points = doEdges.map(el => el.target);
	    if (points.length > 0) {
		for (let point of points) {
		    let seq = 1;
		    let seqObject = model.getAttribute(point, "cim:DiagramObjectPoint.sequenceNumber");
		    if (typeof(seqObject) !== "undefined") {
			seq = parseInt(seqObject.innerHTML);
		    }
		    let actLineData = object.lineData.filter(el => el.seq === seq)[0];
		    if (typeof(actLineData) === "undefined") {
			console.log(object);
		    }
		    model.getAttribute(point, "cim:DiagramObjectPoint.xPosition").innerHTML = actLineData.x + object.x;
		    model.getAttribute(point, "cim:DiagramObjectPoint.yPosition").innerHTML = actLineData.y + object.y;
		}
	    } else {
		model.addToActiveDiagram(object, object.lineData);
	    }
	},

	cimObject(name) {
	    let obj = model.data.createElementNS("http://iec.ch/TC57/2010/CIM-schema-cim15#", name);
	    model.data.children[0].appendChild(obj);
	    let objID = model.data.createAttribute("rdf:ID");
	    objID.nodeValue = generateUUID();
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
	
	// get all the links of a given object which are actually set.
	getLinks(object) {
	    return [].filter.call(object.children, function(el) {
		let resource = el.attributes.getNamedItem("rdf:resource");
		if (el.attributes.length === 0 || resource === null) {
		    return false;
		}
		return (resource.value.charAt(0) === "#");
	    });
	},

	// get all the enums of a given object which are actually set.
	getEnums(object) {
	    return [].filter.call(object.children, function(el) {
		return (el.attributes.length > 0) && (el.attributes[0].value.charAt(0) !== "#");
	    });
	},

	// get a specific link of a given object.
	// If the link is many-valued, it mey return more than one element
	getLink(object, linkName) {
	    let links = model.getLinks(object);
	    return links.filter(el => el.nodeName === linkName);
	},

	// get a specific enum of a given object.
	getEnum(object, enumName) {
	    let enums = model.getEnums(object);
	    return enums.filter(el => el.nodeName === enumName)[0];
	},

	// set a specific link of a given object.
	// If a link with the same name already exists, it is removed.
	setLink(source, linkName, target) {
	    let invLinkSchema = self.model.getInvLink(linkName);
	    let invLinkName = "cim:" + invLink.attributes[0].value.substring(1);
	    let graph = self.model.getGraph([source], linkName, invLinkName);
	    let oldTargets = graph.map(el => el.source);
	    for (let oldTarget of oldTargets) {
		model.removeLink(source, linkName, oldTarget);
	    }
	    model.addLink(source, linkName, target);
	},

	addLink(source, linkName, target) {
	    let invLink = self.model.getInvLink(linkName);
	    let invLinkName = "cim:" + invLink.attributes[0].value.substring(1);
	    let graph = self.model.getGraph([source], linkName, invLinkName);
	    // see if the link is already set
	    if (graph.length > 0) {
		return;
	    }
	    let link = model.data.createElementNS("http://iec.ch/TC57/2010/CIM-schema-cim15#", linkName);
	    let linkValue = model.data.createAttribute("rdf:resource");
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
	    if (target.nodeName === "cim:Terminal" && source.nodeName === "cim:ConnectivityNode") {
		model.trigger("setEdge", source, target);
	    }
	    if (source.nodeName === "cim:Terminal" && target.nodeName === "cim:ConnectivityNode") {
		model.trigger("setEdge", target, source);
	    }
	},

	// TODO: should trigger an event
	removeLink(source, linkName, target) {
	    let link = model.getLink(source, linkName);
	    let invLinkSchema = self.model.getInvLink(linkName);
	    let invLinkName = "cim:" + invLinkSchema.attributes[0].value.substring(1);
	    let invLink = model.getLink(target, invLinkName);
	    removeLinkInternal(link, target);
	    removeLinkInternal(invLink, source);

	    function removeLinkInternal(link, target) {
		// the link may be many-valued
		for (let linkEntry of link) {
		    let targetUUID = linkEntry.attributes.getNamedItem("rdf:resource").value;
		    if (targetUUID === target.attributes.getNamedItem("rdf:ID").value) {
			linkEntry.remove();
			let linksMapKey = link.nodeName + targetUUID;
			let linksMapValue = model.linksMap.get(linksMapKey);
			if (linksMapValue.length === 1) {
			    model.linksMap.delete(linksMapKey);
			} else {
			    linksMapValue.splice(linksMapValue.indexOf(source), 1);
			}
		    }
		}
	    };
	},

	// resolve a given link.
	resolveLink(link) {
	    return model.dataMap.get(link.attributes[0].value);
	},

	// returns the inverse of a given link
	getInvLink(link) {
	    let invRoleNameString = link;
	    if (typeof(link) !== "string") {
		let invRoleName = [].filter.call(link.children, function(el) {
		    return el.nodeName === "cims:inverseRoleName";
		})[0];
		invRoleNameString = invRoleName.attributes[0].value;
	    }
	    let allSchemaObjects = model.schemaData.children[0].children;
	    let invRole = [].filter.call(allSchemaObjects, function(el) {
		return el.attributes[0].value.startsWith(invRoleNameString);
	    })[0];
	    return invRole;
	},

	// returns all relations between given sources and other objects,
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
		    allDiagramObjects = model.getGraph([model.activeDiagram], "Diagram.DiagramObjects", "DiagramObject.Diagram").map(el => el.source);
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

	// Get a graph of DiagramObjects and DiagramObjectPoints
	// for the current diagram.
	getDiagramObjectPointGraph(diagObjs) {
	    let doEdges = [];
	    if (arguments.length === 0) {
		let ioEdges = model.getDiagramObjectGraph();
		let allDiagramObjects = ioEdges.map(el => el.target);
		doEdges = model.getGraph(allDiagramObjects, "DiagramObject.DiagramObjectPoints", "DiagramObjectPoint.DiagramObject", true);
	    } else {
		doEdges = model.getGraph(diagObjs, "DiagramObject.DiagramObjectPoints", "DiagramObjectPoint.DiagramObject", true);
	    }
	    return doEdges;
	},

	getEquipments(connectivityNode) {
	    let edges = model.getGraph([connectivityNode], "ConnectivityNode.Terminals", "Terminal.ConnectivityNode", true);
	    let cnTerminals = edges.map(el => el.target);
	    // let's try to get some equipment
	    let equipments = model.getGraph(cnTerminals, "Terminal.ConductingEquipment", "ConductingEquipment.Terminals").map(el => el.source);
	    equipments = model.getConductingEquipmentGraph(equipments).map(el => el.source);
	    return [...new Set(equipments)]; // we want uniqueness
	},

	// Selects a given diagram in the current CIM file.
	// TODO: perform some checks...
	selectDiagram(diagramName) {
	    if (diagramName !== model.activeDiagramName) {
		model.activeDiagramName = diagramName;
		model.activeDiagram = model.getObjects("cim:Diagram")
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
