import { $ } from "bun";
import { tmpdir } from "os";
import { join } from "path";
import type { Platform, WindowInfo, DisplayInfo } from "../types.ts";

// PowerShell script to list windows using Win32 API
const LIST_WINDOWS_SCRIPT = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;

public class WindowHelper {
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern int GetWindowTextLength(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern IntPtr GetShellWindow();

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    public static List<object> GetWindows() {
        var windows = new List<object>();
        IntPtr shellWindow = GetShellWindow();

        EnumWindows((hWnd, lParam) => {
            if (hWnd == shellWindow) return true;
            if (!IsWindowVisible(hWnd)) return true;

            int length = GetWindowTextLength(hWnd);
            if (length == 0) return true;

            StringBuilder sb = new StringBuilder(length + 1);
            GetWindowText(hWnd, sb, sb.Capacity);
            string title = sb.ToString();

            RECT rect;
            GetWindowRect(hWnd, out rect);

            // Skip windows with zero size
            if (rect.Right - rect.Left <= 0 || rect.Bottom - rect.Top <= 0) return true;

            uint processId;
            GetWindowThreadProcessId(hWnd, out processId);

            string appName = "";
            try {
                var process = System.Diagnostics.Process.GetProcessById((int)processId);
                appName = process.ProcessName;
            } catch {}

            windows.Add(new {
                id = hWnd.ToString(),
                title = title,
                app = appName,
                x = rect.Left,
                y = rect.Top,
                width = rect.Right - rect.Left,
                height = rect.Bottom - rect.Top
            });

            return true;
        }, IntPtr.Zero);

        return windows;
    }
}
"@

$windows = [WindowHelper]::GetWindows()
$result = $windows | ForEach-Object {
    @{
        id = $_.id
        title = $_.title
        app = $_.app
        bounds = @{
            x = $_.x
            y = $_.y
            width = $_.width
            height = $_.height
        }
    }
}
$result | ConvertTo-Json -Compress
`;

// PowerShell script to list displays
const LIST_DISPLAYS_SCRIPT = `
Add-Type -AssemblyName System.Windows.Forms
$screens = [System.Windows.Forms.Screen]::AllScreens
$result = @()
$i = 1
foreach ($screen in $screens) {
    $result += @{
        id = $i
        name = $screen.DeviceName
        primary = $screen.Primary
        bounds = @{
            x = $screen.Bounds.X
            y = $screen.Bounds.Y
            width = $screen.Bounds.Width
            height = $screen.Bounds.Height
        }
    }
    $i++
}
$result | ConvertTo-Json -Compress
`;

// PowerShell script to capture a window by handle
function getWindowCaptureScript(windowId: string, outputPath: string): string {
  return `
Add-Type @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class ScreenCapture {
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, int nFlags);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left, Top, Right, Bottom;
    }

    public static void CaptureWindow(IntPtr hWnd, string path) {
        RECT rect;
        GetWindowRect(hWnd, out rect);
        int width = rect.Right - rect.Left;
        int height = rect.Bottom - rect.Top;

        using (Bitmap bmp = new Bitmap(width, height, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                IntPtr hdcBitmap = g.GetHdc();
                PrintWindow(hWnd, hdcBitmap, 2); // PW_RENDERFULLCONTENT = 2
                g.ReleaseHdc(hdcBitmap);
            }
            bmp.Save(path, ImageFormat.Png);
        }
    }
}
"@

[ScreenCapture]::CaptureWindow([IntPtr]${windowId}, "${outputPath.replace(/\\/g, "\\\\")}")
`;
}

// PowerShell script to capture screen region
function getScreenCaptureScript(x: number, y: number, width: number, height: number, outputPath: string): string {
  return `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$bounds = [Drawing.Rectangle]::new(${x}, ${y}, ${width}, ${height})
$bmp = New-Object Drawing.Bitmap($bounds.Width, $bounds.Height)
$graphics = [Drawing.Graphics]::FromImage($bmp)
$graphics.CopyFromScreen($bounds.Location, [Drawing.Point]::Empty, $bounds.Size)
$bmp.Save("${outputPath.replace(/\\/g, "\\\\")}", [Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bmp.Dispose()
`;
}

async function runPowerShell(script: string): Promise<string> {
  const result = await $`powershell -NoProfile -ExecutionPolicy Bypass -Command ${script}`.text();
  return result.trim();
}

async function listWindows(): Promise<WindowInfo[]> {
  try {
    const result = await runPowerShell(LIST_WINDOWS_SCRIPT);
    if (!result || result === "null") return [];
    const parsed = JSON.parse(result);
    // Handle single window case (PowerShell returns object instead of array)
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

async function listDisplays(): Promise<DisplayInfo[]> {
  try {
    const result = await runPowerShell(LIST_DISPLAYS_SCRIPT);
    if (!result || result === "null") return getDefaultDisplay();
    const parsed = JSON.parse(result);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return getDefaultDisplay();
  }
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

async function screenshotWindow(windowId: string): Promise<Buffer> {
  const tmpFile = join(tmpdir(), `screenshot-${Date.now()}.png`);
  await runPowerShell(getWindowCaptureScript(windowId, tmpFile));
  const buffer = await Bun.file(tmpFile).arrayBuffer();
  await $`del "${tmpFile}"`.quiet();
  return Buffer.from(buffer);
}

async function screenshotScreen(displayId?: number): Promise<Buffer> {
  const displays = await listDisplays();
  let bounds = { x: 0, y: 0, width: 1920, height: 1080 };

  if (displayId !== undefined) {
    const display = displays.find(d => d.id === displayId);
    if (display) {
      bounds = display.bounds;
    }
  } else {
    // Capture primary or first display
    const primary = displays.find(d => d.primary) || displays[0];
    if (primary) {
      bounds = primary.bounds;
    }
  }

  const tmpFile = join(tmpdir(), `screenshot-${Date.now()}.png`);
  await runPowerShell(getScreenCaptureScript(bounds.x, bounds.y, bounds.width, bounds.height, tmpFile));
  const buffer = await Bun.file(tmpFile).arrayBuffer();
  await $`del "${tmpFile}"`.quiet();
  return Buffer.from(buffer);
}

async function screenshotRegion(
  x: number,
  y: number,
  width: number,
  height: number
): Promise<Buffer> {
  const tmpFile = join(tmpdir(), `screenshot-${Date.now()}.png`);
  await runPowerShell(getScreenCaptureScript(x, y, width, height, tmpFile));
  const buffer = await Bun.file(tmpFile).arrayBuffer();
  await $`del "${tmpFile}"`.quiet();
  return Buffer.from(buffer);
}

export const win32: Platform = {
  listWindows,
  listDisplays,
  screenshotWindow,
  screenshotScreen,
  screenshotRegion,
};
