// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Musepark",
    platforms: [.macOS(.v14)],
    products: [
        .executable(name: "Musepark", targets: ["Musepark"])
    ],
    targets: [
        .executableTarget(
            name: "Musepark",
            path: "Sources/Musepark"
        )
    ]
)
