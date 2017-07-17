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
    // The Topology namespace
    const tpNS = "http://entsoe.eu/CIM/Topology/4/1";
    // The Steady State Hypothesis namespace
    const sshNS = "http://entsoe.eu/CIM/SteadyStateHypothesis/1/1";
    // The Geographical Location schema
    const glNS = "http://entsoe.eu/CIM/GeographicalLocation/2/1";
    // An empty CIM file, used when creating a new file.
    const emptyFile = "<?xml version=\"1.0\" encoding=\"UTF-8\" ?>" +
          "<rdf:RDF xmlns:cim=\""+ cimNS + "\" xmlns:entsoe=\"" + entsoeNS +
          "\" xmlns:md=\"" + modelNS + "\" xmlns:rdf=\"" + rdfNS + "\">" +
          "</rdf:RDF>";
    // CIM data for the current file.
    // 'all' contains all the CIM Objects, in a single document.
    let data = {all: null};
    // The current mode of operation: NODE_BREAKER or BUS_BRANCH.
    let mode = "NODE_BREAKER";

    // Parse and load an ENTSO-E CIM file.
    // The given callback is called after having loaded the model.
    // This is a 'private' function (not visible in the model object).
    function parseZip(callback, zip) {
        let parser = new DOMParser();
        let zipFilesProcessed = 0;
        let zipFilesTotal = 0;
        let eqdata = null;
        let dldata = null;
        let svdata = null;
        let tpdata = null;
        let sshdata = null;
        let gldata = null;
        function success(content) {
            zipFilesProcessed = zipFilesProcessed + 1;
            if (eqdata === null ||
                dldata === null ||
                svdata === null ||
                tpdata === null ||
                sshdata === null ||
                gldata === null) {
                let parsed = parser.parseFromString(content, "application/xml");
                let fullModel = [].filter.call(
                    parsed.children[0].children, function(el) {
                        return el.nodeName === "md:FullModel";
                    })[0];
                let profile = model.getAttribute(fullModel, "md:Model.profile");
                if (profile.textContent.includes("Equipment")) {
                    eqdata = parsed;
                }
                if (profile.textContent.includes("DiagramLayout")) {
                    dldata = parsed;
                }
                if (profile.textContent.includes("StateVariables")) {
                    svdata = parsed;
                }
                if (profile.textContent.includes("Topology")) {
                    tpdata = parsed;
                }
                if (profile.textContent.includes("SteadyStateHypothesis")) {
                    sshdata = parsed;
                }
                if (profile.textContent.includes("GeographicalLocation")) {
                    gldata = parsed;
                }               
            }
            // at the end we need to have at least the EQ file
            if (eqdata !== null &&
                zipFilesProcessed === zipFilesTotal) {
                let all = parser.parseFromString(emptyFile, "application/xml");
                for (let datum of eqdata.children[0].children) {
                    if (datum.nodeName === "md:FullModel") {
                        continue;
                    }
                    all.children[0].appendChild(datum.cloneNode(true));
                }
                if (dldata !== null) {
                    for (let datum of dldata.children[0].children) {
                        if (datum.nodeName === "md:FullModel") {
                            continue;
                        }
                        all.children[0].appendChild(datum.cloneNode(true));
                    }
                }
                if (svdata !== null) {
                    for (let datum of svdata.children[0].children) {
                        if (datum.nodeName === "md:FullModel") {
                            continue;
                        }
                        all.children[0].appendChild(datum.cloneNode(true));
                    }
                }
                if (tpdata !== null) {
                    for (let datum of tpdata.children[0].children) {
                        if (datum.nodeName === "md:FullModel") {
                            continue;
                        }
                        all.children[0].appendChild(datum.cloneNode(true));
                    }
                }
                if (sshdata !== null) {
                    for (let datum of sshdata.children[0].children) {
                        if (datum.nodeName === "md:FullModel") {
                            continue;
                        }
                        all.children[0].appendChild(datum.cloneNode(true));
                    }
                }
                if (gldata !== null) {
                    for (let datum of gldata.children[0].children) {
                        if (datum.nodeName === "md:FullModel") {
                            continue;
                        }
                        all.children[0].appendChild(datum.cloneNode(true));
                    }
                }

                data.all = all;
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
    
    function cgmesDocument(ns, deps) {
        let parser = new DOMParser();
        let empty = parser.parseFromString(emptyFile, "application/xml");
        // create 'FullModel' element
        let modelDesc = document.createElementNS(modelNS, "md:FullModel");
        empty.children[0].appendChild(modelDesc);
        let modelDescID = modelDesc.setAttribute("rdf:about", "urn:uuid:" + generateUUID().substring(1));
        // set the profile link TODO: use setAttribute()
        let attribute = modelDesc.ownerDocument.createElementNS(modelNS, "md:Model.profile");
        attribute.innerHTML = ns;
        modelDesc.appendChild(attribute);
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
        // handle rdf:about
        for (let i in allObjects) {
            let object = allObjects[i];
            let about = object.attributes.getNamedItem("rdf:about");
            if (about !== null) {
                let target = model.dataMap.get(about.value);
                if (typeof(target) === "undefined") {
                    continue;
                }
                // copy attributes and links
                for (let attr of model.getAttributes(object)) {
                    target.appendChild(attr.cloneNode(true));
                }
                for (let link of model.getLinks(object)) {
                    target.appendChild(link.cloneNode(true));
                    // update links map
                    let key = link.localName + link.attributes[0].value;
                    let val = model.linksMap.get(key);
                    if (typeof(val) === "undefined") {
                        model.linksMap.set(key, [target]);
                    } else {
                        val.push(target);
                    }
                }
                object.remove();
            }
        }
        model.schema.buildSchema(callback);
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
        let invLinkName = model.schema.schemaInvLinksMap.get(linkName);
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
        let uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
            let r = (d + Math.random()*16)%16 | 0;
            d = Math.floor(d/16);
            return (c=="x" ? r : (r&0x3|0x8)).toString(16);
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
        schema: new cimSchema(),
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

        // Serialize the current CIM file as a plain RDF/XML file.
        save() {
            let oSerializer = new XMLSerializer();
            let sXML = "";
            sXML = oSerializer.serializeToString(data.all);
            return sXML;
        },

        // Serialize the current CIM file in CGMES format.
        saveAsCGMES() {
            let oSerializer = new XMLSerializer();
            let zip = new JSZip();
            let all = null;
            // set links according to CGMES schemas
            let linksToChange = [];
            for (let datum of data.all.children[0].children) {
                let links = model.getLinks(datum);
                links.forEach(function(link) {
                    let linkToUse = model.schema.checkLink(datum, link.nodeName);
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
            all = data.all.children[0].cloneNode(true).children;
            // create EQ file
            let eqDoc = profile("EQ", eqNS, all, []);
            // create DL file
            let dlDoc = profile("DL", dlNS, all, [eqDoc]);
            // create SV file
            let svDoc = profile("SV", svNS, all, [eqDoc]);
            // create TP file
            let tpDoc = profile("TP", tpNS, all, [eqDoc]);
            // create SSH file
            let sshDoc = profile("SSH", sshNS, all, [eqDoc]);
            // create GL file
            let glDoc = profile("GL", glNS, all, [eqDoc]);
            zip.file("EQ.xml", oSerializer.serializeToString(eqDoc));
            zip.file("DL.xml", oSerializer.serializeToString(dlDoc));
            zip.file("SV.xml", oSerializer.serializeToString(svDoc));
            zip.file("TP.xml", oSerializer.serializeToString(tpDoc));
            zip.file("SSH.xml", oSerializer.serializeToString(sshDoc));
            zip.file("GL.xml", oSerializer.serializeToString(glDoc));
            return zip.generateAsync({type:"blob", compression: "DEFLATE"});

            function profile(name, ns, data, deps) {
                let all = [].filter.call(data, function(el) {
                    let obj = model.schema.getSchemaObject(el.localName, name);
                    return (obj !== null); 
                });
                let doc = cgmesDocument(ns, deps);
                populateProfile(doc, all, name);
                return doc;
            };
            
            function populateProfile(doc, data, profile) {
                for (let i in data) {
                    let datum = data[i].cloneNode();
                    // take profile attributes
                    let attrs = model.getAttributes(data[i]);
                    attrs.forEach(function(attr) {
                        let schAttr = model.schema.getSchemaAttribute(datum.localName, attr.localName, profile);
                        if (typeof(schAttr) !== "undefined") {
                            datum.appendChild(attr);
                        }
                    });
                    // take profile links
                    let links = model.getLinks(data[i]);
                    links.forEach(function(link) {                
                        let schLink = model.schema.getSchemaLink(datum.localName, link.localName, profile);
                        if (typeof(schLink) !== "undefined") {
                            datum.appendChild(link);
                        }
                    });
                    // take profile enums
                    let enums = model.getEnums(data[i]);
                    enums.forEach(function(en) {                  
                        let schEnum = model.schema.getSchemaAttribute(datum.localName, en.localName, profile);
                        if (typeof(schEnum) !== "undefined") {
                            datum.appendChild(en);
                        }
                    });
                    // handle rdf:about
                    let isAbout = model.schema.isDescription(datum, profile);
                    let isConcrete = model.schema.isConcrete(datum, profile);
                    if (isAbout === true) {
                        // we must use rdf:about
                        let idVal = datum.attributes.getNamedItem("rdf:ID").value; 
                        datum.removeAttribute("rdf:ID");
                        let about = datum.ownerDocument.createAttribute("rdf:about");
                        about.value = "#" + idVal;
                        datum.setAttributeNode(about);
                    }
                    if (isConcrete === true && (isAbout === false || datum.children.length > 0)) {
                        doc.children[0].appendChild(datum);
                    }
                }
            };
        },

        // Serialize the current diagram. Nodes are cloned, otherwise they would
        // be removed from the original document.
        export() {
            let parser = new DOMParser();
            let serializer = new XMLSerializer();
            let data = parser.parseFromString(emptyFile, "application/xml");
            if (typeof(model.activeDiagram) === "undefined") {
                return serializer.serializeToString(data);
            }
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
            let allNodes = model.getNodes();
            for (let node of allNodes) {
                data.children[0].appendChild(node.cloneNode(true));
            }
            let allEqContainers = model.getLinkedObjects(
                ["cim:Substation", "cim:Line"],
                ["EquipmentContainer.Equipments"]);
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
            
            let sXML = serializer.serializeToString(data);
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

        // Get all the objects which have 'superType' as a superclass
        getSubObjects(superType) {
            let allObjects = getAllObjects();
            return allObjects.filter(function(el) {
                return model.schema.isA(superType, el) === true;
            });
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

        // Get the nodes that belong to the current diagram. Depending on the
        // mode of operation, they will be connectivity nodes or
        // topological nodes.
        getNodes() {
            let nodesType = "cim:ConnectivityNode";
            if (mode === "BUS_BRANCH") {
                nodesType = "cim:TopologicalNode";
            }
            let allNodes = model.getObjects([nodesType])[nodesType];
            let graphic = model.getGraphicObjects([nodesType])[nodesType];
            let nonGraphic = allNodes.filter(el => graphic.indexOf(el) === -1);
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
                    let cn = model.getNode(d);
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
        // via the given links. Each link can also be composed of multiple
        // 'steps', in case the path to the equipment is a complex one.
        // The 'steps' are separated by a slash '/'.
        // For example, to 
        // The 'types' parameter must be an array of
        // namespace qualified types, like ["cim:Substation", "cim:Line"].
        // The output is an object whose keys are the types and the values
        // are the corresponding arrays, like {cim:Substation: [sub1, sub2],
        // cim:Line: [line1]}. Each object returned is an Element.
        // This function is useful for many CIM objects, like:
        // Substations, Lines, Measurements, GeneratingUnits, RegulatingControls.
        getLinkedObjects(types, pathNames) {
            let ret = {};
            for (let type of types) {
                ret[type] = model.getObjects([type])[type].filter(function(src) {
                    let srcs = [src];
                    let targets = [];
                    for (let pathName of pathNames) {
                        let pathParts = pathName.split("/");
                        let curTargets = [src];
                        for (let i=0; i < pathParts.length - 1; i++) {
                            curTargets = model.getTargets(curTargets, pathParts[i]);  
                        }
                        srcs = srcs.concat(curTargets);
                    }
                    
                    for (let pathName of pathNames) {
                        let pathParts = pathName.split("/");
                        let last = pathParts.length - 1;
                        targets = targets.concat(model.getTargets(srcs, pathParts[last]));
                    }
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
                attribute = object.ownerDocument.createElementNS(cimNS, attrName);
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
            if (model.schema.isA("ConductingEquipment", newElement) === false) {
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
                let nodesType = "ConnectivityNode";
                if (mode === "BUS_BRANCH") {
                    nodesType = "TopologicalNode";
                }
                let node = model.cimObject("cim:" + nodesType);
                addLink(term1, "cim:Terminal." + nodesType, node);
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
            // handle nodes
            if (object.nodeName === "cim:ConnectivityNode" || object.nodeName === "cim:TopologicalNode") {
                objsToDelete = getBusbars(object);
            }
            // handle busbars
            if (object.nodeName === "cim:BusbarSection") {
                objsToDelete = getNode(object);
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
                if (model.schema.isA("ConductingEquipment", object)) {
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

            // Functions to navigate busbars <-> nodes.
            // Depending on the mode of operation, they will be connectivity nodes
            // or topological nodes.
            // These are internal to this function, since they don't
            // filter by diagram, while in all other situations you
            // want that filter.
            function getNode(busbar) {
                let nodesType = "ConnectivityNode";
                if (mode === "BUS_BRANCH") {
                    nodesType = "TopologicalNode";
                }
                if (busbar.nodeName === "cim:BusbarSection") {
                    let terminal = model.getTargets(
                        [busbar],
                        "ConductingEquipment.Terminals");
                    let cn = model.getTargets(
                        terminal,
                        "Terminal." + nodesType);
                    return cn;          
                }
                return [];
            };

            function getBusbars(node) {
                let nodeTerm = "ConnectivityNode.Terminals";
                if (mode === "BUS_BRANCH") {
                    nodeTerm = "TopologicalNode.Terminal";
                }
                let terminals = model.getTargets(
                    [node],
                    nodeTerm);
                // let's try to get some equipment
                let equipments = model.getTargets(
                    terminals,
                    "Terminal.ConductingEquipment");
                let busbars = equipments.filter(
                    el => el.nodeName === "cim:BusbarSection");
                return busbars;
            };

            model.trigger("deleteObject", objUUID);
        },

        // Function to navigate busbar -> node.
        // Depending on the mode of operation, it will be a connectivity node
        // or a topological node.
        getNode(busbar) {
            let nodesType = "ConnectivityNode";
            if (mode === "BUS_BRANCH") {
                nodesType = "TopologicalNode";
            }
            if (busbar.nodeName === "cim:BusbarSection") {
                let terminal = model.getTargets(
                    [busbar],
                    "ConductingEquipment.Terminals");
                let cn = model.getTargets(
                    terminal,
                    "Terminal." + nodesType);
                if (cn.length === 0) {
                    return null;
                }
                return cn[0];
            }
            return null;
        },

        // Function to navigate node -> busbar.
        // Depending on the mode of operation, it must be a connectivity node
        // or a topological node.
        // It filters by diagram (i.e. the busbar
        // OR the node must be in the diagram).
        getBusbar(node) {
            let nodeTerm = "ConnectivityNode.Terminals";
            if (mode === "BUS_BRANCH") {
                nodeTerm = "TopologicalNode.Terminal";
            }
            let terminals = model.getTargets(
                [node],
                nodeTerm);
            let equipments = model.getTargets(
                terminals,
                "Terminal.ConductingEquipment");
            let busbars = equipments.filter(el => el.localName === "BusbarSection");
            let dobjs = model.getDiagramObjects([node].concat(busbars));
            if (busbars.length > 0 && dobjs.length > 0) {
                return busbars[0];
            }
            return null;
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
            if ((object.nodeName === "cim:ConnectivityNode" || object.nodeName === "cim:TopologicalNode") && dobjs.length === 0) {
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
            let document = data.all;
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
            let invLinkName = model.schema.schemaInvLinksMap.get(linkName.split(":")[1]);
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
        // given node.
        // Depending on the mode of operation, it must be a connectivity node
        // or a topological node.
        getEquipments(node) {
            let nodeTerm = "ConnectivityNode.Terminals";
            if (mode === "BUS_BRANCH") {
                nodeTerm = "TopologicalNode.Terminal";
            }
            
            let terminals = model.getTargets(
                [node],
                nodeTerm);
            // let's try to get some equipment
            let equipments = model.getTargets(
                terminals,
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
        },

        getMode() {
            return mode;
        },
        
        setMode(newMode) {
            if (newMode === "NODE_BREAKER" || newMode === "BUS_BRANCH") {
                mode = newMode;
            }
            model.trigger("setMode", mode);
        }
    };
    riot.observable(model);
    return model;
};
