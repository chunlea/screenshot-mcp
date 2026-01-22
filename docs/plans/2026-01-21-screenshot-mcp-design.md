# screenshot-mcp Design Document

## Overview

A cross-platform MCP server for capturing window/screen screenshots, enabling agents to automate native application testing.

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **Protocol**: MCP (Model Context Protocol)
- **Cross-platform**: Native commands per platform

## MCP Tools API

### 1. `list_windows`

List all visible windows for agent discovery.

**Parameters**: None

**Returns**:
```json
[
  { "id": "1234", "title": "VS Code", "app": "Code", "bounds": { "x": 0, "y": 25, "width": 1920, "height": 1055 } }
]
```

### 2. `list_displays`

List all available displays/monitors.

**Parameters**: None

**Returns**:
```json
[
  { "id": 1, "name": "Built-in Retina Display", "primary": true, "bounds": { "x": 0, "y": 0, "width": 2560, "height": 1600 } },
  { "id": 2, "name": "DELL U2720Q", "primary": false, "bounds": { "x": 2560, "y": 0, "width": 3840, "height": 2160 } }
]
```

### 3. `screenshot_window`

Capture a specific window.

**Parameters**:
- `window_id` (string, optional): Window ID
- `window_title` (string, optional): Window title (fuzzy match)
- `save_dir` (string, optional): Directory to save screenshot

**Returns**:
```json
{
  "image": "data:image/png;base64,iVBORw0KGgo...",
  "saved_path": "/screenshots/2024-01-21/20240121_143052.png"
}
```

### 4. `screenshot_screen`

Capture the entire screen.

**Parameters**:
- `display_id` (number, optional): Display ID, defaults to main display
- `save_dir` (string, optional): Directory to save screenshot

### 5. `screenshot_region`

Capture a specific region.

**Parameters**:
- `x`, `y`, `width`, `height` (number): Region coordinates
- `save_dir` (string, optional): Directory to save screenshot

## Platform Implementation

| Platform | List Windows | List Displays | Screenshot |
|----------|--------------|---------------|------------|
| macOS | `osascript` | `system_profiler` or CoreGraphics | `screencapture` |
| Windows | PowerShell + Win32 | PowerShell + Win32 | PowerShell + .NET |
| Linux | `wmctrl` | `xrandr` | `import` (ImageMagick) |

## Project Structure

```
screenshot-mcp/
├── src/
│   ├── index.ts
│   ├── tools/
│   ├── platform/
│   └── utils/
├── package.json
└── README.md
```

## File Storage

When `save_dir` is specified, files are grouped by date:

```
{save_dir}/
└── 2024-01-21/
    ├── 20240121_143052.png
    └── 20240121_143108.png
```

## MVP Scope

**In scope**: List windows, list displays, screenshot window/screen/region, base64 + optional file save

**Out of scope**: Mouse/keyboard operations, video recording, image compression
