// The screen-snapshot seam — THE NATIVE HALF. See ./viewShot.ts for why the
// package is named here and nowhere else.

import { captureRef, releaseCapture } from "react-native-view-shot";

import type { ViewShot } from "./viewShot";

export const viewShot: ViewShot | null = {
  captureRef: (view, options) => captureRef(view as never, options),
  releaseCapture: (uri) => releaseCapture(uri),
};
