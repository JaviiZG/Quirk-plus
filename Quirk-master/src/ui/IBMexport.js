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

import {Config} from "../Config.js"
import {ObservableValue} from "../base/Obs.js"
import {Serializer} from "../circuit/Serializer.js"
import {selectAndCopyToClipboard} from "../browser/Clipboard.js"
import {fromJsonText_CircuitDefinition} from "../circuit/Serializer.js"
import {saveFile} from "../browser/SaveFile.js"

const exportsIsVisible = new ObservableValue(false);
const obsExportsIsShowing = exportsIsVisible.observable().whenDifferent();

/**
 * @param {!Revision} revision
 * @param {!ObservableValue.<!CircuitStats>} mostRecentStats
 * @param {!Observable.<!boolean>} obsIsAnyOverlayShowing
 */
function initExportIBM(revision, obsIsAnyOverlayShowing) {
    // Show/hide exports overlay.
    (() => {
        const exportButton = /** @type {!HTMLButtonElement} */ document.getElementById('export-import-ibm-button');
        const exportOverlay = /** @type {!HTMLDivElement} */ document.getElementById('export-to-ibm-overlay');
        const exportDiv = /** @type {HTMLDivElement} */ document.getElementById('export-to-ibm-div');
        // console.log("llega");
        // console.log(exportOverlay);
        // console.log(exportDiv);
        exportButton.addEventListener('click', () => {exportsIsVisible.set(true); console.log("export button clicked")});
        obsIsAnyOverlayShowing.subscribe(e => { exportButton.disabled = e; });
        exportOverlay.addEventListener('click', () => exportsIsVisible.set(false));
        document.addEventListener('keydown', e => {
            const ESC_KEY = 27;
            if (e.keyCode === ESC_KEY) {
                exportsIsVisible.set(false);
            }
        });
        obsExportsIsShowing.subscribe(showing => {
            exportDiv.style.display = showing ? 'block' : 'none';
            if (showing) {
                document.getElementById('export-link-copy-button').focus();
            }
        });
    })();

    // Export to IBM.
    (() => {
        const downloadButton = /** @type {HTMLButtonElement} */ document.getElementById('export-to-ibm-button');
            // revision.latestActiveCommit().subscribe(jsonText => {
                //noinspection UnusedCatchParameterJS
    
                const maxSize = list => {
                    let result = 0;
                    for (let i = 0; i < list.length; i++) {
                        result = Math.max(result, list[i].length);
                    }
                    return result;
                };
                downloadButton.addEventListener('click', () => {
                    try {
                        let url = decodeURI(window.location);
                        let val = JSON.parse(url.split("=")[1]);
                        let max = maxSize(val.cols);
                        let var1 = "...2";
                        let var2 = "2";
                        console.log("val",val);
                        let code = `OPENQASM 2.0;
include "qelib1.inc";

qreg q[${max}];
`;
                        for(let col = 0; col < val.cols.length; col++){
                            for(let fil = 0; fil < val.cols[col].length; fil++){
                                if(val.cols[col][fil] == ""){
                                    if(val.cols[col][fil].split("...")[1] !== undefined){
                                        code+=`barrier q[${fil}]`;
                                        for(let i = 1 ; i < val.cols[col][fil].split("...")[1]; i++){
                                            code+=`, q[${i}]`;
                                        }
                                        code+=`;
`;
                                    }
                                }
                                else if(val.cols[col][fil] === "X"){
                                    code+=`x q[${fil}];
`;
                                }
                                else if(val.cols[col][fil] === "•"){
                                    code+=`x q[${fil}];
`;
                                }
                                else if(val.cols[col][fil] === "H"){
                                    code+=`h q[${fil}];
`;
                                }
                                else if(val.cols[col][fil] === "Z"){
                                    code+=`z q[${fil}];
`;
                                }
                                else if(val.cols[col][fil] === "Y"){
                                    code+=`y q[${fil}];
`;
                                }
                                else if(val.cols[col][fil] === "Z^½"){
                                    code+=`s q[${fil}];
`;
                                }
                                else if(val.cols[col][fil] === "Z^¼"){
                                    code+=`t q[${fil}];
`;
                                }
                                else if(val.cols[col][fil] === 1){
                                    code+=`barrier q[${fil}];
`;
                                }

                                // console.log("row","i"+col,"j"+fil,val.cols[col][fil]);
                            }
                            for(let i = val.cols[col].length; i < maxSize(val.cols); i++){
                                code+=`barrier q[${i}];
`;
                            }
                        }

                        saveFile("quirk.qasm", code);
                    } catch (_) {
                        
                    }

                });
            //});



    })();

    // Import from IBM.
    (() => {
        const importButton = document.getElementById('import-from-ibm-button');
        importButton.addEventListener('click', () => {
            const input = document.getElementById('formFile');
            const file = input.files[0];
            //console.log(file);
            const reader = new FileReader();
            reader.readAsText(file);

            reader.onload = function() {
                const text = (reader.result).split("\n");
                // console.log(text);
                const maxQubits = text[3].split("")[7];
                const cols = [];
                // for (var m = 0; m < maxQubits; m++) {
                //     cols.push([]);
                // }
                for (var j = 0; j < maxQubits; j++) {
                    var col = [];
                    // console.log(cols);
                    for (var i = 2; i < text.length; i++) {
                        if(text[i] === ""){
                            continue;
                        }
                        if (text[i].includes(""+j)) {
                            col.push(text[i]);
                        }
                    }
                    if(cols.length<col.length){
                        for(var w = cols.length; w < col.length; w++){
                            cols.push([]);
                        }
                    }
                    console.log("col: "+col);
                    console.log("cols: "+cols);
                    for(var c = 0; c < col.length; c++){
                        if(col[c].includes("barrier")){
                            cols[c].push("...1");
                        }
                        if(col[c].includes("x")){
                            cols[c].push("X");
                        }
                        if(col[c].includes("h")){
                            cols[c].push("H");
                        }
                        if(col[c].includes("z")){
                            cols[c].push("Z");
                        }
                        if(col[c].includes("y")){
                            cols[c].push("Y");
                        }
                        if(col[c].includes("s")){
                            cols[c].push("Z^½")
                        }
                        if(col[c].includes("t")){
                            cols[c].push("Z^¼")
                        }
                    }

                    //console.log(cols[j]);
                    // console.log(cols);
                }
                //console.log(JSON.stringify(cols));
                // let url = decodeURI(window.location);
                // let val = JSON.parse(url.split("=")[1]);
                const loc = location.toString().split("#")[0];
                location.href = loc+'#circuit={"cols":'+JSON.stringify(cols)+'}';
                exportsIsVisible.set(false);
            };
        });
        
        
    })();

}

export {initExportIBM, obsExportsIsShowing}
