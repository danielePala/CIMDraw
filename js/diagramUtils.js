/*
 This file collects some utility functions for diagram manipulation.

 Copyright 2017-2020 Daniele Pala <pala.daniele@gmail.com>

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

/* rotate a point of a given amount (in degrees) */
function rotate(p, rotation) {
    let svgroot = d3.select("svg").node();
    let pt = svgroot.createSVGPoint();
    pt.x = p.x;
    pt.y = p.y;
    if (rotation === 0) {
        return pt;
    }
    let rotate = svgroot.createSVGTransform();
    rotate.setRotate(rotation,0,0);
    return pt.matrixTransform(rotate.matrix);
}

function rotateTerm(model, term) {
    let equipment = model.getTargets(
        [term],
        "Terminal.ConductingEquipment")[0];
    let baseX = equipment.x; 
    let baseY = equipment.y;            
    let cRot = rotate({x: term.x-baseX, y: term.y-baseY}, term.rotation);
    let newX = baseX + cRot.x;
    let newY = baseY + cRot.y;
    return {x: newX, y: newY};
}

function addToDiagram(model, event, object) {
    let m = d3.pointer(event, d3.select("svg").node());
    let transform = d3.zoomTransform(d3.select("svg").node());
    let xoffset = transform.x; 
    let yoffset = transform.y; 
    let svgZoom = transform.k; 
    object.x = (m[0] - xoffset) / svgZoom;
    object.px = object.x;
    object.y = (m[1] - yoffset) / svgZoom;
    object.py = object.y;
    
    let lineData = [{x: 0, y: 0, seq:1}]; // always OK except acline and busbar
    if (object.nodeName === "cim:ACLineSegment" || object.nodeName === "cim:BusbarSection") {
        lineData.push({x: 150, y: 0, seq:2});
    }
    model.addToActiveDiagram(object, lineData);
}

function calcLineData(model, d, NODE_CLASS, NODE_TERM) {
    d.x = undefined;
    d.y = undefined;
    d.rotation = 0;
    let lineData = [];
    let xcalc = 0;
    let ycalc = 0;
    // extract equipments
    // filter by lineData, because there may be some elements which are on the diagram but we don't draw
    let equipments = model.getEquipments(d).filter(el => typeof(el.lineData) !== "undefined" || el.localName === "BusbarSection");
    // let's try to get a busbar section
    let busbarSection = equipments.filter(el => el.localName === "BusbarSection")[0];
    let dobjs = model.getDiagramObjects([d]);
    if (dobjs.length === 0) {
        if (typeof(busbarSection) !== "undefined") {
            dobjs = model.getDiagramObjects([busbarSection]);
            let rotation = model.getAttribute(dobjs[0], "cim:DiagramObject.rotation");
            if (typeof(rotation) !== "undefined") {
                d.rotation = parseInt(rotation.innerHTML);
            }
        } else if (equipments.length > 0) {
            let points = [];
            for (let eq of equipments) {
                let endx = eq.x + eq.lineData[eq.lineData.length-1].x;
                let endy = eq.y + eq.lineData[eq.lineData.length-1].y;
                points.push({x: eq.x + eq.lineData[0].x, y: eq.y + eq.lineData[0].y, eq: eq}, {x: endx, y: endy, eq: eq});
            }
            let min = Infinity;
            let p1min = points[0], p2min = points[0];
            for (let p1 of points) {
                for (let p2 of points) {
                    if (p1.eq === p2.eq) {
                        continue;
                    }
                    let dist = distance2(p1, p2);
                    if (dist < min) {
                        min = dist;
                        p1min = p1;
                        p2min = p2;
                    }
                }
            }
            xcalc = (p1min.x+p2min.x)/2;
            ycalc = (p1min.y+p2min.y)/2;
        }
    } else {
        let rotation = model.getAttribute(dobjs[0], "cim:DiagramObject.rotation"); 
        if (typeof(rotation) !== "undefined") {
            d.rotation = parseInt(rotation.innerHTML);
        }
    }
    let points = model.getTargets(
        dobjs,
        "DiagramObject.DiagramObjectPoints");
    if (points.length > 0) {
        for (let point of points) {
            let seqNum = model.getAttribute(point, "cim:DiagramObjectPoint.sequenceNumber");
            if (typeof(seqNum) === "undefined") {
                seqNum = 1;
            } else {
                seqNum = parseInt(seqNum.innerHTML);
            }
            lineData.push({
                x: parseFloat(model.getAttribute(point, "cim:DiagramObjectPoint.xPosition").innerHTML),
                y: parseFloat(model.getAttribute(point, "cim:DiagramObjectPoint.yPosition").innerHTML),
                seq: seqNum
            });
        }
        lineData.sort(function(a, b){return a.seq-b.seq});
        d.x = lineData[0].x;
        d.y = lineData[0].y;
        // relative values
        for (let point of lineData) {
            point.x = point.x - d.x;
            point.y = point.y - d.y;
        }
    } else {
        lineData.push({x:0, y:0, seq:1});
        // special case: if this is a node with a busbar associated, we draw it as
        // a two-dimensional object
        if (d.nodeName === "cim:" + NODE_CLASS) {
            let terminals = model.getTargets(
                [d],
                NODE_TERM);
            // let's try to get some equipment
            let equipments = model.getTargets(
                terminals,
                "Terminal.ConductingEquipment");
            let busbar = equipments.filter(
                el => el.nodeName === "cim:BusbarSection")[0];
            if (typeof(busbar) !== "undefined") {
                lineData.push({x:150, y:0, seq:2});
            }
        }
        d.x = xcalc;
        d.y = ycalc;
        model.addToActiveDiagram(d, lineData);
    }
    d.lineData = lineData;

    return lineData;
}

function distance2(p1, p2) {
    let dx = p1.x - p2.x, 
        dy = p1.y - p2.y; 
    return dx * dx + dy * dy;
}