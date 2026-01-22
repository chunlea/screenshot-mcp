# screenshot-mcp

A cross-platform MCP (Model Context Protocol) server for capturing screenshots. Designed for agent-based native application testing.

## Features

- **List Windows**: Get all visible windows with IDs, titles, and bounds
- **List Displays**: Get all available monitors/displays
- **Screenshot Window**: Capture a specific window by ID or title
- **Screenshot Screen**: Capture an entire display
- **Screenshot Region**: Capture a specific screen region

## Installation

```bash
bun install
```

## Usage

### As MCP Server

```bash
bun run start
```

### Configure in Claude Code

Add to your MCP settings:

```json
{
  "mcpServers": {
    "screenshot": {
      "command": "bun",
      "args": ["run", "/path/to/screenshot-mcp/src/index.ts"]
    }
  }
}
```

## MCP Tools

### `list_windows`

List all visible windows.

```json
// Response
[
  { "id": "1234", "title": "VS Code", "app": "Code", "bounds": { "x": 0, "y": 25, "width": 1920, "height": 1055 } }
]
```

### `list_displays`

List all available displays.

```json
// Response
[
  { "id": 1, "name": "Built-in Retina Display", "primary": true, "bounds": { "x": 0, "y": 0, "width": 2560, "height": 1600 } }
]
```

### `screenshot_window`

Capture a specific window.

```json
// Parameters
{ "window_id": "1234" }
// or
{ "window_title": "VS Code" }
// optional: save to file
{ "window_id": "1234", "save_dir": "/path/to/screenshots" }
```

### `screenshot_screen`

Capture the entire screen.

```json
// Parameters (all optional)
{ "display_id": 1, "save_dir": "/path/to/screenshots" }
```

### `screenshot_region`

Capture a specific region.

```json
// Parameters
{ "x": 100, "y": 100, "width": 800, "height": 600 }
// optional: save to file
{ "x": 100, "y": 100, "width": 800, "height": 600, "save_dir": "/path/to/screenshots" }
```

## Platform Support

| Platform | Status |
|----------|--------|
| macOS | Supported |
| Windows | Planned |
| Linux | Planned |

## Requirements

- **macOS**: Requires Screen Recording permission (System Settings > Privacy & Security > Screen Recording)
- **Bun**: v1.0.0 or later

## License

MIT
