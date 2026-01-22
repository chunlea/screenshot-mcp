export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowInfo {
  id: string;
  title: string;
  app: string;
  bounds: Bounds;
}

export interface DisplayInfo {
  id: number;
  name: string;
  primary: boolean;
  bounds: Bounds;
}

export interface ScreenshotResult {
  image: string; // base64 data URL
  saved_path?: string;
}

export interface Platform {
  listWindows(): Promise<WindowInfo[]>;
  listDisplays(): Promise<DisplayInfo[]>;
  screenshotWindow(windowId: string): Promise<Buffer>;
  screenshotScreen(displayId?: number): Promise<Buffer>;
  screenshotRegion(x: number, y: number, width: number, height: number): Promise<Buffer>;
}
