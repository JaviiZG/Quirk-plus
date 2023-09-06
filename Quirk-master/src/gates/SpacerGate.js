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
import {GateBuilder} from "../circuit/Gate.js"
import {GatePainting} from "../draw/GatePainting.js"
import {Gate} from "../circuit/Gate.js"
import {ketArgs, ketShaderPermute} from "../circuit/KetShaderUtil.js"
import {Rect} from "../math/Rect.js"

function applyForwardGradientShaders(ctx, span) {
    if (span > 1) {
        ctx.applyOperation(reverseShaderForSize(span));
    }
    for (let i = 0; i < span; i++) {
        if (i > 0) {
            applyControlledPhaseGradient(ctx, i + 1, +1);
        }
        HalfTurnGates.H.customOperation(ctx.withRow(ctx.row + i));
    }
}

const FOURIER_TRANSFORM_MATRIX_MAKER = span =>
    Matrix.generate(1<<span, 1<<span, (r, c) => Complex.polar(Math.pow(0.5, span/2), Math.PI*2*r*c/(1<<span)));

    
let SpacerGate = Gate.buildFamily(1, 16, (span, builder) => builder.
setSerializedId("..." + span).
setSymbol("...").
setTitle("Resizable Spacer").
setBlurb("A gate with no effect.").
markAsNotInterestedInControls().
promiseHasNoNetEffectOnStateVector());


// SpacerGate.setSerializedId("SPC");
// SpacerGate.setSymbol("...");
// SpacerGate.setTitle("Resizable Spacer");
// SpacerGate.setBlurb("A gate with no effect.");
// SpacerGate.markAsNotInterestedInControls();
// SpacerGate.promiseHasNoNetEffectOnStateVector();
// SpacerGate.setDrawer(args => {
//     // Drawn as an ellipsis.
//     GatePainting.paintBackground(args);
//     if (args.isInToolbox || args.isHighlighted) {
//         let backColor = Config.GATE_FILL_COLOR;
//         if (args.isHighlighted) {
//             backColor = Config.HIGHLIGHTED_GATE_FILL_COLOR;
//         }
//         args.painter.fillRect(args.rect, backColor);
//         GatePainting.paintOutline(args);
//     } else {
//         // Whitespace for the ellipsis.
//         let {x, y} = args.rect.center();
//         let r = new Rect(x - 14, y - 2, 28, 4);
//         args.painter.fillRect(r, Config.BACKGROUND_COLOR_CIRCUIT);
//     }
//     args.painter.fillCircle(args.rect.center().offsetBy(0, 20), 2, "black");
//     args.painter.fillCircle(args.rect.center(), 2, "black");
//     args.painter.fillCircle(args.rect.center().offsetBy(0, -20), 2, "black");
// });

// let SpacerGate = new GateBuilder().
// setSerializedIdAndSymbol("...").
// setTitle("Spacer").
// setHeight(2).
// setBlurb("A gate with no effect.").
// markAsNotInterestedInControls().
// promiseHasNoNetEffectOnStateVector().
// setDrawer(args => {
//     // Drawn as an ellipsis.
//     GatePainting.paintBackground(args);
//     if (args.isInToolbox || args.isHighlighted) {
//         let backColor = Config.GATE_FILL_COLOR;
//         if (args.isHighlighted) {
//             backColor = Config.HIGHLIGHTED_GATE_FILL_COLOR;
//         }
//         args.painter.fillRect(args.rect, backColor);
//         GatePainting.paintOutline(args);
//     } else {
//         // Whitespace for the ellipsis.
//         let {x, y} = args.rect.center();
//         let r = new Rect(x - 14, y - 2, 28, 4);
//         args.painter.fillRect(r, Config.BACKGROUND_COLOR_CIRCUIT);
//     }
//     args.painter.fillCircle(args.rect.center().offsetBy(0, 20), 2, "black");
//     args.painter.fillCircle(args.rect.center(), 2, "black");
//     args.painter.fillCircle(args.rect.center().offsetBy(0, -20), 2, "black");
// }).
// gate;




// Gate.buildFamily(1, 16, (span, builder) => builder.
// setSerializedId("QFT" + span).
// setSymbol("QFT").
// setTitle("Fourier Transform Gate").
// setBlurb("Transforms to/from phase frequency space.").
// setActualEffectToUpdateFunc(ctx => applyForwardGradientShaders(ctx, span)).
// promiseEffectIsUnitary());



export {SpacerGate}
