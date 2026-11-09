import Foundation

/// Anti-Repetition Rule: local state/history tracker.
/// Persists seen / rejected / liked IDs so the engine never repeats filler.
final class HistoryTracker: ObservableObject {
    @Published private(set) var seen: Set<String> = []
    @Published private(set) var rejected: Set<String> = []
    @Published private(set) var liked: Set<String> = []

    private let file: URL

    init() {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let app = dir.appendingPathComponent("Musepark", isDirectory: true)
        try? FileManager.default.createDirectory(at: app, withIntermediateDirectories: true)
        self.file = app.appendingPathComponent("history.json")
        load()
    }

    struct Dump: Codable { var seen: [String]; var rejected: [String]; var liked: [String] }

    func shouldExclude(_ id: String) -> Bool {
        seen.contains(id) || rejected.contains(id)
    }

    func recordSeen(_ id: String) { seen.insert(id); save() }
    func recordRejected(_ id: String) { rejected.insert(id); save() }
    func recordLiked(_ id: String) { liked.insert(id); save() }
    func reset() { seen = []; rejected = []; liked = []; save() }

    private func save() {
        let d = Dump(seen: Array(seen), rejected: Array(rejected), liked: Array(liked))
        if let data = try? JSONEncoder().encode(d) { try? data.write(to: file) }
        // Mirror to UserDefaults for fast launch
        UserDefaults.standard.set(Array(seen), forKey: "musepark.seen")
    }

    private func load() {
        if let data = try? Data(contentsOf: file),
           let d = try? JSONDecoder().decode(Dump.self, from: data) {
            seen = Set(d.seen); rejected = Set(d.rejected); liked = Set(d.liked)
        } else {
            seen = Set(UserDefaults.standard.stringArray(forKey: "musepark.seen") ?? [])
        }
    }
}

/// Global app state: route + region
final class AppState: ObservableObject {
    enum Route: Hashable { case mindReader; case platform(StreamPlatform) }
    @Published var route: Route = .mindReader
    @Published var region: Region = .IN
    @Published var history = HistoryTracker()
}
