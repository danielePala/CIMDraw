<cimStateEstimator>
    <style>
	#cim-state-estimator { display: none }
    </style>

    <a class="btn btn-default navbar-btn navbar-left" id="cim-state-estimator" role="button" onclick={ startCIMEstimation }>Start state estimator on this network</a>

    <script>
     "use strict";
     let self = this;
     let emptyRequest = "<EventMessage xmlns=\"http://iec.ch/TC57/2011/schema/message\">" +
                           "<Header>"+
                             "<CorrelationID>prova</CorrelationID>"+
                           "</Header>"+
                           "<Payload>"+
                             "<Command>StartCIMEstimation</Command>"+
                             "<Parameters>"+
                               "<netName>default</netName>"+
                               "<period>2</period>"+
                               "<EQ></EQ>"+
                             "</Parameters>"+
                           "</Payload>"+
                         "</EventMessage>";
     
     self.parent.on("showDiagram", function() {
	 $("#cim-state-estimator").show();
     });

     startCIMEstimation(e) {
	 let xhr = new XMLHttpRequest();
	 xhr.open("POST", "http://localhost:8000/CIMEstimationRequest", true);

	 let parser = new DOMParser();
	 let request = parser.parseFromString(emptyRequest, "application/xml");
	 let eq = parser.parseFromString(opts.model.export(), "application/xml");
	 let eqRoot = $(request).find("EQ").get(0);
	 eqRoot.appendChild(eq.children[0]);
	 xhr.send(request);

	 // poll the server for measurements
	 (function poll() {
	     setTimeout(function() {
		 let xhr = new XMLHttpRequest();
		 xhr.open("GET", "http://localhost:8000/measurements/prova", true);
		 xhr.onreadystatechange = function() {
		     if (xhr.readyState == XMLHttpRequest.DONE) {
			 if (xhr.status == 200) {
			     let response = this.responseXML;
			     let objs = response.children[0].children;
			     for (let obj of objs) {
				 let actObj = opts.model.getObject(obj.attributes.getNamedItem("rdf:ID").value);
				 if (typeof(actObj) !== "undefined") {
				     let attributes = opts.model.getAttributes(obj);
				     for (let attr of attributes) {
					 opts.model.setAttribute(actObj, attr.nodeName, attr.innerHTML);
				     }
				 }
			     }
			 }
			 poll();
		     }
		 }
		 xhr.responseType = "document";
		 xhr.send();
	     }, 10000);
	 })();

     }

    </script>
</cimStateEstimator>
