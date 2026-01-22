import { getPlatform } from "../platform/index.ts";
import { saveScreenshot, bufferToBase64DataUrl } from "../utils/storage.ts";
import type { ScreenshotResult } from "../types.ts";

interface ScreenshotRegionInput {
  x: number;
  y: number;
  width: number;
  height: number;
  save_dir?: string;
}

export async function screenshotRegion(
  input: ScreenshotRegionInput
): Promise<ScreenshotResult> {
  const platform = await getPlatform();
  const buffer = await platform.screenshotRegion(
    input.x,
    input.y,
    input.width,
    input.height
  );

  const result: ScreenshotResult = {
    image: bufferToBase64DataUrl(buffer),
  };

  if (input.save_dir) {
    result.saved_path = await saveScreenshot(buffer, input.save_dir);
  }

  return result;
}

export const screenshotRegionSchema = {
  name: "screenshot_region",
  description: "Capture a screenshot of a specific region on the screen.",
  inputSchema: {
    type: "object" as const,
    properties: {
      x: {
        type: "number",
        description: "X coordinate of the top-left corner",
      },
      y: {
        type: "number",
        description: "Y coordinate of the top-left corner",
      },
      width: {
        type: "number",
        description: "Width of the region",
      },
      height: {
        type: "number",
        description: "Height of the region",
      },
      save_dir: {
        type: "string",
        description: "Directory to save the screenshot. Files are organized by date.",
      },
    },
    required: ["x", "y", "width", "height"],
  },
};
