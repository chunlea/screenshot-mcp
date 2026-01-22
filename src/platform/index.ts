import type { Platform } from "../types.ts";

export async function getPlatform(): Promise<Platform> {
  switch (process.platform) {
    case "darwin": {
      const { darwin } = await import("./darwin.ts");
      return darwin;
    }
    case "win32": {
      const { win32 } = await import("./win32.ts");
      return win32;
    }
    case "linux": {
      const { linux } = await import("./linux.ts");
      return linux;
    }
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}
