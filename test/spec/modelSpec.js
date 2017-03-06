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
    });

    it("should be able to read a schema attribute", function() {
	// read a random attribute
	let attribute = model.getSchemaAttribute("Breaker", "Switch.retained");
	expect(typeof(attribute)).not.toBe(undefined);
    });

    
});
