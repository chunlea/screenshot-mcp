import { getPlatform } from "../platform/index.ts";
import { saveScreenshot, bufferToBase64DataUrl } from "../utils/storage.ts";
import type { ScreenshotResult } from "../types.ts";

interface ScreenshotWindowInput {
  window_id?: string;
  window_title?: string;
  save_dir?: string;
}

export async function screenshotWindow(
  input: ScreenshotWindowInput
): Promise<ScreenshotResult> {
  const platform = await getPlatform();

  let windowId = input.window_id;

  // If window_title is provided, find the window by title
  if (!windowId && input.window_title) {
    const windows = await platform.listWindows();
    const match = windows.find((w) =>
      w.title.toLowerCase().includes(input.window_title!.toLowerCase())
    );
    if (!match) {
      throw new Error(
        `No window found matching title: ${input.window_title}. Use list_windows to see available windows.`
      );
    }
    windowId = match.id;
  }

  if (!windowId) {
    throw new Error(
      "Either window_id or window_title must be provided. Use list_windows to see available windows."
    );
  }

  const buffer = await platform.screenshotWindow(windowId);
  const result: ScreenshotResult = {
    image: bufferToBase64DataUrl(buffer),
  };

  if (input.save_dir) {
    result.saved_path = await saveScreenshot(buffer, input.save_dir);
  }

  return result;
}

export const screenshotWindowSchema = {
  name: "screenshot_window",
  description:
    "Capture a screenshot of a specific window. Provide either window_id (from list_windows) or window_title (fuzzy match).",
  inputSchema: {
    type: "object" as const,
    properties: {
      window_id: {
        type: "string",
        description: "The window ID from list_windows",
      },
      window_title: {
        type: "string",
        description: "Window title to search for (case-insensitive partial match)",
      },
      save_dir: {
        type: "string",
        description: "Directory to save the screenshot. Files are organized by date.",
      },
    },
    required: [],
  },
};
