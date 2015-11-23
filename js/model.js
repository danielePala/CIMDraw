let cimDiagramModel = {

    dataMap: new Map(),
    
    load: function(filename, callback) {
	d3.xml(filename, function(error, data) {
	    console.log(error, data);
	    this.data = data;

	    let allObjects = data.children[0].children;
	    for (i in allObjects) {
		if (typeof(allObjects[i].attributes) !== "undefined") {
		    this.dataMap.set(("#" + allObjects[i].attributes[0].value), allObjects[i]);
		    allObjects[i].getAttributes = function() {
			return [].filter.call(this.children, function(el) {
			    return el.attributes.length === 0;
			});
		    };
		    allObjects[i].getLinks = function() {
			return [].filter.call(this.children, function(el) {
			    return el.attributes.length > 0;
			});
		    };
		} 
	    }
	    callback(error);
	}.bind(this));
    },
	      
    getDiagramList: function() {
	let diagrams = this.getObjects("cim:Diagram")
	    .map(el => el.getAttributes()
		 .filter(el => el.nodeName === "cim:IdentifiedObject.name")[0])
	    .map(el => el.textContent);
	return diagrams;
    },

    getObjects: function(type) {
	let allObjects = this.data.children[0].children;
	return [].filter.call(allObjects, function(el) {
	    return el.nodeName === type;
	});
    },

    getAllObjects: function() {
	return this.data.children[0].children;
    },

    resolveLink: function(link) {
	return [].filter.call(this.data, function(el) {
	    return (el.attributes[0].value) === link.attributes[0].value;
	})[0];
    },

    getGraph: function(sources, linkName) {
	let result = [];
	for (i in sources) {
	    let links = sources[i].getLinks().filter(el => el.localName === linkName);
	    for (j in links) {
		let targetObj = this.dataMap.get(links[j].attributes[0].value);
		if (typeof(targetObj) != "undefined") {
		    result.push({
			weight: 1,
			source: targetObj,
			target: sources[i]
		    });
		}
	    }
	}
	return result;
    }
};
