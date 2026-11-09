import SwiftUI

// MARK: - Mode 1: Mind-Reader (dynamic Akinator loop)
struct MindReaderView: View {
    @EnvironmentObject var state: AppState
    @StateObject private var engine: MindReaderEngine
    @State private var current: DiagnosticQuestion?

    init() {
        // engine needs history+region; init with placeholder, inject on appear
        _engine = StateObject(wrappedValue: MindReaderEngine(history: HistoryTracker(), region: .IN))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                header
                if engine.isDone {
                    resultsGrid
                } else if let q = current {
                    questionCard(q)
                } else {
                    ProgressView("Reading your mood…").padding()
                }
            }
            .padding(28)
        }
        .background(Theme.bg)
        .onAppear {
            engine.updateRegion(state.region)
            // swap history source to shared one
            current = engine.nextQuestion()
            if current == nil, !engine.isDone {
                engine.reset(); current = engine.nextQuestion()
            }
        }
        .onChange(of: state.region) { _, r in
            engine.updateRegion(r); engine.reset(); current = engine.nextQuestion()
        }
    }

    var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Mind-Reader").font(.largeTitle.bold())
            Text("Situational diagnosis — no genre checklists. Answer one, we recalculate.")
                .foregroundStyle(.secondary)
            if !engine.asked.isEmpty {
                ProgressView(value: Double(engine.asked.count), total: 4)
                    .frame(maxWidth: 320)
                Text("Question \(min(engine.asked.count + 1, 4)) of ~4 · dynamic stop when confident")
                    .font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    func questionCard(_ q: DiagnosticQuestion) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(q.prompt).font(.title2.weight(.semibold))
            ForEach(q.options) { opt in
                Button {
                    engine.answer(q, option: opt)
                    if engine.isDone { current = nil } else { current = engine.nextQuestion() }
                } label: {
                    HStack { Text(opt.label).multilineTextAlignment(.leading); Spacer(); Image(systemName: "chevron.right") }
                        .padding(14)
                        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 12))
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
            Button("Restart") { engine.reset(); current = engine.nextQuestion() }
                .font(.caption).foregroundStyle(.secondary)
        }
        .padding(20)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    var resultsGrid: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Your flawless picks (\(engine.recommendations.count))").font(.headline)
                Spacer()
                Button("Ask again") { engine.reset(); current = engine.nextQuestion() }
            }
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 240), spacing: 16)], spacing: 16) {
                ForEach(engine.recommendations) { rec in
                    TitleCard(rec: rec,
                              onSeen: { state.history.recordSeen(rec.id) },
                              onReject: { state.history.recordRejected(rec.id) })
                }
            }
            Text("Anti-repetition active: seen/rejected titles are excluded next run.")
                .font(.caption).foregroundStyle(.secondary)
        }
    }
}

// MARK: - Mode 2: Platform Explorer (no questions)
struct PlatformExplorerView: View {
    @EnvironmentObject var state: AppState
    var platform: StreamPlatform
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(platform.displayName).font(.largeTitle.bold())
                Text("Best on \(platform.displayName) · IMDb 8.0+ · hidden gems first · verified for \(state.region.rawValue)")
                    .foregroundStyle(.secondary)
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 240), spacing: 16)], spacing: 16) {
                    ForEach(items) { rec in
                        TitleCard(rec: rec,
                                  onSeen: { state.history.recordSeen(rec.id) },
                                  onReject: { state.history.recordRejected(rec.id) })
                    }
                }
            }
            .padding(28)
        }
        .background(Theme.bg)
    }

    var items: [Recommendation] {
        TMDBService.shared.top(for: platform, region: state.region)
            .filter { !state.history.shouldExclude($0.id) }
            .map { t in
                let (badge, blocked, fallback) = JustWatchService.shared.badge(for: t, region: state.region)
                let pct = min(99, max(80, Int(t.imdb * 10) + (t.isHiddenGem ? 4 : 0)))
                return Recommendation(title: t, matchPercent: pct,
                                      whyMatches: "\(t.isHiddenGem ? "Hidden gem" : "Top-rated") · IMDb \(t.imdb, specifier: "%.1f") · Critics \(t.criticScore). \(t.overview)",
                                      streamBadge: badge, isBlockedInRegion: blocked, fallback: fallback)
            }
    }
}

// MARK: - Poster grid card
struct TitleCard: View {
    var rec: Recommendation
    var onSeen: () -> Void
    var onReject: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack(alignment: .topTrailing) {
                if let url = rec.title.posterURL {
                    AsyncImage(url: url) { img in img.resizable().scaledToFill() } placeholder: {
                        Rectangle().fill(Color.white.opacity(0.06)).overlay(ProgressView())
                    }
                    .frame(height: 200).clipped().clipShape(RoundedRectangle(cornerRadius: 12))
                } else {
                    Rectangle().fill(Color.white.opacity(0.06))
                        .frame(height: 200).clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(Image(systemName: "film").font(.largeTitle).foregroundStyle(.secondary))
                }
                MatchBadge(pct: rec.matchPercent).padding(8)
            }
            Text(rec.title.title).font(.headline.lineLimit(1))
            Text("\(rec.title.year) · \(rec.title.kind == .tv ? "Series" : "Film") · IMDb \(rec.title.imdb, specifier: "%.1f")\(rec.title.isHiddenGem ? " · Gem" : "")")
                .font(.caption).foregroundStyle(.secondary)
            Text(rec.whyMatches).font(.caption).foregroundStyle(.secondary).lineLimit(3)
            AvailabilityBadge(text: rec.streamBadge, blocked: rec.isBlockedInRegion)
            if let fb = rec.fallback {
                Text(fb).font(.caption2).foregroundStyle(.orange)
            }
            HStack {
                Button("Seen") { onSeen() }.font(.caption)
                Button("Not for me") { onReject() }.font(.caption).foregroundStyle(.secondary)
                Spacer()
            }
        }
        .padding(12)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14))
    }
}
