"use strict";

function cimDiagramModel() {
    return {
	// load a CIM file.
	load(file, reader, callback) {
	    reader.onload = function(e) {
		let self = this;
                let parser = new DOMParser();
		let data = parser.parseFromString(reader.result, "application/xml");
		this.data = data;
		this.linksMap = new Map();
		this.conductingEquipmentGraphs = new Map();
		this.diagramObjectGraphs = new Map();
		this.diagramObjectPointGraphs = new Map();
		this.activeDiagramName = "none";
		this.schemaAttributesMap = new Map();
		this.schemaLinksMap = new Map();

		let allObjects = data.children[0].children;
		// build a map (UUID)->(object)
		this.dataMap = new Map(Array.prototype.slice.call(allObjects, 0).map(el => ["#" + el.attributes[0].value, el]));
		// build a map (link name, target UUID)->(source objects)
		for (let i in allObjects) {
		    if (typeof(allObjects[i].attributes) !== "undefined") {
			allObjects[i].getAttributes = function() {
			    return [].filter.call(this.children, function(el) {
				return el.attributes.length === 0;
			    });
			};
			let links = this.getLinks(allObjects[i]);
			for (let j in links) {
			    let key = links[j].localName + links[j].attributes[0].value;
			    let val = this.linksMap.get(key);
			    if (typeof(val) === "undefined") {
				this.linksMap.set(key, [allObjects[i]]);
			    } else {
				val.push(allObjects[i]);
			    }
			}   
		    } 
		}
		// let's read a schema file
		let rdfs = "rdf-schema/EquipmentProfileRDFSAugmented-v2_4_15-7Aug2014.rdf";
		d3.xml(rdfs, function(schemaData) {
		    self.schemaData = schemaData;
		});
		
		riot.observable(this);
		callback();
	    }.bind(this);
	    reader.readAsText(file);
	},

	// serialize the current CIM file.
	save() {
	    var oSerializer = new XMLSerializer();
	    var sXML = oSerializer.serializeToString(this.data);
	    return sXML;
	},

	// get a list of diagrams in the current CIM file.
	getDiagramList() {
	    let diagrams = this.getObjects("cim:Diagram")
		.map(el => el.getAttributes()
		     .filter(el => el.nodeName === "cim:IdentifiedObject.name")[0])
		.map(el => el.textContent);
	    return diagrams;
	},

	// Get the objects of a given type (doesn't filter by diagram).
	getObjects(type) {
	    let allObjects = this.data.children[0].children;
	    return [].filter.call(allObjects, function(el) {
		return el.nodeName === type;
	    });
	},

	getSchemaObject(type) {
	    let allSchemaObjects = this.schemaData.children[0].children;
	    return [].filter.call(allSchemaObjects, function(el) {
		return el.attributes[0].value === "#" + type;
	    })[0];
	},

	getSchemaAttributes(type) {
	    let ret = this.schemaAttributesMap.get(type);
	    if (typeof(ret) === "undefined") {
		let allSchemaObjects = this.schemaData.children[0].children;
		ret = [].filter.call(allSchemaObjects, function(el) {
		    return el.attributes[0].value.startsWith("#" + type + ".");
		});
		let supers = this.getAllSuper(type);
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
		this.schemaAttributesMap.set(type, ret);
	    }
	    
	    return ret;
	},

	getSchemaLinks(type) {
	    let ret = this.schemaLinksMap.get(type);
	    if (typeof(ret) === "undefined") {
		let allSchemaObjects = this.schemaData.children[0].children;
		ret = [].filter.call(allSchemaObjects, function(el) {
		    return el.attributes[0].value.startsWith("#" + type + ".");
		});
		let supers = this.getAllSuper(type);
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
		this.schemaLinksMap.set(type, ret);
	    }
	    return ret;
	},

	getAllSuper(type) {
	    let allSuper = [];
	    let object = this.getSchemaObject(type);
	    let aSuper = [].filter.call(object.children, function(el) {
		return el.nodeName === "rdfs:subClassOf";
	    })[0];
	    if (typeof(aSuper) !== "undefined") {
		let aSuperName = aSuper.attributes[0].value.substring(1);
		allSuper.push(aSuperName);
		allSuper = allSuper.concat(this.getAllSuper(aSuperName));
	    }
	    return allSuper;
	},

	// Get the objects of a given type that have at least one
	// DiagramObject in the current diagram.
	getGraphicObjects(type) {
	    if (this.activeDiagramName === "none") {
		return this.getObjects(type);
	    }
	    let allObjects = this.getDiagramObjectGraph().map(el => el.source);
	    let allObjectsSet = new Set(allObjects); // we want uniqueness
	    return [...allObjectsSet].filter(function(el) {
		return el.nodeName === type;
	    });
	},

	// Get the connectivity nodes that belong to the current diagram.
	getConnectivityNodes() {
	    let self = this;
	    if (this.activeDiagramName === "none") {
		return this.getObjects("cim:ConnectivityNode");
	    }
	    let allConnectivityNodes = this.getObjects("cim:ConnectivityNode");
	    let graphic = this.getGraphicObjects("cim:ConnectivityNode");
	    let graphicSet = new Set(graphic);
	    let nonGraphic = allConnectivityNodes.filter(el => !graphicSet.has(el));
	    nonGraphic = nonGraphic.filter(function(d) {
		let edges = self.getGraph([d], "ConnectivityNode.Terminals", "Terminal.ConnectivityNode", true);
		let cnTerminals = edges.map(el => el.target);
		// let's try to get some equipment
		let equipments = self.getGraph(cnTerminals, "Terminal.ConductingEquipment", "ConductingEquipment.Terminals").map(el => el.source);
		equipments = self.getConductingEquipmentGraph(equipments).map(el => el.source);
		return (equipments.length > 0);
	    });
	    return graphic.concat(nonGraphic);
	},

	// Get the equipment containers that belong to the current diagram.
	getEquipmentContainers(type) {
	    let self = this;
	    let allContainers = this.getObjects(type);
	    let allGraphicObjects = this.getDiagramObjectGraph().map(el => el.source);
	    return allContainers.filter(function(container) {
		let allContainedObjects = self.getGraph([container], "EquipmentContainers.Equipment", "Equipment.EquipmentContainer").map(el => el.source);
		let graphicContainedObjects = self.getDiagramObjectGraph(allContainedObjects);
		return (graphicContainedObjects.length > 0);
	    });
	},

	// get all the terminals of a given object.
	getTerminals(identObjs) {
	    let terminals = this.getConductingEquipmentGraph(identObjs).map(el => el.target);
	    let terminalsSet = new Set(terminals);
	    terminals = [...terminalsSet]; // we want uniqueness
	    return terminals;
	},

	// get all objects (doesn't filter by diagram).
	getAllObjects() {
	    return this.data.children[0].children;
	},

	// get an object given its UUID.
	getObject(uuid) {
	    return this.dataMap.get("#" + uuid);
	},

	// get all the attributes of a given object which are actually set.
	getAttributes(object) {
	    return [].filter.call(object.children, function(el) {
		return el.attributes.length === 0;
	    });
	},

	// get a specific attribute of a given object.
	getAttribute(object, attrName) {
	    let attributes = this.getAttributes(object);
	    return attributes.filter(el => el.nodeName === attrName)[0];
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
	    let links = this.getLinks(object);
	    return links.filter(el => el.nodeName === linkName)[0];
	},

	// get a specific enum of a given object.
	getEnum(object, enumName) {
	    let enums = this.getEnums(object);
	    return enums.filter(el => el.nodeName === enumName)[0];
	},

	// set a specific link of a given object.
	setLink(source, linkSchema, target) {
	    let linkName = "cim:" + linkSchema.attributes[0].value.substring(1);
	    let link = this.getLink(source, linkName);
	    // handle inverse relation
	    let invLinkName = [].filter.call(linkSchema.children, function(el) {
		return el.localName === "inverseRoleName";
	    })[0].attributes[0].value;
	    invLinkName = "cim:" + invLinkName.substring(1);
	    let actTarget = this.dataMap.get(link.attributes[0].value);
	    let invLink = this.getLink(actTarget, invLinkName);
	    if (typeof(invLink) !== "undefined") {
		invLink.remove();
	    }
	    // set the new value
	    link.attributes[0].value = "#" + target.attributes[0].value;
	},

	// resolve a given link.
	resolveLink(link) {
	    return this.dataMap.get(link.attributes[0].value);
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
		let links = this.getLinks(sources[i]).filter(el => el.localName === linkName);
		for (let j in links) {
		    let targetObj = this.dataMap.get(links[j].attributes[0].value);
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
		let allObjs = this.linksMap.get(invLinkName+"#"+sources[i].attributes[0].value);
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
		ceEdges = this.conductingEquipmentGraphs.get(this.activeDiagramName);
		if (typeof(ceEdges) === "undefined") {
		    if (typeof(this.activeDiagram) !== "undefined") {
			let ioEdges = this.getDiagramObjectGraph();
			let graphicObjects = ioEdges.map(el => el.source);
			ceEdges = this.getGraph(graphicObjects, "ConductingEquipment.Terminals", "Terminal.ConductingEquipment", true);
		    } 
		    this.conductingEquipmentGraphs.set(this.activeDiagramName, ceEdges);
		}
	    } else {
		if (typeof(this.activeDiagram) !== "undefined") {
		    let ioEdges = this.getDiagramObjectGraph(identObjs);
		    let graphicObjects = ioEdges.map(el => el.source);
		    ceEdges = this.getGraph(graphicObjects, "ConductingEquipment.Terminals", "Terminal.ConductingEquipment", true);
		} else {
		    ceEdges = this.getGraph(identObjs, "ConductingEquipment.Terminals", "Terminal.ConductingEquipment", true);
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
		ioEdges = this.diagramObjectGraphs.get(this.activeDiagramName);
		if (typeof(ioEdges) === "undefined") {
		    let allDiagramObjects = []; 
		    if (typeof(this.activeDiagram) !== "undefined") {
			allDiagramObjects = this.getGraph([this.activeDiagram], "Diagram.DiagramObjects", "DiagramObject.Diagram").map(el => el.source);
		    }
		    ioEdges = this.getGraph(allDiagramObjects, "DiagramObject.IdentifiedObject", "IdentifiedObject.DiagramObjects");
	 	    this.diagramObjectGraphs.set(this.activeDiagramName, ioEdges);
		}
	    } else {
		if (typeof(this.activeDiagram) !== "undefined") {
		    ioEdges = this.getGraph(identObjs, "IdentifiedObject.DiagramObjects", "DiagramObject.IdentifiedObject", true);
		    let allDiagramObjects = ioEdges.map(el => el.target);
		    allDiagramObjects = this.getGraph(allDiagramObjects, "DiagramObject.Diagram", "Diagram.DiagramObjects").filter(el => el.source === this.activeDiagram).map(el => el.target);
		    ioEdges = this.getGraph(allDiagramObjects, "DiagramObject.IdentifiedObject", "IdentifiedObject.DiagramObjects");
		}
	    }
	    return ioEdges;
	},

	// Get a graph of DiagramObjects and DiagramObjectPoints
	// for the current diagram.
	getDiagramObjectPointGraph(diagObjs) {
	    let doEdges = [];
	    if (arguments.length === 0) {
		doEdges = this.diagramObjectPointGraphs.get(this.activeDiagramName);
	    if (typeof(doEdges) === "undefined") {
		let ioEdges = this.getDiagramObjectGraph();
		let allDiagramObjects = ioEdges.map(el => el.target);
		doEdges = this.getGraph(allDiagramObjects, "DiagramObject.DiagramObjectPoints", "DiagramObjectPoint.DiagramObject", true);
		this.diagramObjectPointGraphs.set(this.activeDiagramName, doEdges);
	    }
	    } else {
		doEdges = this.getGraph(diagObjs, "DiagramObject.DiagramObjectPoints", "DiagramObjectPoint.DiagramObject", true);
	    }
	    return doEdges;
	},

	// Selects a given diagram in the current CIM file.
	// TODO: perform some checks...
	selectDiagram(diagramName) {
	    if (diagramName !== this.activeDiagramName) {
		this.activeDiagramName = diagramName;
		this.activeDiagram = this.getObjects("cim:Diagram")
	            .filter(el => el.getAttributes()
			    .filter(el => el.nodeName === "cim:IdentifiedObject.name")[0].textContent===this.activeDiagramName)[0];
	    }
	},

	getEquipments(connectivityNode) {
	    let edges = this.getGraph([connectivityNode], "ConnectivityNode.Terminals", "Terminal.ConnectivityNode", true);
	    let cnTerminals = edges.map(el => el.target);
	    // let's try to get some equipment
	    let equipments = this.getGraph(cnTerminals, "Terminal.ConductingEquipment", "ConductingEquipment.Terminals").map(el => el.source);
	    equipments = this.getConductingEquipmentGraph(equipments).map(el => el.source);
	    return [...new Set(equipments)]; // we want uniqueness
	}
    }
};
