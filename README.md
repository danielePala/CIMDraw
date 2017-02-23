# README #

These are the source files for cimDraw.

### What is this? ###

A WebApp to view IEC CIM files. Editing is also possible, with some limitations
(see below).
The code uses many ES6 features, so you will need a modern browser to run it
(Firefox >= 44, Chrome >= 49).

### Installing ###

In order to use the application, just serve it with your favourite web server
and view it with your browser.

### Using ###

The app starts by asking for a CIM file: you can load one RDF/XML file,
or a splitted representation with many files (e.g. EQ, DL, SV etc) according to 
the [ENTSO-E CGMES profile](https://www.entsoe.eu/major-projects/common-information-model-cim/cim-for-grid-models-exchange/standards/Pages/default.aspx).
In the second case, you just load the whole zip file, no need to uncompress it.
Alternatively, it is possible to create a new file from scratch: in this case, a plain RDF/XML 
file will be created.

![file selection](doc/01_select_file.png)

Once loaded, the app shows a dropdown list of diagrams: choose a diagram and it
will be loaded. Alternatevely, you can create a new diagram.

![diagram selection](doc/02_select_diagram.png)

Once loaded, you will get a tree view of all the objects in the diagram and a single line diagram.
You can move and zoom on the diagram by holding down the CTRL key. If you click on an element in the tree, the diagram will focus on that element. If you CTRL+click an element in the diagram, you will see it also in the tree.

![diagram view](doc/03_loaded_diagram.png)

By default the tree only shows the elements of the current diagram: you can check the 'Show all objects' flag in order to see all the elements in the file. You can drag and drop from the tree to the diagram in order to add elements to the diagram; if you drag+drop an element which is already in the diagram, the diagram will focus on that element.

By default, the 'select' control is selected for the diagram, which allows you to drag elements. The 'force (auto-layout)' control moves elements around according to a force-based algorithm. The 'edit connections' control allows you to change connections between elements: first click on a terminal and then click on another terminal (or on a busbar).

![edit connections between elements](doc/04_edit_connections.png)

The 'Insert element' controls allows you to add elements to the diagram.

You can right-click on an element in the diagram in order to rotate, delete or add measurements to it.

Finally, you can save the modified file ('Save as...') and also save the current diagram only ('Export current diagram').

### Data model ###

The attributes shown in the tree are taken from the schema file located inside the 'rdf-schema' folder, and it is the ENTSO-E CGMES equipment schema with the addition of the 'Jumper' object.
The attributes in the tree can be edited.
Also, the links between objects can be changed, just click the 'change' button and then click on the target element.

### License ###

See the COPYING file.
