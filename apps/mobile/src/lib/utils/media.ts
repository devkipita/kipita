import { Alert, Platform, Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  ImageManipulator,
  SaveFormat,
} from "expo-image-manipulator";

function warnPermissionDenied() {
  const title = "Photo access needed";
  const message =
    "Kipita needs access to your photos to attach images. Enable it in Settings.";
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message, [
    { text: "Not now", style: "cancel" },
    { text: "Open Settings", onPress: () => Linking.openSettings() },
  ]);
}

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
}

/**
 * Largest edge we keep for user-generated images. Anything bigger is downscaled
 * before it ever hits the network — the app should never ship a 12MP camera
 * original into a feed thumbnail.
 */
const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.6;

/**
 * Compress + resize a local image so it uploads fast and renders cheaply.
 * Keeps aspect ratio; only shrinks (never upscales).
 */
export async function compressImage(
  uri: string,
  width?: number,
  height?: number,
): Promise<PickedImage> {
  const longEdge = Math.max(width ?? 0, height ?? 0);
  const needsResize = longEdge > MAX_EDGE;

  const context = ImageManipulator.manipulate(uri);
  if (needsResize && width && height) {
    // Resize on the longer edge, preserving aspect ratio.
    if (width >= height) {
      context.resize({ width: MAX_EDGE });
    } else {
      context.resize({ height: MAX_EDGE });
    }
  }

  const image = await context.renderAsync();
  const result = await image.saveAsync({
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}

/**
 * Ask for library permission and let the user pick one image. Returns the RAW
 * asset (no compression) so callers can show it as an instant local preview
 * before the slower compress/upload work runs. Null if denied or cancelled.
 */
export async function pickImage(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    if (!permission.canAskAgain) warnPermissionDenied();
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
    allowsEditing: false,
    // We do our own compression later, so pull the full asset here.
  });

  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  return { uri: asset.uri, width: asset.width, height: asset.height };
}

/**
 * Pick + compress in one step. Returns null if permission denied or cancelled.
 * For flows that want an instant preview, use {@link pickImage} then
 * {@link compressImage} separately.
 */
export async function pickAndCompressImage(): Promise<PickedImage | null> {
  const picked = await pickImage();
  if (!picked) return null;
  try {
    return await compressImage(picked.uri, picked.width, picked.height);
  } catch {
    // If manipulation fails for any reason, fall back to the raw pick.
    return picked;
  }
}
