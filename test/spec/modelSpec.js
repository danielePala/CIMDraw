describe("CIM model", function() {
    let model;
    let emptyFile = "<?xml version=\"1.0\" encoding=\"UTF-8\" ?><rdf:RDF xmlns:cim=\"http://iec.ch/TC57/2013/CIM-schema-cim16#\" xmlns:entsoe=\"http://entsoe.eu/CIM/SchemaExtension/3/1#\" xmlns:md=\"http://iec.ch/TC57/61970-552/ModelDescription/1#\" xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\"></rdf:RDF>";
    
    beforeEach(function(done) {
	model = cimModel();	
	let cimFile = {name: "new1"}; // new file
	model.load(cimFile, null, function() {
	    // nothing to do
	    done();
	});
    });
    
    it("should be able to create a new empty file", function() {
	let out = model.save();
	expect(typeof(out)).toBe("string");
    });

    it("should not contain any diagram", function() {
	let diagramList = model.getDiagramList();
	expect(diagramList.length).toBe(0);
    });

    it("should be able to create a diagram", function() {
	model.selectDiagram("test");
	let diagramList = model.getDiagramList();
	expect(diagramList.length).toBe(1);
	expect(diagramList[0]).toBe("test");
    });

    it("should start empty", function() {
	let objects = model.getObjects(
	    ["cim:ACLineSegment",
	     "cim:Breaker",
	     "cim:Disconnector",
	     "cim:LoadBreakSwitch",
	     "cim:Jumper",
	     "cim:Junction",
	     "cim:EnergySource",
	     "cim:SynchronousMachine",
	     "cim:EnergyConsumer",
	     "cim:ConformLoad",
	     "cim:NonConformLoad",
	     "cim:PowerTransformer",
	     "cim:BusbarSection"]);
	for (let i of Object.keys(objects)) {
	    expect(objects[i].length).toBe(0);
	}
    });

    it("should be able to read a schema attribute", function() {
	// read a random attribute
	let attribute = model.getSchemaAttribute("Breaker", "Switch.retained");
	expect(typeof(attribute)).not.toBe(undefined);
    });

    it("should be able to create and connect objects in diagram", function() {
	model.selectDiagram("test");
	let lineData = [{x: 0, y: 0, seq:1}];
	let brk1 = model.createObject("cim:Breaker");
	model.addToActiveDiagram(brk1, lineData);
	let brk2 = model.createObject("cim:Breaker");
	model.addToActiveDiagram(brk2, lineData);
	let objects = model.getGraphicObjects(["cim:Breaker"]);
	expect(objects["cim:Breaker"].length).toBe(2);

	let cn = model.createObject("cim:ConnectivityNode");
	model.addToActiveDiagram(cn, lineData);
	let brk1Terms = model.getTerminals([brk1]);	
	let brk2Terms = model.getTerminals([brk2]);
	model.setLink(brk1Terms[0], "cim:Terminal.ConnectivityNode", cn);
	model.setLink(brk2Terms[0], "cim:Terminal.ConnectivityNode", cn);
	let cnTerms = model.getTargets([cn], "ConnectivityNode.Terminals");
	expect(cnTerms.length).toBe(2);
	let cn2 = model.createObject("cim:ConnectivityNode");
	model.setLink(brk1Terms[0], "cim:Terminal.ConnectivityNode", cn2);
	cnTerms = model.getTargets([cn], "ConnectivityNode.Terminals");
	expect(cnTerms.length).toBe(1);

    });

    it("should be able to locate schema description of objects", function() {
	let brk1 = model.getSchemaObject("Breaker");
	let dobj1 = model.getSchemaObject("DiagramObject");
	let brk2 = model.getSchemaObject("Breaker", "EQ");
	let dobj2 = model.getSchemaObject("DiagramObject", "DL");
	let dobj3 = model.getSchemaObject("DiagramObject", "EQ");
	expect(brk1).not.toBe(null);
	expect(dobj1).not.toBe(null);
	expect(brk2).not.toBe(null);
	expect(dobj2).not.toBe(null);
	expect(dobj3).toBe(null);
    });

    /*it("should be able to locate superclasses", function() {
	let brk1 = model.getAllSuper("Breaker");
	let dobj1 = model.getAllSuper("DiagramObject");
	expect(brk1.length).toBeGreaterThan(0);
	expect(dobj1.length).toBeGreaterThan(0);
	});*/

    it("should be able to get schema-specific links for objects", function() {
	let idobjEQ = model.getSchemaLinks("IdentifiedObject", "EQ");
	let idobjDL = model.getSchemaLinks("IdentifiedObject", "DL");
	expect(idobjEQ.length).toBe(0);
	expect(idobjDL.length).toBeGreaterThan(0);
    });

});
