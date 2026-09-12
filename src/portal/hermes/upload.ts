// The drop zone's picker — `<input type="file" accept="image/*">` on the
// site, a photo roll and a camera on a phone (the copy says "photograph").
//
// The one seam the upload flow has. The screen owns the figure, the caption
// (`<name>, uploaded.`), the "remove" link and the margin's UPLOAD_NOTE, all
// driven by the PickedPage this returns; none of that needs to change when
// a picker lands. It has not yet: expo-image-picker is not in package.json,
// which is a shared file (listed under sharedRequests — `npx expo install
// expo-image-picker`, then launchImageLibraryAsync / launchCameraAsync
// behind an action sheet here). Until then CAN_PICK is false and the drop
// zone is a disabled button rather than a dead one.

export type PickedPage = {
  /** A file or content uri the Image component can draw. */
  uri: string;
  /** The file's own name — the caption prints it. */
  name: string;
};

/** Whether this build can open a picker at all. */
export const CAN_PICK = false;

/** Open the picker; null when the reader backs out (or no picker exists). */
export async function pickPage(): Promise<PickedPage | null> {
  return null;
}
