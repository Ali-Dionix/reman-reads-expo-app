// The Stripe SDK's seam — THE WEB HALF, and the shape both halves share.
//
// @stripe/stripe-react-native has no web build: it reaches native-only
// React Native internals at import, and Metro refuses to put those in a web
// bundle even behind a lazy require (the module is still in the graph). So
// the SDK is resolved by platform: this file answers on web (and to tsc)
// with nothing, and ./stripeSdk.native.ts answers on iOS and Android with
// the real module. payments.ts imports "./stripeSdk" and never names the
// package itself.

export type StripeSdk = {
  initStripe: (o: { publishableKey: string; merchantIdentifier?: string; urlScheme?: string }) => Promise<void>;
  initPaymentSheet: (o: Record<string, unknown>) => Promise<{ error?: { code: string; message: string } }>;
  presentPaymentSheet: () => Promise<{ error?: { code: string; message: string } }>;
};

/** Null on web: no sheet on this platform. */
export const stripeSdk: StripeSdk | null = null;
