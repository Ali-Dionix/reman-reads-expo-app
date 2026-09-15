// The screen-snapshot seam — THE WEB HALF, and the shape both halves share.
//
// react-native-view-shot's web entry imports html2canvas, which is not
// installed and never will be: the parity rig does not need a snapshot of a
// DOM it can already style, and the real website has the browser's own
// view transition. So the module is resolved by platform, as ../lib/stripeSdk
// is: this file answers on web (and to tsc) with nothing, and
// ./viewShot.native.ts answers on iOS and Android with the real package.
// ThemeStage imports "./viewShot" and never names the package itself; with
// nothing here, the switch falls back to the plain flip.

export type ShotOptions = {
  format?: "jpg" | "png";
  /** 0–1, lossy formats only. */
  quality?: number;
  result?: "tmpfile" | "data-uri";
};

export type ViewShot = {
  /** Draw a native view into an image and answer its uri. */
  captureRef: (view: unknown, options?: ShotOptions) => Promise<string>;
  /** Delete a tmpfile the capture wrote. */
  releaseCapture: (uri: string) => void;
};

/** Null on web: no snapshots on this platform. */
export const viewShot: ViewShot | null = null;
