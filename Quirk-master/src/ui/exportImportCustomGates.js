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

function initExportsCustom(revision, obsIsAnyOverlayShowing) {
    // Show/hide exports overlay.
    (() => {
        const exportButton = /** @type {!HTMLButtonElement} */ document.getElementById('export-import-custom-gates-button');
        const exportOverlay = /** @type {!HTMLDivElement} */ document.getElementById('export-custom-gates-overlay');
        const exportDiv = /** @type {HTMLDivElement} */ document.getElementById('export-custom-gates-div');
        // console.log("llega2");
        // console.log(exportOverlay);
        // console.log(exportDiv);
        exportButton.addEventListener('click', () => exportsIsVisible.set(true));
        obsIsAnyOverlayShowing.subscribe(e => { exportButton.disabled = e; });
        exportOverlay.addEventListener('click', () => exportsIsVisible.set(false));
        document.addEventListener('keydown', e => {
            const ESC_KEY = 27;
            if (e.keyCode === ESC_KEY) {
                exportsIsVisible.set(false)
            }
        });
        obsExportsIsShowing.subscribe(showing => {
            exportDiv.style.display = showing ? 'block' : 'none';
            if (showing) {
                document.getElementById('export-link-copy-button').focus();
            }
        });
    })();

    /**
     * @param {!HTMLButtonElement} button
     * @param {!HTMLElement} contentElement
     * @param {!HTMLElement} resultElement
     * @param {undefined|!function(): !string} contentMaker
     */
    const setupButtonElementCopyToClipboard = (button, contentElement, contentMaker=undefined) =>
        button.addEventListener('click', () => {
            if (contentMaker !== undefined) {
                contentElement.innerText = contentMaker();
            }

            //noinspection UnusedCatchParameterJS,EmptyCatchBlockJS
            try {
                selectAndCopyToClipboard(contentElement);
                // resultElement.innerText = "Done!";
            } catch (ex) {
                // resultElement.innerText = "It didn't work...";
                console.warn('Clipboard copy failed.', ex);
            }
            button.disabled = true;
            setTimeout(() => {
                // resultElement.innerText = "";
                button.disabled = false;
            }, 1000);
        });

    //Export Custom Gates
    (() => {
        const jsonTextElement = /** @type {HTMLPreElement} */ document.getElementById('export-custom-gates-pre');
        const copyButton = /** @type {HTMLButtonElement} */ document.getElementById('export-custom-gates-button');
        const copyResultElement = /** @type {HTMLElement} */ document.getElementById('export-json-copy-result');
        
        revision.latestActiveCommit().subscribe(jsonText => {
            //noinspection UnusedCatchParameterJS
            try {
                let val = JSON.parse(jsonText);
                // console.log(jsonText);
                jsonTextElement.innerText = JSON.stringify(val.gates, null, '  ');
                setupButtonElementCopyToClipboard(copyButton, jsonTextElement);
            } catch (_) {
                jsonTextElement.innerText = jsonText;
            }
        });
    })();

    //Import Custom Gates
    (() => {
        const jsonTextElement = /** @type {HTMLPreElement} */ document.getElementById('import-custom-gates-pre');
        const importButton = /** @type {HTMLButtonElement} */ document.getElementById('import-custom-gates-button');
        const copyResultElement = /** @type {HTMLElement} */ document.getElementById('import-json-copy-result');
        //setupButtonElementCopyToClipboard(copyButton, jsonTextElement, copyResultElement);
        // revision.latestActiveCommit().subscribe(jsonText => {
            //noinspection UnusedCatchParameterJS

            const check = (array, array2) => {
                for(let i = 0; i < array.length; i++){
                    // console.log(array[i].id);
                    // console.log(array2.id);
                    if(array[i].id === array2.id){
                        return false;
                    }
                }
                return true;
            }

            const concatWithCheck = (array, array2) => {
                console.log(array);
                console.log(array2);
                for(let i = 0; i < array2.length; i++){
                    if(check(array, array2[i])){
                        array.push(array2[i]);
                    }
                }
                return array;
            }

            importButton.addEventListener('click', () => {
                try {
                    let url = decodeURI(window.location);
                    let val = JSON.parse(url.split("=")[1]);
                    let introducedVals = JSON.parse(jsonTextElement.value);
                    // let val = JSON.parse(jsonText);
                    let location = window.location;
                    if(val.gates === undefined){
                        val.gates = introducedVals;
                        // console.log(val.gates);
                        location.href = "file:///D:/UMA/tfg/Quirk-master/out/quirk.html#circuit="+JSON.stringify(val, null, '');
                        // location.reload(true);
                        
                    }else{
                        // console.log("array", array);
                        // val.gates = (introducedVals.concat(val.gates));
                        val.gates = (concatWithCheck(introducedVals, val.gates));
                        // console.log("valgates", JSON.stringify(val.gates, null, ''));
                        location.href = "file:///D:/UMA/tfg/Quirk-master/out/quirk.html#circuit="+JSON.stringify(val, null, '');
                    }
                    // console.log(val);
                    // jsonTextElement.innerText = JSON.stringify(val.gates, null, '  ');
                } catch (_) {
                    jsonTextElement.innerText = jsonText;
                }
            });
            
        // });
    })();

}

export {initExportsCustom, obsExportsIsShowing}
