"use strict";

function cimDiagramModel() {
    let model = {	
	// load a CIM file from the local filesystem.
	load(file, reader, callback) {
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

	    let allObjects = data.children[0].children;
	    // build a map (UUID)->(object)
	    model.dataMap = new Map(Array.prototype.slice.call(allObjects, 0).map(el => ["#" + el.attributes[0].value, el]));
	    // build a map (link name, target UUID)->(source objects)
	    for (let i in allObjects) {
		if (typeof(allObjects[i].attributes) !== "undefined") {
		    allObjects[i].getAttributes = function() {
			return [].filter.call(this.children, function(el) {
			    return el.attributes.length === 0;
			});
		    };
		    let links = model.getLinks(allObjects[i]);
		    for (let j in links) {
			let key = links[j].localName + links[j].attributes[0].value;
			let val = model.linksMap.get(key);
			if (typeof(val) === "undefined") {
			    model.linksMap.set(key, [allObjects[i]]);
			} else {
			    val.push(allObjects[i]);
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
		.map(el => el.getAttributes()
		     .filter(el => el.nodeName === "cim:IdentifiedObject.name")[0])
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
	    if (model.activeDiagramName === "none") {
		return model.getObjects(type);
	    }
	    let allObjects = model.getDiagramObjectGraph().map(el => el.source);
	    let allObjectsSet = new Set(allObjects); // we want uniqueness
	    return [...allObjectsSet].filter(function(el) {
		return el.nodeName === type;
	    });
	},

	// Get the connectivity nodes that belong to the current diagram.
	getConnectivityNodes() {
	    let self = this;
	    if (model.activeDiagramName === "none") {
		return model.getObjects("cim:ConnectivityNode");
	    }
	    let allConnectivityNodes = model.getObjects("cim:ConnectivityNode");
	    let graphic = model.getGraphicObjects("cim:ConnectivityNode");
	    let graphicSet = new Set(graphic);
	    let nonGraphic = allConnectivityNodes.filter(el => !graphicSet.has(el));
	    nonGraphic = nonGraphic.filter(function(d) {
		let edges = model.getGraph([d], "ConnectivityNode.Terminals", "Terminal.ConnectivityNode", true);
		let cnTerminals = edges.map(el => el.target);
		// let's try to get some equipment
		let equipments = model.getGraph(cnTerminals, "Terminal.ConductingEquipment", "ConductingEquipment.Terminals").map(el => el.source);
		equipments = model.getConductingEquipmentGraph(equipments).map(el => el.source);
		return (equipments.length > 0);
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
	    
	// get all the links of a given object which are actually set.
	getLinks(object) {
	    return [].filter.call(object.children, function(el) {
		return (el.attributes.length > 0) && (el.attributes[0].value.charAt(0) === "#");
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
	    link.attributes[0].value = "#" + target.attributes[0].value;
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
			    resultKeys.set(targetObj.attributes[0].value + sources[i].attributes[0].value, 1);
			} else {
			    result.push({
				source: sources[i],
				target: targetObj
			    });
			    resultKeys.set(sources[i].attributes[0].value + targetObj.attributes[0].value, 1);
			}
		    }
		}
		// handle inverse relation
		let allObjs = model.linksMap.get(invLinkName+"#"+sources[i].attributes[0].value);
		if (typeof(allObjs) === "undefined") {
		    continue;
		}
		for (let j = 0; j < allObjs.length; j++) {
		    if (invert === false) {
			if (typeof(resultKeys.get(allObjs[j].attributes[0].value + sources[i].attributes[0].value)) === "undefined") {
			    result.push({
				source: allObjs[j],
				target: sources[i]
			    });
			}
		    } else {
			if (typeof(resultKeys.get(sources[i].attributes[0].value + allObjs[j].attributes[0].value)) === "undefined") {
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
	            .filter(el => el.getAttributes()
			    .filter(el => el.nodeName === "cim:IdentifiedObject.name")[0].textContent===model.activeDiagramName)[0];
	    }
	    model.trigger("changedDiagram");
	}
    };
    riot.observable(model);
    return model;
};
