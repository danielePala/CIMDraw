<cimTopologyProcessor>
    <style>
	#cim-topology-processor { display: none }
    </style>

    <!-- Topology processor button -->
    <ul class="nav navbar-nav" id="cim-topology-processor">
	<li class="dropdown">
	    <a class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">
		<span id="seText">Topology Processor</span>
		<span class="caret"></span>
	    </a>
	    <ul class="dropdown-menu">
		<li id="runLabel" onclick={ run }><a>Run</a></li>
	    </ul>
	</li>
    </ul>

    <script>
     "use strict";
     let self = this;

     self.parent.on("diagrams", function() {
	 $("#cim-topology-processor").show();
     });

     run(e) {
	 calcTopology(opts.model);
     }
     
    </script>

</cimTopologyProcessor>
