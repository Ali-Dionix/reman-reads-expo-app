// The Stripe SDK's seam — THE NATIVE HALF. See ./stripeSdk.ts for why the
// package is only ever named here. Expo Go (SDK 57) carries the native side;
// a dev build gets it from the config plugin in app.json.

import { initPaymentSheet, initStripe, presentPaymentSheet } from "@stripe/stripe-react-native";

import type { StripeSdk } from "./stripeSdk";

export const stripeSdk: StripeSdk | null = {
  initStripe: (o) => initStripe(o),
  initPaymentSheet: (o) => initPaymentSheet(o as Parameters<typeof initPaymentSheet>[0]),
  presentPaymentSheet: () => presentPaymentSheet(),
};
