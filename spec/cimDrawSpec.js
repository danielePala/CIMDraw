describe("CIM draw spec", function() {
    let testModel;
    
    beforeEach(function(done) {
        testModel = cimModel();
        let cimFile = {name: "new1"}; // new file
        testModel.load(cimFile, null, function() {
            // nothing to do
            done();
        });
    });
    
    it("mounts cimDraw tag", function() {
        var html = document.createElement("cimDraw");
        document.body.appendChild(html);
        riot.mount("cimDraw");
        expect(document.querySelector("cimDraw > nav")).not.toBe(null);
    })
    
});
