import { getPlatform } from "../platform/index.ts";

export async function listDisplays() {
  const platform = await getPlatform();
  return await platform.listDisplays();
}

export const listDisplaysSchema = {
  name: "list_displays",
  description: "List all available displays/monitors. Returns display ID, name, primary status, and bounds for each display.",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: [],
  },
};
