"use strict";

function cimDiagramModel() {
    return {
	load(file, reader, callback) {
	    reader.onload = function(e) {
                let parser = new DOMParser();
		let data = parser.parseFromString(reader.result, "application/xml");
		this.data = data;
		this.dataMap = new Map();
		this.linksMap = new Map();
		this.conductingEquipmentGraphs = new Map();
		this.diagramObjectGraphs = new Map();
		this.diagramObjectPointGraphs = new Map();
		this.activeDiagramName = "none";

		let allObjects = data.children[0].children;
		for (let i in allObjects) {
		    if (typeof(allObjects[i].attributes) !== "undefined") {
			this.dataMap.set(("#" + allObjects[i].attributes[0].value), allObjects[i]);
			allObjects[i].getAttributes = function() {
			    return [].filter.call(this.children, function(el) {
				return el.attributes.length === 0;
			    });
			};
			allObjects[i].getAttribute = function(attrName) {
			    let attributes = this.getAttributes();
			    return attributes.filter(el => el.nodeName === attrName)[0];
			};
			/*allObjects[i].getLinks = function() {
			    return [].filter.call(this.children, function(el) {
				return el.attributes.length > 0;
			    });
			};*/
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
		riot.observable(this);
		callback();
	    }.bind(this);
	    reader.readAsText(file);
	},

	// serialize test
	save() {
	    var oSerializer = new XMLSerializer();
	    var sXML = oSerializer.serializeToString(this.data);
	    return sXML;
	},
	
	getDiagramList() {
	    let diagrams = this.getObjects("cim:Diagram")
		.map(el => el.getAttributes()
		     .filter(el => el.nodeName === "cim:IdentifiedObject.name")[0])
		.map(el => el.textContent);
	    return diagrams;
	},

	getObjects(type) {
	    let allObjects = this.data.children[0].children;
	    return [].filter.call(allObjects, function(el) {
		return el.nodeName === type;
	    });
	},

	getAllObjects() {
	    return this.data.children[0].children;
	},

	getObject(uuid) {
	    return this.dataMap.get("#" + uuid);
	},

	getLinks(object) {
	    return [].filter.call(object.children, function(el) {
		return el.attributes.length > 0;
	    });
	},

	resolveLink(link) {
	    return this.dataMap.get(link.attributes[0].value);
	},

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
		}
	    }
	    return ceEdges;
	},

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
		    let allDiagramObjects = this.getGraph(identObjs, "IdentifiedObject.DiagramObjects", "DiagramObject.IdentifiedObject").map(el => el.source);
		    allDiagramObjects = this.getGraph(allDiagramObjects, "DiagramObject.Diagram", "Diagram.DiagramObjects").filter(el => el.source === this.activeDiagram).map(el => el.target);
		    ioEdges = this.getGraph(allDiagramObjects, "DiagramObject.IdentifiedObject", "IdentifiedObject.DiagramObjects");
		}
	    }
	    return ioEdges;
	},

	getDiagramObjectPointGraph() {
	    let doEdges = this.diagramObjectPointGraphs.get(this.activeDiagramName);
	    if (typeof(doEdges) === "undefined") {
		let ioEdges = this.getDiagramObjectGraph();
		let allDiagramObjects = ioEdges.map(el => el.target);
		doEdges = this.getGraph(allDiagramObjects, "DiagramObject.DiagramObjectPoints", "DiagramObjectPoint.DiagramObject", true);
		this.diagramObjectPointGraphs.set(this.activeDiagramName, doEdges);
	    }
	    return doEdges;
	},

	// TODO: perform some checks...
	selectDiagram(diagramName) {
	    this.activeDiagramName = diagramName;
	    this.activeDiagram = this.getObjects("cim:Diagram")
	        .filter(el => el.getAttributes()
			.filter(el => el.nodeName === "cim:IdentifiedObject.name")[0].textContent===this.activeDiagramName)[0];
	}
    }
};
