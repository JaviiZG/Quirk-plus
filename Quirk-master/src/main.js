/**
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// It's important that the polyfills and error fallback get loaded first!
import {} from "./browser/Polyfills.js"
import {hookErrorHandler} from "./fallback.js"
hookErrorHandler();
import {doDetectIssues} from "./issues.js"
doDetectIssues();

import {CircuitStats} from "./circuit/CircuitStats.js"
import {CooldownThrottle} from "./base/CooldownThrottle.js"
import {Config} from "./Config.js"
import {DisplayedInspector} from "./ui/DisplayedInspector.js"
import {Painter} from "./draw/Painter.js"
import {Rect} from "./math/Rect.js"
import {RestartableRng} from "./base/RestartableRng.js"
import {Revision} from "./base/Revision.js"
import {initSerializer, fromJsonText_CircuitDefinition} from "./circuit/Serializer.js"
import {TouchScrollBlocker} from "./browser/TouchScrollBlocker.js"
import {Util} from "./base/Util.js"
import {initializedWglContext} from "./webgl/WglContext.js"
import {watchDrags, isMiddleClicking, eventPosRelativeTo} from "./browser/MouseWatcher.js"
import {ObservableValue, ObservableSource} from "./base/Obs.js"
import {initExports, obsExportsIsShowing} from "./ui/exports.js"
import { initExportsCustom } from "./ui/exportImportCustomGates.js";
import {initForge, obsForgeIsShowing} from "./ui/forge.js"
import {initMenu, obsMenuIsShowing, closeMenu} from "./ui/menu.js"
import {initUndoRedo} from "./ui/undo.js"
import { initExportIBM } from "./ui/IBMexport.js";
import {initClear} from "./ui/clear.js"
import { initInspect } from "./ui/inspect.js";
import {initUrlCircuitSync} from "./ui/url.js"
import {initTitleSync} from "./ui/title.js"
import {simulate} from "./ui/sim.js"
import {GatePainting} from "./draw/GatePainting.js"
import {GATE_CIRCUIT_DRAWER} from "./ui/DisplayedCircuit.js"
import {GateColumn} from "./circuit/GateColumn.js";
import {Point} from "./math/Point.js";
import { DisplayedCircuit } from "./ui/DisplayedCircuit.js";
initSerializer(
    GatePainting.LABEL_DRAWER,
    GatePainting.MATRIX_DRAWER,
    GATE_CIRCUIT_DRAWER,
    GatePainting.LOCATION_INDEPENDENT_GATE_DRAWER);

const canvasDiv = document.getElementById("canvasDiv");

//noinspection JSValidateTypes
/** @type {!HTMLCanvasElement} */
const canvas = document.getElementById("drawCanvas");
//noinspection JSValidateTypes
if (!canvas) {
    throw new Error("Couldn't find 'drawCanvas'");
}
canvas.width = canvasDiv.clientWidth;
canvas.height = window.innerHeight*0.9;
let haveLoaded = false;
const semiStableRng = (() => {
    const target = {cur: new RestartableRng()};
    let cycleRng;
    cycleRng = () => {
        target.cur = new RestartableRng();
        //noinspection DynamicallyGeneratedCodeJS
        setTimeout(cycleRng, Config.SEMI_STABLE_RANDOM_VALUE_LIFETIME_MILLIS*0.99);
    };
    cycleRng();
    return target;
})();

//noinspection JSValidateTypes
/** @type {!HTMLDivElement} */
const inspectorDiv = document.getElementById("inspectorDiv");

/** @type {ObservableValue.<!DisplayedInspector>} */
const displayed = new ObservableValue(
    DisplayedInspector.empty(new Rect(0, 0, canvas.clientWidth, canvas.clientHeight)));
const mostRecentStats = new ObservableValue(CircuitStats.EMPTY);
/** @type {!Revision} */
let revision = Revision.startingAt(displayed.get().snapshot());

revision.latestActiveCommit().subscribe(jsonText => {
    let circuitDef = fromJsonText_CircuitDefinition(jsonText);
    let newInspector = displayed.get().withCircuitDefinition(circuitDef);
    displayed.set(newInspector);
});

/**
 * @param {!DisplayedInspector} curInspector
 * @returns {{w: number, h: !number}}
 */
let desiredCanvasSizeFor = curInspector => {
    return {
        w: Math.max(canvasDiv.clientWidth, curInspector.desiredWidth()),
        h: curInspector.desiredHeight()
    };
};

/**
 * @param {!DisplayedInspector} ins
 * @returns {!DisplayedInspector}
 */
const syncArea = ins => {
    let size = desiredCanvasSizeFor(ins);
    ins.updateArea(new Rect(0, 0, size.w, size.h));
    return ins;
};

// Gradually fade out old errors as user manipulates circuit.
displayed.observable().
    map(e => e.displayedCircuit.circuitDefinition).
    whenDifferent(Util.CUSTOM_IS_EQUAL_TO_EQUALITY).
    subscribe(() => {
        let errDivStyle = document.getElementById('error-div').style;
        errDivStyle.opacity *= 0.9;
        if (errDivStyle.opacity < 0.06) {
            errDivStyle.display = 'None'
        }
    });

/** @type {!CooldownThrottle} */
let redrawThrottle;
const scrollBlocker = new TouchScrollBlocker(canvasDiv);
const redrawNow = () => {
    if (!haveLoaded) {
        // Don't draw while loading. It's a huge source of false-positive circuit-load-failed errors during development.
        return;
    }

    let shown = syncArea(displayed.get()).previewDrop();
    if (displayed.get().hand.isHoldingSomething() && !shown.hand.isHoldingSomething()) {
        shown = shown.withHand(shown.hand.withHeldGateColumn(new GateColumn([]), new Point(0, 0)))
    }
    let stats = simulate(shown.displayedCircuit.circuitDefinition);
    mostRecentStats.set(stats);

    let size = desiredCanvasSizeFor(shown);
    canvas.width = size.w;
    canvas.height = size.h;
    let painter = new Painter(canvas, semiStableRng.cur.restarted());
    shown.updateArea(painter.paintableArea());
    shown.paint(painter, stats);
    painter.paintDeferred();

    displayed.get().hand.paintCursor(painter);
    scrollBlocker.setBlockers(painter.touchBlockers, painter.desiredCursorStyle);
    canvas.style.cursor = painter.desiredCursorStyle || 'auto';

    let dt = displayed.get().stableDuration();
    if (dt < Infinity) {
        window.requestAnimationFrame(() => redrawThrottle.trigger());
    }
};

redrawThrottle = new CooldownThrottle(redrawNow, Config.REDRAW_COOLDOWN_MILLIS, 0.1, true);
window.addEventListener('resize', () => redrawThrottle.trigger(), false);
displayed.observable().subscribe(() => redrawThrottle.trigger());

/** @type {undefined|!string} */
let clickDownGateButtonKey = undefined;
canvasDiv.addEventListener('click', ev => {
    let pt = eventPosRelativeTo(ev, canvasDiv);
    let curInspector = displayed.get();
    if (curInspector.tryGetHandOverButtonKey() !== clickDownGateButtonKey) {
        return;
    }
    let clicked = syncArea(curInspector.withHand(curInspector.hand.withPos(pt))).tryClick();
    if (clicked !== undefined) {
        revision.commit(clicked.afterTidyingUp().snapshot());
    }
});

watchDrags(canvasDiv,
    /**
     * Grab
     * @param {!Point} pt
     * @param {!MouseEvent|!TouchEvent} ev
     */
    (pt, ev) => {
        let oldInspector = displayed.get();
        let newHand = oldInspector.hand.withPos(pt);
        let newInspector = syncArea(oldInspector.withHand(newHand));
        clickDownGateButtonKey = (
            ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey ? undefined : newInspector.tryGetHandOverButtonKey());
        if (clickDownGateButtonKey !== undefined) {
            displayed.set(newInspector);
            return;
        }

        newInspector = newInspector.afterGrabbing(ev.shiftKey, ev.ctrlKey || ev.metaKey);
        if (displayed.get().isEqualTo(newInspector) || !newInspector.hand.isBusy()) {
            return;
        }

        // Add extra wire temporarily.
        revision.startedWorkingOnCommit();
        displayed.set(
            syncArea(oldInspector.withHand(newHand).withJustEnoughWires(newInspector.hand, 1)).
                afterGrabbing(ev.shiftKey, ev.ctrlKey || ev.metaKey, false, ev.altKey));

        ev.preventDefault();
    },
    /**
     * Cancel
     * @param {!MouseEvent|!TouchEvent} ev
     */
    ev => {
        revision.cancelCommitBeingWorkedOn();
        ev.preventDefault();
    },
    /**
     * Drag
     * @param {undefined|!Point} pt
     * @param {!MouseEvent|!TouchEvent} ev
     */
    (pt, ev) => {
        if (!displayed.get().hand.isBusy()) {
            return;
        }

        let newHand = displayed.get().hand.withPos(pt);
        let newInspector = displayed.get().withHand(newHand);
        displayed.set(newInspector);
        ev.preventDefault();
    },
    /**
     * Drop
     * @param {undefined|!Point} pt
     * @param {!MouseEvent|!TouchEvent} ev
     */
    (pt, ev) => {
        if (!displayed.get().hand.isBusy()) {
            return;
        }

        let newHand = displayed.get().hand.withPos(pt);
        // console.log(newHand.heldGate.serializedId[0]);
        let newInspector = syncArea(displayed.get()).withHand(newHand).afterDropping().afterTidyingUp();
        let clearHand = newInspector.hand.withPos(undefined);
        let clearInspector = newInspector.withJustEnoughWires(clearHand, 0);
        let displayedCircuit = newInspector.displayedCircuit;
        revision.commit(clearInspector.snapshot());
        if (displayedCircuit.findGateOverlappingPos(newHand.pos) !== undefined) {
            var menu = document.createElement("div");
                // menu.textContent = "Menú";
                menu.id = "menu";
                menu.classList = "d-flex flex-column align-items-left justify-content-left p-2 rounded-2";
                menu.style.position = "absolute";
                menu.style.zIndex = "100";
                menu.style.backgroundColor = "#00bbbb";
                menu.style.left = pt.x + "px";
                menu.style.top = pt.y+50 + "px";
                document.body.appendChild(menu);
            var ul = document.createElement("ul");
                ul.classList = "ps-0 mb-0";
                menu.appendChild(ul);
            var del = document.createElement("button");
                del.classList = "btn btn-bd-primary btn-sm me-2";
                del.id = "del";
                del.textContent = "Delete";
                ul.appendChild(del);
            var dup = document.createElement("button");
                dup.classList = "btn btn-bd-primary btn-sm";
                dup.id = "dup";
                dup.textContent = "Duplicate";
                ul.appendChild(dup);
            if(newHand.heldGate !== undefined){
                if(newHand.heldGate.serializedId[0] === "~"){
                    let url = decodeURI(window.location);
                    let val = JSON.parse(url.split("=")[1]);
                    let array = [];
                    for(let i = 0; i < val.gates.length; i++){
                        // console.log(val.gates[i].id);
                        // console.log(newHand.heldGate.serializedId);
                        if(val.gates[i].id === newHand.heldGate.serializedId){
                            if(val.gates[i].circuit !== undefined){
                                var unzip = document.createElement("button");
                                    unzip.classList = "btn btn-bd-primary btn-sm ms-2";
                                    unzip.id = "unzip";
                                    unzip.textContent = "Unzip";
                                    ul.appendChild(unzip);
                            }
                        }
                    }
                }
            }

            if(newHand.heldGate !== undefined){
                if(newHand.heldGate.serializedId[0] == "~"){
                    let url = decodeURI(window.location);
                    let val = JSON.parse(url.split("=")[1]);
                    let array = [];
                    for(let i = 0; i < val.gates.length; i++){
                        if(val.gates[i].id === newHand.heldGate.serializedId){
                            if(val.gates[i].circuit !== undefined){
                                array = val.gates[i].circuit.cols;
                                
                                document.getElementById("unzip").addEventListener("click", function(){
                                    // console.log(array);
                                    for(let i = 0 ; i < val.cols.length; i++){
                                        for(let j = 0 ; j<val.cols[i].length; j++){
                                            if(val.cols[i][j] === newHand.heldGate.serializedId){
                                                console.log(array.length);
                                                for(let w = 0; w < array.length; w++){
                                                    if(w!==0){
                                                        val.cols.push([]);
                                                        console.log("pre cols: "+val.cols[val.cols.length-1]);
                                                        for(let z = val.cols.length-1; z > i+w; z--){
                                                            val.cols[z] = val.cols[z-1].slice();
                                                        }
                                                        val.cols[i+w]=[];
                                                        for(let z = 0; z < j; z++){
                                                            val.cols[i+w].push(1);
                                                        }
                                                    }
                                                    for(let k = 0; k < array[w].length; k++){
                                                        val.cols[i+w][j+k] = array[w][k];
                                                        console.log("post cols 1: "+val.cols[val.cols.length-2]);
                                                        console.log("post cols 2: "+val.cols[val.cols.length-1]);
                                                        // console.log("pos["+w+"]["+k+"]: "+array[w][k]);
                                                    }
                                                }
                                                // val.cols[i][j] = array[0][0];
                                                // console.log("post "+val.cols[i][j]);
                                            }
                                        }
                                    }
                                    location.href = "file:///D:/UMA/tfg/Quirk-master/out/quirk.html#circuit="+JSON.stringify(val, null, '');
                                    // let newInspector = syncArea(displayed.get()).withHand(newHand).afterDropping().afterTidyingUp();
                                    // let clearHand = newInspector.hand.withPos(undefined);
                                    // let clearInspector = newInspector.withJustEnoughWires(clearHand, 0);
                                    // revision.commit(clearInspector.snapshot());
                                    // newHand.heldGate.height = 2;
                                    document.body.removeChild(menu);
                                });
                            }
                        }
                    }
                }
            }

            document.getElementById("dup").addEventListener("click", function(){
                //console.log(newHand);
                let newInspector = syncArea(displayed.get()).withHand(newHand).afterDropping().afterTidyingUp();
                let clearHand = newInspector.hand.withPos(undefined);
                let clearInspector = newInspector.withJustEnoughWires(clearHand, 0);
                let displayedCircuit = newInspector.displayedCircuit;
                revision.commit(clearInspector.snapshot());
                document.body.removeChild(menu);
            });

            document.getElementById("del").addEventListener("click", function(){
                let cur = syncArea(displayed.get());
                let initOver = cur.tryGetHandOverButtonKey();
                let newHand = cur.hand.withPos(eventPosRelativeTo(ev, canvas));
                let newInspector;
                if (initOver !== undefined && initOver.startsWith('wire-init-')) {
                    let newCircuit = cur.displayedCircuit.circuitDefinition.withSwitchedInitialStateOn(
                        parseInt(initOver.substr(10)), 0);
                    newInspector = cur.withCircuitDefinition(newCircuit).withHand(newHand).afterTidyingUp();
                } else {
                    newInspector = cur.
                        withHand(newHand).
                        afterGrabbing(false, false, true, false). // Grab the gate.
                        withHand(newHand). // Lose the gate.
                        afterTidyingUp().
                        withJustEnoughWires(newHand, 0);
                }
                if (!displayed.get().isEqualTo(newInspector)) {
                    revision.commit(newInspector.snapshot());
                    ev.preventDefault();
                }
                document.body.removeChild(menu);
            });
        }

        ev.preventDefault();
    });

// Middle-click to delete a gate.
canvasDiv.addEventListener('mousedown', ev => {
    if (!isMiddleClicking(ev)) {
        return;
    }
    let cur = syncArea(displayed.get());
    let initOver = cur.tryGetHandOverButtonKey();
    let newHand = cur.hand.withPos(eventPosRelativeTo(ev, canvas));
    let newInspector;
    if (initOver !== undefined && initOver.startsWith('wire-init-')) {
        let newCircuit = cur.displayedCircuit.circuitDefinition.withSwitchedInitialStateOn(
            parseInt(initOver.substr(10)), 0);
        newInspector = cur.withCircuitDefinition(newCircuit).withHand(newHand).afterTidyingUp();
    } else {
        newInspector = cur.
            withHand(newHand).
            afterGrabbing(false, false, true, false). // Grab the gate.
            withHand(newHand). // Lose the gate.
            afterTidyingUp().
            withJustEnoughWires(newHand, 0);
            if(document.getElementById('menu') !== null) {
                document.body.removeChild(document.getElementById('menu'));
            }
    }
    if (!displayed.get().isEqualTo(newInspector)) {
        revision.commit(newInspector.snapshot());
        ev.preventDefault();
    }
});

// When mouse moves without dragging, track it (for showing hints and things).
canvasDiv.addEventListener('mousemove', ev => {
    if (!displayed.get().hand.isBusy()) {
        let newHand = displayed.get().hand.withPos(eventPosRelativeTo(ev, canvas));
        let newInspector = displayed.get().withHand(newHand);
        displayed.set(newInspector);
    }
});
canvasDiv.addEventListener('mouseleave', () => {
    if (!displayed.get().hand.isBusy()) {
        let newHand = displayed.get().hand.withPos(undefined);
        let newInspector = displayed.get().withHand(newHand);
        displayed.set(newInspector);
    }
});

let obsIsAnyOverlayShowing = new ObservableSource();
initUrlCircuitSync(revision);
initExports(revision, mostRecentStats, obsIsAnyOverlayShowing.observable());
initForge(revision, obsIsAnyOverlayShowing.observable());
initUndoRedo(revision, obsIsAnyOverlayShowing.observable());
initClear(revision, obsIsAnyOverlayShowing.observable());
initMenu(revision, obsIsAnyOverlayShowing.observable());
initExportIBM(revision, obsIsAnyOverlayShowing.observable());
initInspect(revision, obsIsAnyOverlayShowing.observable());
initExportsCustom(revision, obsIsAnyOverlayShowing.observable());
initTitleSync(revision);
obsForgeIsShowing.
    zipLatest(obsExportsIsShowing, (e1, e2) => e1 || e2).
    zipLatest(obsMenuIsShowing, (e1, e2) => e1 || e2).
    whenDifferent().
    subscribe(e => {
        obsIsAnyOverlayShowing.send(e);
        canvasDiv.tabIndex = e ? -1 : 0;
    });

// If the webgl initialization is going to fail, don't fail during the module loading phase.
haveLoaded = true;
setTimeout(() => {
    inspectorDiv.style.display = 'block';
    redrawNow();
    document.getElementById("loading-div").style.display = 'none';
    document.getElementById("close-menu-button").style.display = 'block';
    if (!displayed.get().displayedCircuit.circuitDefinition.isEmpty()) {
        closeMenu();
    }

    try {
        initializedWglContext().onContextRestored = () => redrawThrottle.trigger();
    } catch (ex) {
        // If that failed, the user is already getting warnings about WebGL not being supported.
        // Just silently log it.
        console.error(ex);
    }
}, 0);
