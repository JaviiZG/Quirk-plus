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
function initInspect(revision, obsIsAnyOverlayShowing) {
    // Show/hide exports overlay.
    (() => {
        const inspectButton = /** @type {!HTMLButtonElement} */ document.getElementById('inspect-button');
        const inspectDiv = /** @type {HTMLDivElement} */ document.getElementById('inspect-control-div');
        let backButton = /** @type {!HTMLButtonElement} */ document.getElementById('back-button');
        let startButton = /** @type {!HTMLButtonElement} */ document.getElementById('start-button');
        let nextButton = /** @type {!HTMLButtonElement} */ document.getElementById('next-button');
        let finalButton = /** @type {!HTMLButtonElement} */ document.getElementById('final-button');
        // console.log("llega2");
        // console.log(exportOverlay);
        // console.log(exportDiv);

        const reduceColumns = (array) => {
            let array2 = [];
            for(let i = 0; i < array.length-1; i++) {
                array2.push(array[i]);
            }
            return array2;
        }

        let cols = 0;
        inspectButton.addEventListener('click', () => {
            const loc = location.toString().split("#")[0];
            if (inspectButton.checked) {
                inspectButton.style.backgroundColor = "#74ff67";
                console.log("location: "+loc);
                inspectDiv.style.display = 'inline-block';
                cols = 0;
                backButton = /** @type {!HTMLButtonElement} */ document.getElementById('back-button');
                startButton = /** @type {!HTMLButtonElement} */ document.getElementById('start-button');
                nextButton = /** @type {!HTMLButtonElement} */ document.getElementById('next-button');
                finalButton = /** @type {!HTMLButtonElement} */ document.getElementById('final-button');
                let url = decodeURI(window.location);
                if(url.split("=")[1]!=undefined){
                    let val = JSON.parse(url.split("=")[1]);
                    console.log(val.cols);
                    sessionStorage.setItem("circuit", JSON.stringify(val));
                    if(val.cols.length > 1) {
                        val.cols = [val.cols[cols]];
                        backButton.addEventListener('click', () => {
                            if(cols > 0) {
                                cols--;
                                val.cols = reduceColumns(val.cols);
                                location.href = loc+"#circuit="+JSON.stringify(val, null, '');
                            }
                        });
                        nextButton.addEventListener('click', () => {
                            let prevval = JSON.parse(sessionStorage.getItem("circuit"));
                            if(cols < prevval.cols.length-1) {
                                cols++;
                                val.cols = (val.cols).concat([prevval.cols[cols]]);
                                location.href = loc+"#circuit="+JSON.stringify(val, null, '');
                            }
                        });
                        startButton.addEventListener('click', () => {
                            val = JSON.parse(sessionStorage.getItem("circuit"));
                            cols = 0;
                            val.cols = [val.cols[0]];
                            location.href = loc+"#circuit="+JSON.stringify(val, null, '');
                        });
                        finalButton.addEventListener('click', () => {
                            val = JSON.parse(sessionStorage.getItem("circuit"));
                            cols = val.cols.length-1;
                            location.href = loc+"#circuit="+JSON.stringify(val, null, '');
                        });
                        console.log(loc+"#circuit="+JSON.stringify(val, null, ''));
                        location.href = loc+"#circuit="+JSON.stringify(val, null, '');
                    }
                }
            }
            else {
                let url = decodeURI(window.location);
                inspectDiv.style.display = 'none';
                inspectButton.style.backgroundColor = "#FFFFFF";
                backButton.replaceWith(backButton.cloneNode(true));
                nextButton.replaceWith(nextButton.cloneNode(true));
                startButton.replaceWith(startButton.cloneNode(true));
                finalButton.replaceWith(finalButton.cloneNode(true));
                if(url.split("=")[1]!=undefined){
                    
                    val = JSON.parse(sessionStorage.getItem("circuit"));
                    cols = 0;
                    location.href = loc+"#circuit="+JSON.stringify(val, null, '');
                    sessionStorage.removeItem("circuit");
                }
                // location.reload();
            }
            
        });
    })();    

}

export {initInspect, obsExportsIsShowing}
