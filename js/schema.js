/*
  Fundamental functions to use CGMES schemas.

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

function cimSchema() {
    // CIM schema data.
    // 'EQ' is for the equipment schema
    // 'DL' is for the diagram layout schema
    // 'SV' is the state variables schema
    // 'TP' is the topology schema
    // 'SSH' is the steady state hypothesis schema
    // 'GL' is the Geographical Location schema
    let schemaData = {EQ: null, DL: null, SV: null, TP: null, SSH: null, GL: null};
    // CGMES schema files
    const rdfsEQ = "rdf-schema/EquipmentProfileCoreShortCircuitOperationRDFSAugmented-v2_4_15-16Feb2016.rdf";
    const rdfsDL = "rdf-schema/DiagramLayoutProfileRDFSAugmented-v2_4_15-16Feb2016.rdf";
    const rdfsSV = "rdf-schema/StateVariablesProfileRDFSAugmented-v2_4_15-16Feb2016.rdf";
    const rdfsTP = "rdf-schema/TopologyProfileRDFSAugmented-v2_4_15-16Feb2016.rdf";
    const rdfsSSH = "rdf-schema/SteadyStateHypothesisProfileRDFSAugmented-v2_4_15-16Feb2016.rdf";
    const rdfsGL = "rdf-schema/GeographicalLocationProfileRDFSAugmented-v2_4_15-16Feb2016.rdf";
    let schemaAttrsMap = new Map();
    let schemaLinksMap = new Map();
    let schemaObjsMap = new Map();
    
    // Get all the superclasses for a given type.
    // This function works for any profile, since
    // it is based on the getSchemaObject function.
    // This is a 'private' function (not visible in the model object).
    function getAllSuper(type) {
	let allSuper = [];
	let object = schema.getSchemaObject(type);
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

    let schema = {	
	// A map of schema link names vs inverse schema link name.
	// Used for faster lookup.
	schemaInvLinksMap: new Map(),
	
	// Build initial schema data structures and call a user callback.
	buildSchema(callback) {	
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
			    d3.xml(rdfsTP, function(schemaDataTP) {
				schemaData["TP"] = schemaDataTP;
				populateInvLinkMap(schemaData["TP"]);
				d3.xml(rdfsSSH, function(schemaDataSSH) {
				    schemaData["SSH"] = schemaDataSSH;
				    populateInvLinkMap(schemaData["SSH"]);
				    d3.xml(rdfsGL, function(schemaDataGL) {
					schemaData["GL"] = schemaDataGL;
					populateInvLinkMap(schemaData["GL"]);
					callback(null);
				    });
				});
			    });
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
			schema.schemaInvLinksMap.set(
			    schemaObject.attributes[0].value.substring(1),
			    invRoleName.attributes[0].value.substring(1));
		    }
		}
	    };
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
		// try to get from map
		let schObj = schemaObjsMap.get(profile+type);
		if (typeof(schObj) !== "undefined") {
		    ret = schObj;
		    break;
		}
		// not found in map, search and add it
		let schData = schemaData[profile];
		let allSchemaObjects = schData.children[0].children;
		schObj = [].filter.call(allSchemaObjects, function(el) {
		    return el.attributes[0].value === "#" + type;
		})[0];
		if (typeof(schObj) !== "undefined") {
		    ret = schObj;
		    schemaObjsMap.set(profile+type, schObj);
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
	// An optional 'schemaName' argument can be used to indicate the schema,
	// which can be 'EQ', 'DL' or 'SV'. If the argument is missing, the
	// EQ schema is used.
	getSchemaAttributes(type, schemaName) {
	    let key = type;
	    if (typeof(schemaName) !== "undefined") {
		    key = key + schemaName;
	    } else {
		key = key + "EQ";
	    }
	    let ret = schemaAttrsMap.get(key);
	    if (typeof(ret) === "undefined") {
		let schData = schemaData["EQ"];
		if (typeof(schemaName) !== "undefined") {
		    schData = schemaData[schemaName];
		}
		let allSchemaObjects = schData.children[0].children;
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
		schemaAttrsMap.set(key, ret);
	    }
	    return ret;
	},

	// Get a specific attribute associated to a given type.
	// The type is without namespace, e.g. "Breaker".
	// An optional 'schemaName' argument can be used to indicate the schema,
	// which can be 'EQ', 'DL' or 'SV'. If the argument is missing, the
	// EQ schema is used.
	getSchemaAttribute(type, attrName, schemaName) {
	    let schemaAttributes = schema.getSchemaAttributes(type, schemaName);
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
	    if (schema.isEnum(attr)) {
		return ["#Enum", unit, multiplier];
	    }
	    let type = [].filter.call(attr.children, function(el) {
		return el.nodeName === "cims:dataType";
	    })[0];
	    let typeVal = type.attributes.getNamedItem("rdf:resource").value;
	    let typeObj = schema.getSchemaObject(typeVal.substring(1));
	    let typeStereotype = [].filter.call(typeObj.children, function(el) {
		return el.nodeName === "cims:stereotype";
	    })[0].textContent;
	    
	    if (typeStereotype === "CIMDatatype") {
		let valueObj = schema.getSchemaObject(typeVal.substring(1) + ".value");
		let unitObj = schema.getSchemaObject(typeVal.substring(1) + ".unit");
		let multiplierObj = schema.getSchemaObject(typeVal.substring(1) + ".multiplier");
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
	// An optional 'schemaName' argument can be used to indicate the schema,
	// which can be 'EQ', 'DL', 'SV', 'TP', 'SSH' or 'GL'. If the argument is missing, the
	// EQ schema is used.
	getSchemaLinks(type, schemaName) {
	    let key = type;
	    if (typeof(schemaName) !== "undefined") {
		key = key + schemaName;
	    } else {
		key = key + "EQ";
	    }
	    let ret = schemaLinksMap.get(key);
	    if (typeof(ret) === "undefined") {
		let schData = schemaData["EQ"];
		if (typeof(schemaName) !== "undefined") {
		    schData = schemaData[schemaName];
		}
		let allSchemaObjects = schData.children[0].children;
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
		schemaLinksMap.set(key, ret);
	    }
	    return ret;
	},

	// Get the schema links for a given type, related to any
	// known profile (EQ, DL...).
	getAllSchemasLinks(type) {
	    let ret = [];
	    Object.keys(schemaData).forEach(function(profile) {
		ret = ret.concat(schema.getSchemaLinks(type, profile));
	    });
	    return ret;
	},

	// Get a specific link associated to a given type.
	// The type is without namespace, e.g. "Breaker".
	// An optional 'schemaName' argument can be used to indicate the schema,
	// which can be 'EQ' or 'DL'. If the argument is missing, the
	// EQ schema is used.
	getSchemaLink(type, linkName, schemaName) {
	    let schemaLinks = schema.getSchemaLinks(type, schemaName);
	    return schemaLinks.filter(el => el.attributes[0].value.substring(1) === linkName)[0];
	},

	// Get a specific link associated to a given type, related to any
	// known profile (EQ, DL...).
	getAllSchemasLink(type, linkName) {
	    let schemaLinks = schema.getAllSchemasLinks(type);
	    return schemaLinks.filter(el => el.attributes[0].value.substring(1) === linkName)[0];
	},

    	// Test weather an object is of a given type.
	isA(type, object) {
	    if (getAllSuper(object.localName).indexOf(type) < 0) {
		return false;
	    }
	    return true;
	},

	// Check if a link is set in the correct way (according to CGMES schema).
	// The function doesn't modify the link, it just returns the
	// name of the correct link: this will be equal to linkName if the
	// link is set in the correct way, otherwise it will equal the reverse
	// link name.
	checkLink(source, linkName) {
	    let ret = linkName;
	    let schLink = schema.getAllSchemasLink(source.localName, linkName.split(":")[1]);
	    if (typeof(schLink) !== "undefined") {
		let linkUsed = [].filter.call(schLink.children, function(el) {
		    return el.nodeName === "cims:AssociationUsed";
		})[0];
		if (linkUsed.textContent === "No") {
		let invLinkName = schema.schemaInvLinksMap.get(linkName.split(":")[1]);
		    ret = "cim:" + invLinkName;
		} 
	    }
	    return ret;
	}
    };

    return schema;
};
