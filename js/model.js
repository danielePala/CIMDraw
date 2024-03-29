/*
 Fundamental functions to load and manipulate CIM RDF/XML files.

 Copyright 2017-2021 Daniele Pala <pala.daniele@gmail.com>

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
    // The Eqipment Core namespace.
    const eqcNS = "http://entsoe.eu/CIM/EquipmentCore/3/1";
    // The Eqipment Operation namespace.
    const eqoNS = "http://entsoe.eu/CIM/EquipmentOperation/3/1";
    // The Eqipment Short Circuit namespace.
    const eqsNS = "http://entsoe.eu/CIM/EquipmentShortCircuit/3/1";
    // The Diagram Layout namespace.
    const dlNS = "http://entsoe.eu/CIM/DiagramLayout/3/1";
    // The State Variables namespace.
    const svNS = "http://entsoe.eu/CIM/StateVariables/4/1";
    // The Topology namespace
    const tpNS = "http://entsoe.eu/CIM/Topology/4/1";
    // The Steady State Hypothesis namespace
    const sshNS = "http://entsoe.eu/CIM/SteadyStateHypothesis/1/1";
    // The Geographical Location namespace
    const glNS = "http://entsoe.eu/CIM/GeographicalLocation/2/1";
    // An empty CIM file, used when creating a new file.
    const emptyFile = "<?xml version=\"1.0\" encoding=\"UTF-8\" ?>" +
          "<rdf:RDF xmlns:cim=\""+ cimNS + "\" xmlns:entsoe=\"" + entsoeNS +
          "\" xmlns:md=\"" + modelNS + "\" xmlns:rdf=\"" + rdfNS + "\">" +
          "</rdf:RDF>";
    // CIM data for the current file.
    // 'all' contains all the CIM Objects, in a single document.
    let data = {all: null};
    let dataMap = new Map();
    let linksMap = new Map();
    // The current mode of operation: NODE_BREAKER or BUS_BRANCH.
    let mode = "NODE_BREAKER";

    // Parse and load an ENTSO-E CIM file. Returns a promise which resolves
    // after successful initialization.
    // This is a 'private' function (not visible in the model object).
    function parseZip(isBoundary) {
        let parser = new DOMParser();
        let eqdata = [];
        let dldata = [];
        let svdata = [];
        let tpdata = [];
        let sshdata = [];
        let gldata = [];
        let eqbdata = null;
        let tpbdata = null;
        
        function parseUnzipped(content) {
            for (const cimfile in content) {
                let parser = new DOMParser();
                let cimXML = fflate.strFromU8(content[cimfile]);
                let parsedXML = parser.parseFromString(cimXML, "application/xml");
                if (parsedXML.children.length > 0) {
                    if (parsedXML.children[0].nodeName !== "rdf:RDF") {
                        // parsing has failed
                        return Promise.reject(new DOMException("invalid input file."));
                    }
                }
                if (eqdata.length === 0 ||
                    dldata.length === 0 ||
                    svdata.length === 0 ||
                    tpdata.length === 0 ||
                    sshdata.length === 0 ||
                    gldata.length === 0 ||
                    eqbdata === null ||
                    tpbdata === null) {
                    
                    let fullModel = [].filter.call(
                        parsedXML.children[0].children, function(el) {
                            return el.nodeName === "md:FullModel";
                        })[0];
                    if (typeof(fullModel) === "undefined") {
                        return Promise.reject("error: invalid CGMES file.");
                    }
                    let profile = model.getAttribute(fullModel, "md:Model.profile");
                    if (profile.textContent.includes("Equipment")) {
                        if (profile.textContent.includes("Boundary") === false) {
                            eqdata.push(parsedXML);
                        } else {
                            eqbdata = parsedXML;
                        }
                    }
                    if (profile.textContent.includes("DiagramLayout")) {
                        dldata.push(parsedXML);
                    }
                    if (profile.textContent.includes("StateVariables")) {
                        svdata.push(parsedXML);
                    }
                    if (profile.textContent.includes("Topology")) {
                        if (profile.textContent.includes("Boundary") === false) {
                            tpdata.push(parsedXML);
                        } else {
                            tpbdata = parsedXML;
                        }
                    }
                    if (profile.textContent.includes("SteadyStateHypothesis")) {
                        sshdata.push(parsedXML);
                    }
                    if (profile.textContent.includes("GeographicalLocation")) {
                        gldata.push(parsedXML);
                    }               
                }
            }
            return Promise.resolve();
        };

        return function(zip) {
            let result = unzip(new Uint8Array(zip)).then(parseUnzipped).then(function() {
                // at the end we need to have at least the EQ file
                if (eqdata.length > 0 && isBoundary === false) {
                    let all = parser.parseFromString(emptyFile, "application/xml");
                    for (let eqfile of eqdata) {
                        for (let datum of eqfile.children[0].children) {
                            if (datum.nodeName === "md:FullModel") {
                                continue;
                            }
                            all.children[0].appendChild(datum.cloneNode(true));
                        }
                    }
                    for (let dlfile of dldata) {
                        for (let datum of dlfile.children[0].children) {
                            if (datum.nodeName === "md:FullModel") {
                                continue;
                            }
                            all.children[0].appendChild(datum.cloneNode(true));
                        }
                    }
                    for (let svfile of svdata) {
                        for (let datum of svfile.children[0].children) {
                            if (datum.nodeName === "md:FullModel") {
                                continue;
                            }
                            all.children[0].appendChild(datum.cloneNode(true));
                        }
                    }
                    for (let tpfile of tpdata) {
                        for (let datum of tpfile.children[0].children) {
                            if (datum.nodeName === "md:FullModel") {
                                continue;
                            }
                            all.children[0].appendChild(datum.cloneNode(true));
                        }
                    }
                    for (let sshfile of sshdata) {
                        for (let datum of sshfile.children[0].children) {
                            if (datum.nodeName === "md:FullModel") {
                                continue;
                            }
                            all.children[0].appendChild(datum.cloneNode(true));
                        }
                    }
                    for (let glfile of gldata) {
                        for (let datum of glfile.children[0].children) {
                            if (datum.nodeName === "md:FullModel") {
                                continue;
                            }
                            all.children[0].appendChild(datum.cloneNode(true));
                        }
                    }
                    if (eqbdata !== null) {
                        for (let datum of eqbdata.children[0].children) {
                            if (datum.nodeName === "md:FullModel") {
                                continue;
                            }
                            all.children[0].appendChild(datum.cloneNode(true));
                        }
                    }
                    if (tpbdata !== null) {
                        for (let datum of tpbdata.children[0].children) {
                            if (datum.nodeName === "md:FullModel") {
                                continue;
                            }
                            all.children[0].appendChild(datum.cloneNode(true));
                        }
                    }

                    data.all = all;
                    return buildModel();
                } else {
                    // else, maybe this is a boundary file?
                    // In this case we load it, but only if we already have a
                    // valid model loaded.
                    if (data.all === null || isBoundary === false) {
                        return Promise.reject("Invalid CGMES file: no equipment description found.");
                    }
                    if (eqbdata !== null) {
                        let bdObjects = eqbdata.children[0].children;
                        let bdNodes = [].filter.call(bdObjects, function(el) {
                            return el.nodeName === "cim:ConnectivityNode"; 
                        });
                        let bdNum = bdNodes.filter(el => model.isBoundary(el)).length;
                        
                        model.updateModel(eqbdata);
                        if (tpbdata !== null) {
                            model.updateModel(tpbdata);
                        }
                        return Promise.resolve("Loaded " + bdNum + " boundary nodes.");
                    }
                    return Promise.reject("Invalid boundary file: no equipment boundary file found.");
                }
            }).catch(function(e) {
                // if boundary loading failed there is no need to clear the model
                if (isBoundary === false) {
                    model.clear();
                }
                return Promise.reject(e);
            });
            return result;
        };
    };

    function zip(inputFiles) {
        return new Promise(function(resolve, reject) {
            fflate.zip(inputFiles, (err, zipped) => {
                if (err === null) {
                    resolve(new Blob([zipped.buffer]));
                } else {
                    reject(new DOMException("problem zipping input files."));
                }
              })
        });
    };

    function unzip(inputFile) {
        return new Promise(function(resolve, reject) {
            fflate.unzip(inputFile, (err, unzipped) => {
                if (err === null) {
                    resolve(unzipped);
                } else {
                    reject(new DOMException("problem unzipping input file."));
                }
              })
        });
    };

    // plain RDF/XML file loading with promise wrapper. This
    // function uses the FileReader API but wrapped in a promise-based
    // pattern. Copied with minor modifications from StackOverflow.
    // This is a 'private' function (not visible in the model object).
    function readUploadedFileAsText(inputFile) {
        const reader = new FileReader();

        return new Promise(function(resolve, reject) {
            reader.onerror = function() {
                reader.abort();
                reject(new DOMException("problem parsing input file."));
            };

            reader.onload = function() {
                let parser = new DOMParser();
                let cimXML = reader.result;
                let parsedXML = parser.parseFromString(cimXML, "application/xml");
                if (parsedXML.children.length > 0) {
                    if (parsedXML.children[0].nodeName !== "rdf:RDF") {
                        // parsing has failed
                        reject(new DOMException("invalid input file."));
                    }
                }
                resolve(parsedXML);
            };
            reader.readAsText(inputFile);
        });
    };

    function readAsArrayBuffer(inputFile) {
        const reader = new FileReader();

        return new Promise(function(resolve, reject) {
            reader.onerror = function() {
                reader.abort();
                reject(new DOMException("problem parsing input file."));
            };

            reader.onload = function() {
                resolve(reader.result);
            };
            reader.readAsArrayBuffer(inputFile);
        });
    };

    // Create a new RDF/XML document according to CGMES rules.
    // In particular, the CGMES namespaces are given in the 'nss' parameter
    // and possible dependencies may be specified in the 'deps' parameter.
    // This is a 'private' function (not visible in the model object).
    function cgmesDocument(nss, deps) {
        let parser = new DOMParser();
        let empty = parser.parseFromString(emptyFile, "application/xml");
        // create 'FullModel' element
        let modelDesc = document.createElementNS(modelNS, "md:FullModel");
        empty.children[0].appendChild(modelDesc);
        let modelDescID = modelDesc.setAttribute("rdf:about", "urn:uuid:" + generateUUID().substring(1));
        // set the profile link TODO: use setAttribute()
        nss.forEach(function(ns) {
            let attribute = modelDesc.ownerDocument.createElementNS(modelNS, "md:Model.profile");
            attribute.innerHTML = ns;
            modelDesc.appendChild(attribute);
        });
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

    
    // Build initial model data structures. Returns a promise which resolves
    // after successful initialization.
    // This is a 'private' function (not visible in the model object).
    function buildModel() {     
        // build a map (UUID)->(object) and a map
        // (link name, target UUID)->(source objects)
        let allObjects = getAllObjects();
        for (let i in allObjects) {
            let object = allObjects[i];
            let uuid = model.ID(object);
            if (uuid === null) {
                continue;
            }
            dataMap.set("#" + uuid, object);
            if (typeof(object.attributes) !== "undefined") {
                let links = model.getLinks(object);
                for (let link of links) {
                    let key = link.localName + link.attributes[0].value;
                    let val = linksMap.get(key);
                    if (typeof(val) === "undefined") {
                        linksMap.set(key, [object]);
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
                let target = dataMap.get(about.value);
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
                    let val = linksMap.get(key);
                    if (typeof(val) === "undefined") {
                        linksMap.set(key, [target]);
                    } else {
                        val.push(target);
                    }
                }
                object.remove();
            }
        }
        return model.schema.buildSchema();
    };

    // Get all objects (doesn't filter by diagram).
    // This is a 'private' function (not visible in the model object).
    function getAllObjects() {
        let ret = [];
        for (let i of Object.keys(data)) {
            if (typeof(data[i]) !== "undefined" && data[i] !== null) {
                ret = ret.concat([...data[i].children[0].children]);
            }
        }
        return ret;
    };

    // Create a given CIM object
    // This is a 'private' function (not visible in the model object).
    function cimObject(name, options) {
        let uuid = undefined;
        if (typeof(options) !== "undefined") {
            uuid = options.uuid;
        }
        let document = data.all;
        let obj = document.createElementNS(cimNS, name);
        document.children[0].appendChild(obj);
        if (typeof(uuid) !== "undefined") {
            obj.setAttributeNS(rdfNS, "rdf:ID", uuid);
        } else {
            obj.setAttributeNS(rdfNS, "rdf:ID", generateUUID());
        }
        dataMap.set("#" + model.ID(obj), obj);
        return obj;
    };

    // Add a terminal to a given object.
    // This is a 'private' function (not visible in the model object).
    function createTerminal(object) {
        let term = cimObject("cim:Terminal");
        addLink(term, "cim:Terminal.ConductingEquipment", object);
        // The "connected" attribute is mandatory (in SSH).
        model.setAttribute(term, "cim:ACDCTerminal.connected", "true");
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
        source.appendChild(link);
        // set the new value
        link.setAttributeNS(rdfNS, "rdf:resource", "#" + model.ID(target));
        
        let key = link.localName + link.attributes[0].value;
        let val = linksMap.get(key);
        if (typeof(val) === "undefined") {
            linksMap.set(key, [source]);
        } else {
            val.push(source);
        }
        model.trigger("addLink", source, linkName, target);
    };

    // Returns all relations between given sources and other objects,
    // via a given link name.
    // It doesn't filter by diagram.
    // This is a 'private' function (not visible in the model object).
    function getGraph(sources, linkName) {
        let invLinkName = model.schema.schemaInvLinksMap.get(linkName);
        let resultKeys = new Map();
        let result = [];
        for (let source of sources) {
            let srcUUID = model.ID(source);
            let links = model.getLink(source, "cim:" + linkName);
            for (let link of links) {
                let target = dataMap.get(
                    link.attributes.getNamedItem("rdf:resource").value);
                if (typeof(target) !== "undefined") {
                    let dstUUID = model.ID(target);
                    result.push({
                        source: source,
                        target: target
                    });
                    resultKeys.set(srcUUID + dstUUID, 1);
                }
            }
            // handle inverse relation
            let targets = linksMap.get(invLinkName + "#" + srcUUID);
            if (typeof(targets) === "undefined") {
                continue;
            }
            for (let target of targets) {
                let dstUUID = model.ID(target);
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

    // Get all the enums of a given object which are actually set.
    // This is a 'private' function (not visible in the model object).
    function getEnumElements(object) {
        return [].filter.call(object.children, function(el) {
            let resource = el.attributes.getNamedItem("rdf:resource");
            if (el.attributes.length === 0 || resource === null) {
                return false;
            }
            return (resource.value.charAt(0) !== "#");
        });
    };

    // Get a specific enum of a given object.
    // The returned object is an Element.
    // This is a 'private' function (not visible in the model object).
    function getEnumElement(object, enumName) {
        let enums = getEnumElements(object);
        return enums.filter(el => el.nodeName === enumName)[0];
    };
    
    // This is the fundamental object used by CIMDraw to manipulate CIM files.
    let model = {
        // The name of the CIM file which is actually loaded.
        fileName: null,
        // The name of the CIM diagram which is actually loaded.
        activeDiagramName: "none",
        schema: new cimSchema(),
        // Loads a CIM file from the local filesystem.
        // Returns a promise which resolves after
        // loading the file. The input file can be a plain RDF/XML file
        // or a zipped file, conforming to ENTSO-E format (i.e. the
        // zipped file contains many XML files, one for each profile
        // (EQ, DL, TP etc).
        load(file) {
            let result = Promise.resolve();
            // see if this file is already loaded
            if (model.fileName !== file.name) {
                model.fileName = file.name;
                if (file.name.endsWith(".zip")) {
                    // zip file loading (ENTSO-E).
                    result = readAsArrayBuffer(file)
                        .then(parseZip(false))
                        .catch(function(e) {
                            model.clear();
                            return Promise.reject(e);
                        });
                } else {
                    result = readUploadedFileAsText(file).then(function(parsedXML) {
                        data.all = parsedXML;
                        return buildModel();
                    }).catch(function(e) {
                        model.clear();
                        return Promise.reject(e);
                    });
                }
            } 
            return result;
        },

        // Creates a new empty file. Returns a promise which resolves after
        // building the model object.
        newFile(name) {
            let parser = new DOMParser();
            data.all = parser.parseFromString(emptyFile, "application/xml");
            model.fileName = name;
            return buildModel();
        },
        
        updateModel(rdf) {
            let objs = rdf.children[0].children;
            // first, create all objects
            for (let obj of objs) {
                if (obj.nodeName === "md:FullModel") {
                    continue;
                }
                // we must handle both rdf:ID and rdf:about
                let id = obj.attributes.getNamedItem("rdf:ID");
                if (id === null) {
                    id = obj.attributes.getNamedItem("rdf:about");
                }
                if (id === null) {
                    continue;
                }
                let idValue = id.value;
                if (idValue.startsWith("#")) {
                    idValue = idValue.substring(1);
                }
                let actObj = model.getObject(idValue);
                if (typeof(actObj) === "undefined") {
                    actObj = model.createObject(obj.nodeName, {uuid: idValue});
                }
            }
            // then, attributes and links
            for (let obj of objs) {
                if (obj.nodeName === "md:FullModel") {
                    continue;
                }
                let id = obj.attributes.getNamedItem("rdf:ID");
                if (id === null) {
                    id = obj.attributes.getNamedItem("rdf:about");
                }
                if (id === null) {
                    continue;
                }
                let idValue = id.value;
                if (idValue.startsWith("#")) {
                    idValue = idValue.substring(1);
                }
                let actObj = model.getObject(idValue);
                if (typeof(actObj) === "undefined") {
                    continue;
                }
                // set attributes
                let attributes = model.getAttributes(obj);
                for (let attr of attributes) {
                    model.setAttribute(actObj, attr.nodeName, attr.innerHTML);
                }
                // set links
                let links = model.getLinks(obj);
                for (let link of links) {
                    let targetUUID = link.attributes.getNamedItem("rdf:resource").value.substring(1);
                    model.setLink(actObj, link.nodeName, model.getObject(targetUUID));
                }
            }
        },
        
        loadBoundary(file) {
            let result = Promise.resolve();
            if (file.name.endsWith(".zip")) {
                // zip file loading (ENTSO-E).
                result = readAsArrayBuffer(file)
                    .then(parseZip(true))
                    .catch(function(e) {
                        return Promise.reject(e);
                    });
            } else {
                result = Promise.reject("Error: not a boundary file.");
            } 
            return result;
        },

        // Load a CIM file from a remote location. Returns a promise which
        // resolves after loading the file. The input file must be a plain
        // RDF/XML file.
        loadRemote(fileName) {
            let result = Promise.resolve();
            if (model.fileName !== decodeURI(fileName).substring(1)) {
                model.fileName = decodeURI(fileName).substring(1);
                result = d3.xml(fileName).then(function(xml_data) {
                    data.all = xml_data;
                    return buildModel();
                }).catch(function(e) {
                    model.clear();
                    return Promise.reject(e);
                });
            } 
            return result;
        },

        // Serialize the current CIM file as a plain RDF/XML file.
        save() {
            if (data.all === null) {
                throw new Error("error: no CIM file loaded.");
            }
            let oSerializer = new XMLSerializer();
            let sXML = "";
            sXML = oSerializer.serializeToString(data.all);
            return sXML;
        },

        // Serialize the current CIM file in CGMES format.
        saveAsCGMES() {
            if (data.all === null) {
                return Promise.reject("error: no CIM file loaded.");
            }
            let oSerializer = new XMLSerializer();
            let zipFiles = {};
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
            let eqNames = [eqcNS];
            if (mode === "NODE_BREAKER") {
                eqNames.push(eqoNS);
            }
            // create EQ file
            let eqDoc = profile("EQ", eqNames, all, []);
            // create DL file
            let dlDoc = profile("DL", [dlNS], all, [eqDoc]);
            // create SV file
            let svDoc = profile("SV", [svNS], all, [eqDoc]);
            // create TP file
            let tpDoc = profile("TP", [tpNS], all, [eqDoc]);
            // create SSH file
            let sshDoc = profile("SSH", [sshNS], all, [eqDoc]);
            // create GL file
            let glDoc = profile("GL", [glNS], all, [eqDoc]);
            zipFiles["EQ.xml"] = fflate.strToU8(oSerializer.serializeToString(eqDoc));
            zipFiles["DL.xml"] = fflate.strToU8(oSerializer.serializeToString(dlDoc));
            zipFiles["SV.xml"] = fflate.strToU8(oSerializer.serializeToString(svDoc));
            zipFiles["TP.xml"] = fflate.strToU8(oSerializer.serializeToString(tpDoc));
            zipFiles["SSH.xml"] = fflate.strToU8(oSerializer.serializeToString(sshDoc));
            zipFiles["GL.xml"] = fflate.strToU8(oSerializer.serializeToString(glDoc));
            return zip(zipFiles);

            function profile(name, nss, data, deps) {
                let all = [].filter.call(data, function(el) {
                    let obj = model.schema.getSchemaObject(el.localName, name);
                    return (obj !== null); 
                });
                let doc = cgmesDocument(nss, deps);
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
                    let enums = getEnumElements(data[i]);
                    enums.forEach(function(en) {                  
                        let schEnum = model.schema.getSchemaAttribute(datum.localName, en.localName, profile);
                        if (typeof(schEnum) !== "undefined") {
                            datum.appendChild(en);
                        }
                    });
                    // handle rdf:about
                    let isAbout = model.schema.isDescription(datum, profile);
                    let isConcrete = model.schema.isConcrete(datum, profile);
                    if (isAbout === true && model.ID(datum) !== null) {
                        // we must use rdf:about
                        let idVal = model.ID(datum); 
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
            return dataMap.get("#" + uuid);
        },

        // Get all the attributes of a given object which are actually set.
        getAttributes(object) {
            if (typeof(object) === "undefined") {
                return undefined;
            }
            if (object === null) {
                return undefined;
            }
            return [].filter.call(object.children, function(el) {
                return el.attributes.length === 0;
            });
        },

        // Get a specific attribute of a given object. If the attribute
        // is not found the function returns undefined. The attribute
        // name must be namespace qualified (e.g. "cim:ACDCTerminal.connected").
        getAttribute(object, attrName) {
            if (typeof(object) === "undefined") {
                return undefined;
            }
            if (object === null) {
                return undefined;
            }
            let attributes = model.getAttributes(object);
            return attributes.filter(el => el.nodeName === attrName)[0];
        },

        // Set a specific attribute of a given object. If it doesen't exists,
        // it is created. The attribute name must be namespace qualified 
        // (e.g. "cim:ACDCTerminal.connected").
        setAttribute(object, attrName, value) {
            let attribute = model.getAttribute(object, attrName);
            if (typeof(attribute) !== "undefined") {
                attribute.innerHTML = value;
            } else {
                let ns = cimNS;
                if (attrName.startsWith("entsoe:")) {
                    ns = entsoeNS;
                }
                attribute = object.ownerDocument.createElementNS(ns, attrName);
                attribute.innerHTML = value;
                object.appendChild(attribute);
            }
            model.trigger("setAttribute", object, attrName, value);
            return;
        },

        // Set a specific enum of a given object. If it doesen't exists, it is created.
        setEnum(object, enumName, value) {
            let enumAttr = getEnumElement(object, enumName);
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
        // An optional second argument may contain an object with
        // specific creation options: an "uuid" field
        // can be passed in order to force the use of a specific UUID,
        // a "windNum" option can be passed in order to specify the
        // number of windings of a transformer (ignored for other
        // objects), which defaults to 2, a "node" option can be passed
        // when creating a BusbarSection in order to attach it to a
        // specific node (otherwise, a new node will be automatically
        // created and connected to the busbar).
        createObject(type, options) {
            let newElement = cimObject(type, options);
            if (model.schema.isA("IdentifiedObject", newElement)) {
                model.setAttribute(newElement, "cim:IdentifiedObject.name", "new1");
            }
            if (model.schema.isA("ConductingEquipment", newElement) === false) {
                // if not a conducting equipment, we are done
                model.trigger("createObject", newElement);
                return newElement;
            }
            // see if we have the "windNum" or "node" option
            let windNum = 2;
            let node = null;
            if (typeof(options) !== "undefined") {
                if (typeof(options.windNum) !== "undefined") {
                    windNum = options.windNum;
                }
                if (typeof(options.node) !== "undefined") {
                    node = options.node;
                }
            }
            let term1 = createTerminal(newElement);
            let term2 = null;
            let term3 = null;
            // create second terminal if needed
            if (type === "cim:ACLineSegment" ||
                type === "cim:Breaker" ||
                type === "cim:Disconnector" ||
                type === "cim:LoadBreakSwitch" ||
                type === "cim:Junction" ||
                type === "cim:PowerTransformer") {
                term2 = createTerminal(newElement);
            }
            // create third terminal if needed
            if (type === "cim:PowerTransformer") {
                if (windNum === 3) {
                    term3 = createTerminal(newElement);
                }
            }
            if (type === "cim:BusbarSection") {
                let nodesType = "ConnectivityNode";
                if (mode === "BUS_BRANCH") {
                    nodesType = "TopologicalNode";
                }
                if (node === null) {
                    node = cimObject("cim:" + nodesType);
                }
                addLink(term1, "cim:Terminal." + nodesType, node);
            }
            if (type === "cim:PowerTransformer") {
                let w1 = cimObject("cim:PowerTransformerEnd");
                let w2 = cimObject("cim:PowerTransformerEnd");
                model.setAttribute(w1, "cim:IdentifiedObject.name", "winding1");
                model.setAttribute(w2, "cim:IdentifiedObject.name", "winding2");
                addLink(newElement, "cim:PowerTransformer.PowerTransformerEnd", w1);
                addLink(newElement, "cim:PowerTransformer.PowerTransformerEnd", w2);
                addLink(w1, "cim:TransformerEnd.Terminal", term1);
                addLink(w2, "cim:TransformerEnd.Terminal", term2);
                if (windNum === 3) {
                    let w3 = cimObject("cim:PowerTransformerEnd");
                    model.setAttribute(w3, "cim:IdentifiedObject.name", "winding3");
                    addLink(newElement, "cim:PowerTransformer.PowerTransformerEnd", w3);
                    addLink(w3, "cim:TransformerEnd.Terminal", term3);
                }
            }
            model.trigger("createObject", newElement);
            return newElement;
        },

        // Delete an array of objects: also, delete their terminals and
        // graphic objects.
        // Moreover, delete contained objects (like transformer windings,
        // voltage levels, bays etc.) and handle BusbarSections.
        deleteObjects(objects) {
            // all the links to 'object' must be deleted
            let linksToDelete = [];
            let objsToDelete = [];

            for (let object of objects) {
                // handle nodes
                if (object.nodeName === "cim:ConnectivityNode" || object.nodeName === "cim:TopologicalNode") {
                    objsToDelete = objsToDelete.concat(getBusbars(object));
                }
                // handle busbars
                if (object.nodeName === "cim:BusbarSection") {
                    objsToDelete = objsToDelete.concat(getNode(object));
                }

                // delete links of 'object' 
                let objlinks = model.getLinks(object);
                for (let objlink of objlinks) {
                    let target = dataMap.get(objlink.attributes.getNamedItem("rdf:resource").value);
                    let linkName = objlink.nodeName;
                    // target may be undefined, if it is defined in an external file
                    // (like a boundary set file for example)
                    if (typeof(target) !== "undefined") {
                        if (checkRelatedObject(object, target)) {
                            objsToDelete.push(target);
                        }
                        linksToDelete.push({s: object, l: linkName, t: target});
                    }
                }
            }

            for (let [linkAndTarget, sources] of linksMap) {
                let linkAndTargetSplit = linkAndTarget.split("#");
                let linkName = "cim:" + linkAndTargetSplit[0];
                let targetUUID = "#" + linkAndTargetSplit[1];
                let targetObj = dataMap.get(targetUUID);
                // delete links pointing to 'object'
                if (objects.indexOf(targetObj) > -1) {
                    for (let source of sources) {
                        linksToDelete.push({s: source, l: linkName, t: targetObj});
                        if (checkRelatedObject(targetObj, source)) {
                            objsToDelete.push(source);
                        }
                    }
                }
            }
            for (let linkToDelete of linksToDelete) {
                model.removeLink(linkToDelete.s, linkToDelete.l, linkToDelete.t);
            }
            if (objsToDelete.length > 0) {
                model.deleteObjects(objsToDelete);
            }
            for (let object of objects) {
                let objUUID = model.ID(object);
                let objType = object.localName;
                // update the 'dataMap' map
                dataMap.delete("#" + objUUID);
                // delete the object
                object.remove();
                model.trigger("deleteObject", objUUID, objType);
            }

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
        },

        // Delete an object: also, delete its terminals and graphic objects.
        // Moreover, delete contained objects (like transformer windings,
        // voltage levels, bays etc.) and handle BusbarSections.
        deleteObject(object) {
            model.deleteObjects([object]);
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
        // This means that we delete the diagram objects and diagram object
        // points associated to the object.
        // In the special case that the object is a busbar or a node we will
        // delete the both from the diagram.
        deleteFromDiagram(object) {
            let objUUID = model.ID(object);
            let dobjs = model.getDiagramObjects([object]);
            let nodeName = "ConnectivityNode";
            if (mode === "BUS_BRANCH") {
                nodeName = "TopologicalNode";
            }
            if (object.localName === "BusbarSection") {
                let node = model.getNode(object);
                dobjs = dobjs.concat(model.getDiagramObjects([node]));
            }
            if (object.localName === nodeName) {
                let busbar = model.getBusbar(object);
                if (busbar !== null) {
                    dobjs = dobjs.concat(model.getDiagramObjects([busbar]));
                }
            }

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
            let dobj = cimObject("cim:DiagramObject");
            for (let linePoint of lineData) {
                let point = cimObject("cim:DiagramObjectPoint");
                model.setAttribute(point, "cim:DiagramObjectPoint.xPosition", linePoint.x + object.x);
                model.setAttribute(point, "cim:DiagramObjectPoint.yPosition", linePoint.y + object.y);
                model.setAttribute(point, "cim:DiagramObjectPoint.sequenceNumber", linePoint.seq);
                addLink(point, "cim:DiagramObjectPoint.DiagramObject", dobj);
            }
            // the object might have a rotation
            if (typeof(object.rotation) !== "undefined") {
                model.setAttribute(dobj, "cim:DiagramObject.rotation", object.rotation);
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

        // Get a specific enum of a given object.
        // Returns the string value, if present, or undefined.
        getEnum(object, enumName) {
            let enumEl = getEnumElement(object, enumName);
            let ret = undefined;
            if (typeof(enumEl) !== "undefined") {
                ret = enumEl.attributes.getNamedItem("rdf:resource").value.split("#")[1].split(".")[1];
            }
            return ret;
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
                    if (targetUUID === "#" + model.ID(targetInt)) {
                        let linksMapKey = linkEntry.localName + targetUUID;
                        let linksMapValue = linksMap.get(linksMapKey);
                        linkEntry.remove();
                        if (linksMapValue.length === 1) {
                            linksMap.delete(linksMapKey);
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
                model.activeDiagram = cimObject("cim:Diagram");
                model.setAttribute(model.activeDiagram, "cim:IdentifiedObject.name", diagramName);
                model.activeDiagramName = diagramName;
                model.trigger("createdDiagram");
            }
            model.trigger("changedDiagram");
        },

        isBoundary(connectivityNode) {
            let ret = false;
            let boundary = model.getAttribute(connectivityNode, "entsoe:ConnectivityNode.boundaryPoint");
            if (typeof(boundary) !== "undefined") {
                if (boundary.textContent === "true") {
                    ret = true;
                }
            }
            return ret;
        },

        getMode() {
            return mode;
        },
        
        setMode(newMode) {
            if (newMode === "NODE_BREAKER" || newMode === "BUS_BRANCH") {
                mode = newMode;
            }
            model.trigger("setMode", mode);
        },

        // Get the rdf:ID attribute of a given object, or null if not present.
        ID(object) {
            if (object === null || typeof(object) === "undefined") {
                return null;
            }
            if (typeof(object.attributes) === "undefined") {
                return null;
            } else {
                let idNode = object.attributes.getNamedItem("rdf:ID");
                if (idNode === null) {
                    return null;
                }
                return idNode.value;
            }
        },

        // Reset the model to its initial state.
        clear() {
            data.all = null;
            model.fileName = null;
            dataMap = new Map();
            linksMap = new Map();
        }
    };
    observable(model);
    return model;
};
