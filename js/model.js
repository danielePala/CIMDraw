"use strict";

function cimDiagramModel() {
    //let emptyFile = "<?xml version=\"1.0\" encoding=\"UTF-8\" ?><rdf:RDF xmlns:cim=\"http://iec.ch/TC57/2010/CIM-schema-cim15#\" xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\"></rdf:RDF>";
    
    let model = {	
	// load a CIM file from the local filesystem.
	load(file, reader, callback) {
	    /*if (arguments.length === 1) {
		let parser = new DOMParser();
		let data = parser.parseFromString(emptyFile, "application/xml");
		model.buildModel(data, callback);
		model.fileName = "new1"; //TODO: should be parametrized
		return;
	    }*/
	    
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
	    model.linksMap = new Map();
	    model.conductingEquipmentGraphs = new Map();
	    model.diagramObjectGraphs = new Map();
	    model.diagramObjectPointGraphs = new Map();
	    model.activeDiagramName = "none";
	    model.schemaAttributesMap = new Map();
	    model.schemaLinksMap = new Map();

	    let allObjects = [].filter.call(data.children[0].children, function(el) {
		return el.attributes.getNamedItem("rdf:ID") !== null;
	    });
	    // build a map (UUID)->(object)
	    model.dataMap = new Map(Array.prototype.slice.call(allObjects, 0).map(el => ["#" + el.attributes.getNamedItem("rdf:ID").value, el]));
	    // build a map (link name, target UUID)->(source objects)
	    for (let i in allObjects) {
	      let object = allObjects[i];
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
	    let rdfs = "/rdf-schema/EquipmentProfileRDFSAugmented-v2_4_15-7Aug2014.rdf";
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
	    let self = this;
	    let allContainers = model.getObjects(type);
	    let allGraphicObjects = model.getDiagramObjectGraph().map(el => el.source);
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
	    // create two terminals (not always right)
	    let term1 = model.cimObject("cim:Terminal");
	    let term2 = model.cimObject("cim:Terminal");	    
	    model.addLink(newElement, "cim:ConductingEquipment.Terminals", term1);
	    model.addLink(newElement, "cim:ConductingEquipment.Terminals", term2);
	    
	    model.trigger("createObject", newElement);
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
	    model.diagramObjectGraphs.get(model.activeDiagramName).push({source: object, target: dobj});
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
		return (el.attributes.length > 0) && (el.attributes.getNamedItem("rdf:resource").value.charAt(0) === "#");
	    });
	},

	// get all the enums of a given object which are actually set.
	getEnums(object) {
	    return [].filter.call(object.children, function(el) {
		return (el.attributes.length > 0) && (el.attributes[0].value.charAt(0) !== "#");
	    });
	},

	// get a specific link of a given object.
	getLink(object, linkName) {
	    let links = model.getLinks(object);
	    return links.filter(el => el.nodeName === linkName)[0];
	},

	// get a specific enum of a given object.
	getEnum(object, enumName) {
	    let enums = model.getEnums(object);
	    return enums.filter(el => el.nodeName === enumName)[0];
	},

	// set a specific link of a given object.
	setLink(source, linkSchema, target) {
	    let linkName = "cim:" + linkSchema.attributes[0].value.substring(1);
	    let link = model.getLink(source, linkName);
	    if (typeof(link) === "undefined") {
		model.addLink(source, linkName, target);
	    } else {
		// handle inverse relation
		let invLinkName = [].filter.call(linkSchema.children, function(el) {
		    return el.localName === "inverseRoleName";
		})[0].attributes[0].value;
		invLinkName = "cim:" + invLinkName.substring(1);
		let actTarget = model.dataMap.get(link.attributes[0].value);
		let invLink = model.getLink(actTarget, invLinkName);
		if (typeof(invLink) !== "undefined") {
		    invLink.remove();
		}
		// set the new value
		link.attributes[0].value = "#" + target.attributes.getNamedItem("rdf:ID").value;
	    }
	    if (target.nodeName === "cim:Terminal" && source.nodeName === "cim:ConnectivityNode") {
		model.trigger("setEdge", source, target);
	    }
	    if (source.nodeName === "cim:Terminal" && target.nodeName === "cim:ConnectivityNode") {
		model.trigger("setEdge", target, source);
	    }
	},

	addLink(source, linkName, target) {
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
	},

	// resolve a given link.
	resolveLink(link) {
	    return model.dataMap.get(link.attributes[0].value);
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
		ceEdges = model.conductingEquipmentGraphs.get(model.activeDiagramName);
		if (typeof(ceEdges) === "undefined") {
		    if (typeof(model.activeDiagram) !== "undefined") {
			let ioEdges = model.getDiagramObjectGraph();
			let graphicObjects = ioEdges.map(el => el.source);
			ceEdges = model.getGraph(graphicObjects, "ConductingEquipment.Terminals", "Terminal.ConductingEquipment", true);
		    } 
		    model.conductingEquipmentGraphs.set(model.activeDiagramName, ceEdges);
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
		ioEdges = model.diagramObjectGraphs.get(model.activeDiagramName);
		if (typeof(ioEdges) === "undefined") {
		    let allDiagramObjects = []; 
		    if (typeof(model.activeDiagram) !== "undefined") {
			allDiagramObjects = model.getGraph([model.activeDiagram], "Diagram.DiagramObjects", "DiagramObject.Diagram").map(el => el.source);
		    }
		    ioEdges = model.getGraph(allDiagramObjects, "DiagramObject.IdentifiedObject", "IdentifiedObject.DiagramObjects");
	 	    model.diagramObjectGraphs.set(model.activeDiagramName, ioEdges);
		}
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
		doEdges = model.diagramObjectPointGraphs.get(model.activeDiagramName);
		if (typeof(doEdges) === "undefined") {
		    let ioEdges = model.getDiagramObjectGraph();
		    let allDiagramObjects = ioEdges.map(el => el.target);
		    doEdges = model.getGraph(allDiagramObjects, "DiagramObject.DiagramObjectPoints", "DiagramObjectPoint.DiagramObject", true);
		    model.diagramObjectPointGraphs.set(model.activeDiagramName, doEdges);
		}
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
