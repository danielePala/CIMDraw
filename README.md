# README #

These are the source files for cimDraw.

### What is this? ###

A WebApp to view IEC CIM files. Editing is also possible, with some limitations (see below).
The code uses many ES6 features, so you will need a modern browser to run it (Firefox >= 44, Chrome >= 49).

### Installing ###

In order to use the application, just serve it with your favourite web server and view it with your browser.

### Using ###

The app starts by asking for a CIM file: right now you can only load one RDF/XML file, so if you have a splitted representation with many files (e.g. EQ, DL, SV etc.) you must merge them into one big single file.
Once loaded, the app shows a dropdown list of diagrams: choose a diagram and it will be loaded. You will get a tree view of all the objects in the diagram and a single line diagram. You can move and zoom on the diagram by holding down the CTRL key. If you click on an element in the tree, the diagram will focus on that element. If you CTRL+click an element in the diagram, you will see it also in the tree.
By default the tree only shows the elements of the current diagram: you can check the 'Show all objects' flag in order to see all the elements in the file. You can drag and drop from the tree to the diagram in order to add elements to the diagram; if you drag+drop an element which is already in the diagram, the diagram will focus on that element.
By default, the 'select' control is selected for the diagram, which allows you to drag elements. The 'force (auto-layout)' control moves elements around according to a force-based algorithm. The 'edit connections' control allows you to change connections between elements: first click on a terminal and then click on another terminal (or on a busbar).
The 'AC Line Segment' and 'breaker' controls allows you to add these elements to the diagram, and are currently experimental.
You can right-click on an element in the diagram in order to rotate or delete it (the delete functionality is actually experimental and not fully working).
Finally, you can save the modified file ('Save as...') and also save the current diagram only ('Export current diagram').

### Data model ###

The attributes shown in the tree are taken from the schema file located inside the 'rdf-schema' folder, and it is the ENTSO-E CGMES equipment schema with the addition of the 'Jumper' object.
The attributes in the tree can be edited, but there is no control over the correctness of the values inserted.
Also, the links between objects can be changed, again without correctness control.
