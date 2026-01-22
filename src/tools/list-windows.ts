import { getPlatform } from "../platform/index.ts";

export async function listWindows() {
  const platform = await getPlatform();
  return await platform.listWindows();
}

export const listWindowsSchema = {
  name: "list_windows",
  description: "List all visible windows on the system. Returns window ID, title, app name, and bounds for each window.",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: [],
  },
};
