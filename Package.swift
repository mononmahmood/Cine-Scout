// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CineScout",
    platforms: [.macOS(.v14)],
    products: [
        .executable(name: "CineScout", targets: ["CineScout"])
    ],
    targets: [
        .executableTarget(
            name: "CineScout",
            path: "Sources/CineScout"
        )
    ]
)
