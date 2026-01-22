#!/usr/bin/env swift
import Cocoa

struct DisplayInfo: Codable {
    let id: Int
    let name: String
    let primary: Bool
    let bounds: Bounds
}

struct Bounds: Codable {
    let x: Int
    let y: Int
    let width: Int
    let height: Int
}

var displays: [DisplayInfo] = []

for (index, screen) in NSScreen.screens.enumerated() {
    let frame = screen.frame
    let name = screen.localizedName

    displays.append(DisplayInfo(
        id: index + 1,
        name: name,
        primary: index == 0,
        bounds: Bounds(
            x: Int(frame.origin.x),
            y: Int(frame.origin.y),
            width: Int(frame.size.width),
            height: Int(frame.size.height)
        )
    ))
}

let encoder = JSONEncoder()
if let jsonData = try? encoder.encode(displays),
   let jsonString = String(data: jsonData, encoding: .utf8) {
    print(jsonString)
} else {
    print("[]")
}
