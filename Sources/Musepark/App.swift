import SwiftUI

@main
struct MuseparkApp: App {
    @StateObject private var appState = AppState()
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .preferredColorScheme(.dark)
                .frame(minWidth: 980, minHeight: 640)
        }
        .windowStyle(.titleBar)
        .commands {
            CommandGroup(after: .appInfo) {
                Button("Reset history (anti-repetition)") { appState.history.reset() }
                    .keyboardShortcut("r", modifiers: [.command, .shift])
            }
        }
    }
}

// MARK: - Root split layout: sidebar + canvas
struct ContentView: View {
    @EnvironmentObject var state: AppState
    var body: some View {
        NavigationSplitView {
            SidebarView()
        } detail: {
            ZStack {
                Theme.bg.ignoresSafeArea()
                switch state.route {
                case .mindReader:
                    MindReaderView()
                case .platform(let p):
                    PlatformExplorerView(platform: p)
                }
            }
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Picker("Region", selection: $state.region) {
                    ForEach(Region.allCases) { r in Text(r.rawValue).tag(r) }
                }
                .pickerStyle(.segmented)
                .frame(width: 120)
                .help("Strict streaming region: IN / BD")
            }
        }
    }
}

struct SidebarView: View {
    @EnvironmentObject var state: AppState
    var body: some View {
        List(selection: Binding(
            get: { state.route },
            set: { state.route = $0 ?? .mindReader }
        )) {
            Section("Mind-Reader") {
                NavigationLink(value: AppState.Route.mindReader) {
                    Label("Mind-Reader", systemImage: "brain.head.profile")
                }
            }
            Section("Platform Explorer") {
                ForEach(StreamPlatform.allCases) { p in
                    NavigationLink(value: AppState.Route.platform(p)) {
                        Label(p.displayName, systemImage: icon(for: p))
                    }
                }
            }
        }
        .listStyle(.sidebar)
        .navigationTitle("Musepark 1.3")
        .safeAreaInset(edge: .bottom) {
            Text(state.history.seen.count + state.history.rejected.count == 0
                 ? "No history yet"
                 : "Tracking \(state.history.seen.count + state.history.rejected.count) seen/rejected")
                .font(.caption).foregroundStyle(.secondary).padding()
        }
    }
    func icon(for p: StreamPlatform) -> String {
        switch p { case .netflix: return "n.circle"; case .prime: return "play.circle"; case .appleTV: return "appletv" }
    }
}
