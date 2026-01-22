import { $ } from "bun";
import { tmpdir } from "os";
import { join } from "path";
import type { Platform, WindowInfo, DisplayInfo } from "../types.ts";

// Detect display server
async function getDisplayServer(): Promise<"x11" | "wayland" | "unknown"> {
  const xdgSession = process.env.XDG_SESSION_TYPE;
  if (xdgSession === "wayland") return "wayland";
  if (xdgSession === "x11") return "x11";

  // Check for WAYLAND_DISPLAY
  if (process.env.WAYLAND_DISPLAY) return "wayland";

  // Check for DISPLAY (X11)
  if (process.env.DISPLAY) return "x11";

  return "unknown";
}

// Check if a command exists
async function commandExists(cmd: string): Promise<boolean> {
  try {
    await $`which ${cmd}`.quiet();
    return true;
  } catch {
    return false;
  }
}

// X11: List windows using xdotool or wmctrl
async function listWindowsX11(): Promise<WindowInfo[]> {
  // Try xdotool first
  if (await commandExists("xdotool")) {
    try {
      const windowIds = await $`xdotool search --onlyvisible --name ""`.text();
      const windows: WindowInfo[] = [];

      for (const id of windowIds.trim().split("\n").filter(Boolean)) {
        try {
          const name = await $`xdotool getwindowname ${id}`.text();
          const geometry = await $`xdotool getwindowgeometry ${id}`.text();
          const pidResult = await $`xdotool getwindowpid ${id}`.nothrow().text();
          const pid = pidResult || "0";

          // Parse geometry: "Window 12345\n  Position: 100,200 (screen: 0)\n  Geometry: 800x600"
          const posMatch = geometry.match(/Position:\s*(\d+),(\d+)/);
          const sizeMatch = geometry.match(/Geometry:\s*(\d+)x(\d+)/);

          let appName = "";
          if (pid.trim() && pid.trim() !== "0") {
            try {
              const appResult = await $`ps -p ${pid.trim()} -o comm=`.nothrow().text();
              appName = appResult.trim();
            } catch {}
          }

          windows.push({
            id: id.trim(),
            title: name.trim(),
            app: appName,
            bounds: {
              x: posMatch ? parseInt(posMatch[1] ?? "0") : 0,
              y: posMatch ? parseInt(posMatch[2] ?? "0") : 0,
              width: sizeMatch ? parseInt(sizeMatch[1] ?? "0") : 0,
              height: sizeMatch ? parseInt(sizeMatch[2] ?? "0") : 0,
            },
          });
        } catch {
          // Skip windows that can't be queried
        }
      }

      return windows;
    } catch {
      // Fall through to wmctrl
    }
  }

  // Try wmctrl as fallback
  if (await commandExists("wmctrl")) {
    try {
      const result = await $`wmctrl -l -G`.text();
      const windows: WindowInfo[] = [];

      for (const line of result.trim().split("\n").filter(Boolean)) {
        // Format: 0x04000003  0 0    0    1920 1080 hostname Window Title
        const parts = line.split(/\s+/);
        if (parts.length >= 8) {
          const id = parts[0] ?? "";
          const x = parts[2] ?? "0";
          const y = parts[3] ?? "0";
          const width = parts[4] ?? "0";
          const height = parts[5] ?? "0";
          const titleParts = parts.slice(7);
          windows.push({
            id,
            title: titleParts.join(" "),
            app: "",
            bounds: {
              x: parseInt(x),
              y: parseInt(y),
              width: parseInt(width),
              height: parseInt(height),
            },
          });
        }
      }

      return windows;
    } catch {
      // Fall through
    }
  }

  console.error("No window listing tool available. Install xdotool or wmctrl.");
  return [];
}

// X11: List displays using xrandr
async function listDisplaysX11(): Promise<DisplayInfo[]> {
  if (await commandExists("xrandr")) {
    try {
      const result = await $`xrandr --query`.text();
      const displays: DisplayInfo[] = [];
      let id = 1;

      // Parse xrandr output for connected displays
      // Example: "DP-1 connected primary 2560x1440+0+0 (normal left inverted right x axis y axis) 597mm x 336mm"
      const regex = /^(\S+)\s+connected\s*(primary)?\s*(\d+)x(\d+)\+(\d+)\+(\d+)/gm;
      let match;

      while ((match = regex.exec(result)) !== null) {
        displays.push({
          id: id++,
          name: match[1] ?? `Display ${id}`,
          primary: match[2] === "primary",
          bounds: {
            x: parseInt(match[5] ?? "0"),
            y: parseInt(match[6] ?? "0"),
            width: parseInt(match[3] ?? "0"),
            height: parseInt(match[4] ?? "0"),
          },
        });
      }

      if (displays.length > 0) return displays;
    } catch {
      // Fall through
    }
  }

  return getDefaultDisplay();
}

// Wayland: List windows (limited support)
async function listWindowsWayland(): Promise<WindowInfo[]> {
  // Wayland doesn't allow listing windows from other apps for security
  // We can only work with GNOME/KDE specific tools

  // Try GNOME's gdbus
  if (await commandExists("gdbus")) {
    try {
      const script = `global.get_window_actors().map(w => ({ id: w.meta_window.get_id(), title: w.meta_window.get_title(), app: w.meta_window.get_wm_class() || '', x: w.meta_window.get_frame_rect().x, y: w.meta_window.get_frame_rect().y, width: w.meta_window.get_frame_rect().width, height: w.meta_window.get_frame_rect().height }))`;
      const result = await $`gdbus call --session --dest org.gnome.Shell --object-path /org/gnome/Shell --method org.gnome.Shell.Eval ${script}`.text();

      // Parse the gdbus output: (true, '[...]')
      const jsonMatch = result.match(/\(true,\s*'(.+)'\)/s);
      if (jsonMatch && jsonMatch[1]) {
        const windows = JSON.parse(jsonMatch[1].replace(/\\'/g, "'"));
        return windows.map((w: any) => ({
          id: String(w.id),
          title: w.title || "",
          app: w.app || "",
          bounds: {
            x: w.x,
            y: w.y,
            width: w.width,
            height: w.height,
          },
        }));
      }
    } catch {
      // Fall through
    }
  }

  console.error("Window listing on Wayland is limited. Only GNOME Shell is partially supported.");
  return [];
}

// Wayland: List displays
async function listDisplaysWayland(): Promise<DisplayInfo[]> {
  // Try wlr-randr for wlroots-based compositors
  if (await commandExists("wlr-randr")) {
    try {
      const result = await $`wlr-randr`.text();
      const displays: DisplayInfo[] = [];
      let id = 1;
      let currentName = "";

      for (const line of result.split("\n")) {
        const nameMatch = line.match(/^(\S+)/);
        if (nameMatch && !line.startsWith(" ") && nameMatch[1]) {
          currentName = nameMatch[1];
        }

        const modeMatch = line.match(/(\d+)x(\d+)\s+px,.*current/);
        if (modeMatch && currentName) {
          const posMatch = line.match(/at\s+(\d+),(\d+)/);
          displays.push({
            id: id++,
            name: currentName,
            primary: id === 2, // First display is primary
            bounds: {
              x: posMatch ? parseInt(posMatch[1] ?? "0") : 0,
              y: posMatch ? parseInt(posMatch[2] ?? "0") : 0,
              width: parseInt(modeMatch[1] ?? "0"),
              height: parseInt(modeMatch[2] ?? "0"),
            },
          });
          currentName = "";
        }
      }

      if (displays.length > 0) return displays;
    } catch {
      // Fall through
    }
  }

  // Fall back to xrandr (might work on XWayland)
  return listDisplaysX11();
}

function getDefaultDisplay(): DisplayInfo[] {
  return [
    {
      id: 1,
      name: "Primary Display",
      primary: true,
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    },
  ];
}

// Screenshot using available tools
async function takeScreenshot(
  outputPath: string,
  options?: { windowId?: string; region?: { x: number; y: number; width: number; height: number }; displayId?: number }
): Promise<void> {
  const displayServer = await getDisplayServer();

  // Window capture
  if (options?.windowId) {
    if (displayServer === "x11") {
      // Try import (ImageMagick)
      if (await commandExists("import")) {
        await $`import -window ${options.windowId} ${outputPath}`;
        return;
      }
      // Try xwd + convert
      if (await commandExists("xwd") && await commandExists("convert")) {
        const xwdFile = outputPath + ".xwd";
        await $`xwd -id ${options.windowId} -out ${xwdFile}`;
        await $`convert ${xwdFile} ${outputPath}`;
        await $`rm ${xwdFile}`;
        return;
      }
    }

    // Fallback: use gnome-screenshot
    if (await commandExists("gnome-screenshot")) {
      // gnome-screenshot can't capture by window ID, capture full screen
      await $`gnome-screenshot -f ${outputPath}`;
      return;
    }

    throw new Error("No window screenshot tool available. Install imagemagick (import) or xwd.");
  }

  // Region capture
  if (options?.region) {
    const { x, y, width, height } = options.region;
    const geometry = `${width}x${height}+${x}+${y}`;

    if (await commandExists("import")) {
      await $`import -window root -crop ${geometry} ${outputPath}`;
      return;
    }

    if (await commandExists("scrot")) {
      const scrotArea = `${x},${y},${width},${height}`;
      await $`scrot -a ${scrotArea} ${outputPath}`;
      return;
    }

    if (await commandExists("gnome-screenshot")) {
      // gnome-screenshot doesn't support exact coordinates well
      // Capture full screen as fallback
      await $`gnome-screenshot -f ${outputPath}`;
      return;
    }

    throw new Error("No region screenshot tool available. Install imagemagick, gnome-screenshot, or scrot.");
  }

  // Full screen capture
  if (await commandExists("gnome-screenshot")) {
    await $`gnome-screenshot -f ${outputPath}`;
    return;
  }

  if (await commandExists("scrot")) {
    await $`scrot ${outputPath}`;
    return;
  }

  if (await commandExists("import")) {
    await $`import -window root ${outputPath}`;
    return;
  }

  // Try grim for Wayland
  if (displayServer === "wayland" && await commandExists("grim")) {
    await $`grim ${outputPath}`;
    return;
  }

  throw new Error("No screenshot tool available. Install gnome-screenshot, scrot, imagemagick, or grim (Wayland).");
}

async function listWindows(): Promise<WindowInfo[]> {
  const displayServer = await getDisplayServer();

  if (displayServer === "wayland") {
    return listWindowsWayland();
  }

  return listWindowsX11();
}

async function listDisplays(): Promise<DisplayInfo[]> {
  const displayServer = await getDisplayServer();

  if (displayServer === "wayland") {
    return listDisplaysWayland();
  }

  return listDisplaysX11();
}

async function screenshotWindow(windowId: string): Promise<Buffer> {
  const tmpFile = join(tmpdir(), `screenshot-${Date.now()}.png`);
  await takeScreenshot(tmpFile, { windowId });
  const buffer = await Bun.file(tmpFile).arrayBuffer();
  await $`rm ${tmpFile}`;
  return Buffer.from(buffer);
}

async function screenshotScreen(displayId?: number): Promise<Buffer> {
  const tmpFile = join(tmpdir(), `screenshot-${Date.now()}.png`);

  // For multi-monitor, we'd need to crop the result
  // For now, capture the full screen
  await takeScreenshot(tmpFile, { displayId });

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
  await takeScreenshot(tmpFile, { region: { x, y, width, height } });
  const buffer = await Bun.file(tmpFile).arrayBuffer();
  await $`rm ${tmpFile}`;
  return Buffer.from(buffer);
}

export const linux: Platform = {
  listWindows,
  listDisplays,
  screenshotWindow,
  screenshotScreen,
  screenshotRegion,
};
