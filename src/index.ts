#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";

import {
  listWindows,
  listWindowsSchema,
  listDisplays,
  listDisplaysSchema,
  screenshotWindow,
  screenshotWindowSchema,
  screenshotScreen,
  screenshotScreenSchema,
  screenshotRegion,
  screenshotRegionSchema,
} from "./tools/index.ts";

const server = new Server(
  { name: "screenshot-mcp", version: "0.1.0" },
  { capabilities: { tools: { listChanged: false } } }
);

// Register tool listing handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      listWindowsSchema,
      listDisplaysSchema,
      screenshotWindowSchema,
      screenshotScreenSchema,
      screenshotRegionSchema,
    ],
  };
});

// Register tool call handler
server.setRequestHandler(
  CallToolRequestSchema,
  async (request): Promise<CallToolResult> => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "list_windows": {
          const windows = await listWindows();
          return {
            content: [{ type: "text", text: JSON.stringify(windows, null, 2) }],
          };
        }

        case "list_displays": {
          const displays = await listDisplays();
          return {
            content: [{ type: "text", text: JSON.stringify(displays, null, 2) }],
          };
        }

        case "screenshot_window": {
          const result = await screenshotWindow(args as any);
          return {
            content: [
              {
                type: "image",
                data: result.image.replace("data:image/png;base64,", ""),
                mimeType: "image/png",
              },
              ...(result.saved_path
                ? [{ type: "text" as const, text: `Saved to: ${result.saved_path}` }]
                : []),
            ],
          };
        }

        case "screenshot_screen": {
          const result = await screenshotScreen(args as any);
          return {
            content: [
              {
                type: "image",
                data: result.image.replace("data:image/png;base64,", ""),
                mimeType: "image/png",
              },
              ...(result.saved_path
                ? [{ type: "text" as const, text: `Saved to: ${result.saved_path}` }]
                : []),
            ],
          };
        }

        case "screenshot_region": {
          const result = await screenshotRegion(args as any);
          return {
            content: [
              {
                type: "image",
                data: result.image.replace("data:image/png;base64,", ""),
                mimeType: "image/png",
              },
              ...(result.saved_path
                ? [{ type: "text" as const, text: `Saved to: ${result.saved_path}` }]
                : []),
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

// Start server with stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
