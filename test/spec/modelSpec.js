describe("CIM model", function() {
    let model;
    let emptyFile = "<?xml version=\"1.0\" encoding=\"UTF-8\" ?><rdf:RDF xmlns:cim=\"http://iec.ch/TC57/2013/CIM-schema-cim16#\" xmlns:entsoe=\"http://entsoe.eu/CIM/SchemaExtension/3/1#\" xmlns:md=\"http://iec.ch/TC57/61970-552/ModelDescription/1#\" xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\"></rdf:RDF>";
    
    beforeEach(function(done) {
	model = cimDiagramModel();	
	let cimFile = {name: "new1"}; // new file
	model.load(cimFile, null, function() {
	    // nothing to do
	    done();
	});
    });
    
    it("should be able to create a new empty file", function() {
	expect(typeof(model.data.all)).not.toBe(undefined);
    });

    it("should be able to read a schema attribute", function() {
	// read a random attribute
	let attribute = model.getSchemaAttribute("Breaker", "Switch.retained");
	expect(typeof(attribute)).not.toBe(undefined);
    });

    
});
