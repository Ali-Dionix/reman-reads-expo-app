// Two small formatters the home screen shares with the web's enhancers.

/** "4 hr 12 min" / "4 hr" / "23 min" — never "0 min". AccountEnhancer.fmtDur. */
export const fmtDur = (secs: number): string => {
  const mins = Math.max(1, Math.round(secs / 60));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
};
