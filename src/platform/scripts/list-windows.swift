#!/usr/bin/env swift
import Cocoa

struct WindowInfo: Codable {
    let id: String
    let title: String
    let app: String
    let bounds: Bounds
}

struct Bounds: Codable {
    let x: Int
    let y: Int
    let width: Int
    let height: Int
}

let options: CGWindowListOption = [.optionOnScreenOnly, .excludeDesktopElements]
guard let windowList = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
    print("[]")
    exit(0)
}

var windows: [WindowInfo] = []

for window in windowList {
    guard let layer = window[kCGWindowLayer as String] as? Int,
          layer == 0,
          let ownerName = window[kCGWindowOwnerName as String] as? String,
          let windowNumber = window[kCGWindowNumber as String] as? Int,
          let bounds = window[kCGWindowBounds as String] as? [String: Any] else {
        continue
    }

    let windowName = window[kCGWindowName as String] as? String ?? ""

    let x = Int(bounds["X"] as? CGFloat ?? 0)
    let y = Int(bounds["Y"] as? CGFloat ?? 0)
    let width = Int(bounds["Width"] as? CGFloat ?? 0)
    let height = Int(bounds["Height"] as? CGFloat ?? 0)

    windows.append(WindowInfo(
        id: String(windowNumber),
        title: windowName,
        app: ownerName,
        bounds: Bounds(x: x, y: y, width: width, height: height)
    ))
}

let encoder = JSONEncoder()
if let jsonData = try? encoder.encode(windows),
   let jsonString = String(data: jsonData, encoding: .utf8) {
    print(jsonString)
} else {
    print("[]")
}
