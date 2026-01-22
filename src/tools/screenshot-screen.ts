import { getPlatform } from "../platform/index.ts";
import { saveScreenshot, bufferToBase64DataUrl } from "../utils/storage.ts";
import type { ScreenshotResult } from "../types.ts";

interface ScreenshotScreenInput {
  display_id?: number;
  save_dir?: string;
}

export async function screenshotScreen(
  input: ScreenshotScreenInput
): Promise<ScreenshotResult> {
  const platform = await getPlatform();
  const buffer = await platform.screenshotScreen(input.display_id);

  const result: ScreenshotResult = {
    image: bufferToBase64DataUrl(buffer),
  };

  if (input.save_dir) {
    result.saved_path = await saveScreenshot(buffer, input.save_dir);
  }

  return result;
}

export const screenshotScreenSchema = {
  name: "screenshot_screen",
  description:
    "Capture a screenshot of the entire screen. Use list_displays to see available displays.",
  inputSchema: {
    type: "object" as const,
    properties: {
      display_id: {
        type: "number",
        description: "Display ID from list_displays. Defaults to main display.",
      },
      save_dir: {
        type: "string",
        description: "Directory to save the screenshot. Files are organized by date.",
      },
    },
    required: [],
  },
};
