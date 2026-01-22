import { $ } from "bun";
import { tmpdir } from "os";
import { join } from "path";
import type { Platform, WindowInfo, DisplayInfo } from "../types.ts";

const LIST_WINDOWS_SCRIPT = `
ObjC.import("CoreGraphics");
ObjC.import("Foundation");

const kCGWindowListOptionOnScreenOnly = 1 << 0;
const kCGWindowListExcludeDesktopElements = 1 << 4;

const cfArray = $.CGWindowListCopyWindowInfo(
  kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements,
  0
);

const count = $.CFArrayGetCount(cfArray);
const result = [];

for (let i = 0; i < count; i++) {
  const dict = $.CFArrayGetValueAtIndex(cfArray, i);
  const nsDict = ObjC.castRefToObject(dict);

  const layer = nsDict.objectForKey("kCGWindowLayer");
  if (!layer || layer.intValue !== 0) continue;

  const owner = nsDict.objectForKey("kCGWindowOwnerName");
  if (!owner) continue;

  const name = nsDict.objectForKey("kCGWindowName");
  const num = nsDict.objectForKey("kCGWindowNumber");
  const bounds = nsDict.objectForKey("kCGWindowBounds");

  result.push({
    id: String(num.intValue),
    title: name ? ObjC.unwrap(name) : "",
    app: ObjC.unwrap(owner),
    bounds: {
      x: Math.round(bounds.objectForKey("X").doubleValue),
      y: Math.round(bounds.objectForKey("Y").doubleValue),
      width: Math.round(bounds.objectForKey("Width").doubleValue),
      height: Math.round(bounds.objectForKey("Height").doubleValue)
    }
  });
}

JSON.stringify(result);
`;

const LIST_DISPLAYS_SCRIPT = `
ObjC.import("AppKit");

const screens = $.NSScreen.screens;
const count = screens.count;
const result = [];

for (let i = 0; i < count; i++) {
  const screen = screens.objectAtIndex(i);
  const frame = screen.frame;
  const name = ObjC.unwrap(screen.localizedName);

  result.push({
    id: i + 1,
    name: name,
    primary: i === 0,
    bounds: {
      x: Math.round(frame.origin.x),
      y: Math.round(frame.origin.y),
      width: Math.round(frame.size.width),
      height: Math.round(frame.size.height)
    }
  });
}

JSON.stringify(result);
`;

async function listWindows(): Promise<WindowInfo[]> {
  try {
    const result = await $`osascript -l JavaScript -e ${LIST_WINDOWS_SCRIPT}`.text();
    return JSON.parse(result.trim());
  } catch {
    return [];
  }
}

async function listDisplays(): Promise<DisplayInfo[]> {
  try {
    const result = await $`osascript -l JavaScript -e ${LIST_DISPLAYS_SCRIPT}`.text();
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
