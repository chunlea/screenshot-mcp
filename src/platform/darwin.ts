import { $ } from "bun";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { Platform, WindowInfo, DisplayInfo } from "../types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptsDir = join(__dirname, "scripts");

async function listWindows(): Promise<WindowInfo[]> {
  try {
    const scriptPath = join(scriptsDir, "list-windows.swift");
    const result = await $`swift ${scriptPath}`.text();
    return JSON.parse(result.trim());
  } catch {
    return [];
  }
}

async function listDisplays(): Promise<DisplayInfo[]> {
  try {
    const scriptPath = join(scriptsDir, "list-displays.swift");
    const result = await $`swift ${scriptPath}`.text();
    return JSON.parse(result.trim());
  } catch {
    return [
      {
        id: 1,
        name: "Main Display",
        primary: true,
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      },
    ];
  }
}

async function screenshotWindow(windowId: string): Promise<Buffer> {
  const tmpFile = join(tmpdir(), `screenshot-${Date.now()}.png`);
  await $`screencapture -l ${windowId} -o -x ${tmpFile}`;
  const buffer = await Bun.file(tmpFile).arrayBuffer();
  await $`rm ${tmpFile}`;
  return Buffer.from(buffer);
}

async function screenshotScreen(displayId?: number): Promise<Buffer> {
  const tmpFile = join(tmpdir(), `screenshot-${Date.now()}.png`);
  if (displayId !== undefined) {
    await $`screencapture -D ${displayId} -o -x ${tmpFile}`;
  } else {
    await $`screencapture -o -x ${tmpFile}`;
  }
  const buffer = await Bun.file(tmpFile).arrayBuffer();
  await $`rm ${tmpFile}`;
  return Buffer.from(buffer);
}

async function screenshotRegion(
  x: number,
  y: number,
  width: number,
  height: number
): Promise<Buffer> {
  const tmpFile = join(tmpdir(), `screenshot-${Date.now()}.png`);
  const region = `${x},${y},${width},${height}`;
  await $`screencapture -R ${region} -o -x ${tmpFile}`;
  const buffer = await Bun.file(tmpFile).arrayBuffer();
  await $`rm ${tmpFile}`;
  return Buffer.from(buffer);
}

export const darwin: Platform = {
  listWindows,
  listDisplays,
  screenshotWindow,
  screenshotScreen,
  screenshotRegion,
};
