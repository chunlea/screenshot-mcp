import type { Platform } from "../types.ts";

export async function getPlatform(): Promise<Platform> {
  switch (process.platform) {
    case "darwin": {
      const { darwin } = await import("./darwin.ts");
      return darwin;
    }
    case "win32": {
      // TODO: Implement Windows support
      throw new Error("Windows support not yet implemented");
    }
    case "linux": {
      // TODO: Implement Linux support
      throw new Error("Linux support not yet implemented");
    }
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}
