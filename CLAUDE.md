# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

screenshot-mcp is both an MCP (Model Context Protocol) server for capturing screenshots and a Claude Code plugin. It enables agents to automate UI testing of native applications by listing windows/displays and capturing screenshots.

## Commands

```bash
# Install dependencies
bun install

# Run MCP server
bun run start

# Type check
bunx tsc --noEmit

# Test as Claude Code plugin
claude --plugin-dir /path/to/screenshot-mcp
```

## Architecture

### MCP Server (src/)

```
src/
├── index.ts              # MCP server entry, registers 5 tools
├── types.ts              # TypeScript interfaces (Platform, WindowInfo, DisplayInfo, etc.)
├── tools/                # Tool handlers (one file per tool)
│   ├── list-windows.ts
│   ├── list-displays.ts
│   ├── screenshot-window.ts
│   ├── screenshot-screen.ts
│   └── screenshot-region.ts
├── platform/
│   ├── index.ts          # Platform detection, returns Platform interface
│   └── darwin.ts         # macOS implementation using JXA (osascript)
└── utils/
    └── storage.ts        # Screenshot file saving with date-based organization
```

### Claude Code Plugin

```
.claude-plugin/plugin.json    # Plugin manifest
.mcp.json                     # MCP server configuration
skills/screenshot-testing/    # Screenshot testing guidance skill
```

### Platform Implementation Pattern

Each platform implements the `Platform` interface from `src/types.ts`:
- `listWindows()` - List visible windows with IDs
- `listDisplays()` - List available displays
- `screenshotWindow(windowId)` - Capture by window ID
- `screenshotScreen(displayId?)` - Capture display
- `screenshotRegion(x, y, width, height)` - Capture region

macOS uses JXA (JavaScript for Automation) via `osascript -l JavaScript` to access CoreGraphics/AppKit APIs. Screenshots use the native `screencapture` command.

To add Windows/Linux support, create `src/platform/win32.ts` or `src/platform/linux.ts` implementing the same interface.

## Bun-Specific Notes

- Use `bun` instead of `node`, `bun install` instead of `npm install`
- Use `Bun.$` for shell commands (see darwin.ts)
- Use `Bun.file()` for file operations
- Bun automatically loads `.env` files

## macOS Requirements

- Screen Recording permission required (System Settings > Privacy & Security > Screen Recording)
- Window IDs from `list_windows` are CGWindowIDs compatible with `screencapture -l`
