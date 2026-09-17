// The four touches the app makes — one vocabulary, so a control never has to
// pick an ImpactFeedbackStyle and no two controls disagree about the same
// gesture. Every call swallows its error: a phone with haptics off, a web
// build, a simulator, a call made while backgrounded — none of them are
// worth a red box. Never two of these for one gesture.
//
//   tick   a selection changed — a tab, a picker step, a chip, a facet
//   tap    something was done — play / pause, a toggle, a sheet snapped
//   warn   the app said no — a padlock, a refused seek
//   done   something finished — signed in, an order placed
import * as Haptics from "expo-haptics";

const quiet = (p: Promise<unknown>) => {
  p.catch(() => {});
};

export const haptic = {
  tick: (): void => quiet(Haptics.selectionAsync()),
  tap: (): void => quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  warn: (): void => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  done: (): void => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
};
