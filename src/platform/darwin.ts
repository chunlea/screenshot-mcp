import { $ } from "bun";
import { tmpdir } from "os";
import { join } from "path";
import type { Platform, WindowInfo, DisplayInfo } from "../types.ts";

async function listWindows(): Promise<WindowInfo[]> {
  const script = `
    set output to ""
    tell application "System Events"
      set allProcesses to application processes whose visible is true
      repeat with proc in allProcesses
        set procName to name of proc
        try
          set allWindows to windows of proc
          repeat with win in allWindows
            set winName to name of win
            set winPos to position of win
            set winSize to size of win
            set winId to id of win
            set output to output & winId & "||" & winName & "||" & procName & "||" & (item 1 of winPos) & "||" & (item 2 of winPos) & "||" & (item 1 of winSize) & "||" & (item 2 of winSize) & "\\n"
          end repeat
        end try
      end repeat
    end tell
    return output
  `;

  const result = await $`osascript -e ${script}`.text();
  const windows: WindowInfo[] = [];

  for (const line of result.trim().split("\n")) {
    if (!line) continue;
    const [id, title, app, x, y, width, height] = line.split("||");
    if (id && app) {
      windows.push({
        id,
        title: title || "",
        app,
        bounds: {
          x: parseInt(x) || 0,
          y: parseInt(y) || 0,
          width: parseInt(width) || 0,
          height: parseInt(height) || 0,
        },
      });
    }
  }

  return windows;
}

async function listDisplays(): Promise<DisplayInfo[]> {
  const script = `
    use framework "AppKit"
    set output to ""
    set screens to current application's NSScreen's screens()
    set mainFrame to (current application's NSScreen's mainScreen()'s frame())
    set mainHeight to item 2 of item 2 of mainFrame

    repeat with i from 1 to count of screens
      set scr to item i of screens
      set scrFrame to scr's frame()
      set scrOrigin to item 1 of scrFrame
      set scrSize to item 2 of scrFrame
      set scrName to scr's localizedName() as text
      set isMain to (i = 1)
      set output to output & i & "||" & scrName & "||" & isMain & "||" & (item 1 of scrOrigin) & "||" & (item 2 of scrOrigin) & "||" & (item 1 of scrSize) & "||" & (item 2 of scrSize) & "\\n"
    end repeat
    return output
  `;

  const result = await $`osascript -l JavaScript -e ${script}`.text().catch(() => "");

  // Fallback to simpler approach if AppleScriptObjC fails
  if (!result.trim()) {
    const simpleScript = `
      tell application "System Events"
        set output to ""
        set i to 1
        repeat with d in desktops
          set output to output & i & "||Display " & i & "||" & (i = 1) & "||0||0||1920||1080\\n"
          set i to i + 1
        end repeat
        return output
      end tell
    `;
    const fallbackResult = await $`osascript -e ${simpleScript}`.text().catch(() => "1||Main Display||true||0||0||1920||1080");
    return parseDisplayResult(fallbackResult);
  }

  return parseDisplayResult(result);
}

function parseDisplayResult(result: string): DisplayInfo[] {
  const displays: DisplayInfo[] = [];

  for (const line of result.trim().split("\n")) {
    if (!line) continue;
    const [id, name, primary, x, y, width, height] = line.split("||");
    if (id) {
      displays.push({
        id: parseInt(id),
        name: name || `Display ${id}`,
        primary: primary === "true",
        bounds: {
          x: parseInt(x) || 0,
          y: parseInt(y) || 0,
          width: parseInt(width) || 0,
          height: parseInt(height) || 0,
        },
      });
    }
  }

  return displays;
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
