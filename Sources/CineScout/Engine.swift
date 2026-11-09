import Foundation

/// Dynamic Akinator Loop: ask ONE question, recalculate, decide ask-again vs. show.
/// NOT 3 static questions. Confidence = top1 - top2 margin + coverage.
final class MindReaderEngine: ObservableObject {
    @Published private(set) var asked: [DiagnosticQuestion] = []
    @Published private(set) var answers: [String: String] = [:] // questionID -> optionID
    @Published private(set) var recommendations: [Recommendation] = []
    @Published private(set) var isDone = false

    private let history: HistoryTracker
    private var region: Region
    private var scores: [String: Double] = [:]

    init(history: HistoryTracker, region: Region) {
        self.history = history; self.region = region
    }

    func updateRegion(_ r: Region) { self.region = r }

    // MARK: Question bank (situational / proxy — never "Action or Comedy?")
    static let bank: [DiagnosticQuestion] = [
        DiagnosticQuestion(id: "pacing", prompt: "A character walks into a late-night diner. What happens next?",
            options: [
                QuestionOption(id: "silence", label: "A) They sit in silence, processing a flaw", moodTags: ["silence-flaw", "slow-burn", "moral-ambiguity"]),
                QuestionOption(id: "assassin", label: "B) An assassin walks in — chaos erupts", moodTags: ["adrenaline"]),
                QuestionOption(id: "surreal", label: "C) Something surreal happens outside the window", moodTags: ["surreal", "psych-fracture", "lore"]),
            ]),
        DiagnosticQuestion(id: "complexity", prompt: "How should the story challenge you tonight?",
            options: [
                QuestionOption(id: "moral", label: "A) Moral ambiguity — no clear good guys", moodTags: ["moral-ambiguity", "slow-burn"]),
                QuestionOption(id: "psyche", label: "B) Psychological fracturing — identity bends", moodTags: ["psych-fracture", "claustrophobic", "surreal"]),
                QuestionOption(id: "lore", label: "C) Deep lore / world-building to sink into", moodTags: ["lore", "expansive", "slow-burn"]),
            ]),
        DiagnosticQuestion(id: "space", prompt: "Pick the visual/spatial vibe you crave:",
            options: [
                QuestionOption(id: "claustro", label: "A) Claustrophobic — tight rooms, tension", moodTags: ["claustrophobic", "slow-burn"]),
                QuestionOption(id: "expanse", label: "B) Expansive — wide shots, journey", moodTags: ["expansive", "lore"]),
                QuestionOption(id: "neon", label: "C) Neon-surreal — dreamlike texture", moodTags: ["surreal", "psych-fracture"]),
            ]),
        DiagnosticQuestion(id: "tempo", prompt: "Final call — pacing for tonight?",
            options: [
                QuestionOption(id: "slow", label: "A) Slow-burn, let it breathe", moodTags: ["slow-burn", "silence-flaw"]),
                QuestionOption(id: "propulsive", label: "B) Propulsive, no wasted minute", moodTags: ["adrenaline"]),
                QuestionOption(id: "weird", label: "C) Strange & lingering images", moodTags: ["surreal", "lore", "psych-fracture"]),
            ]),
    ]

    /// Next question = highest info-gain among unasked (mock: first unasked).
    /// Returns nil when confident enough to show results.
    func nextQuestion() -> DiagnosticQuestion? {
        if isDone { return nil }
        recalc()
        let margin = confidenceMargin()
        // Stop: high confidence early (dynamic), or 4 asked, or min 2 asked + margin ok
        if asked.count >= 4 { finish(); return nil }
        if asked.count >= 2 && margin > 0.30 { finish(); return nil }
        if asked.count >= 3 && margin > 0.15 { finish(); return nil }
        return Self.bank.first { q in !asked.map(\.id).contains(q.id) }
    }

    func answer(_ question: DiagnosticQuestion, option: QuestionOption) {
        asked.append(question)
        answers[question.id] = option.id
        recalc()
        // record nothing to history yet — only when user acts on a Recommendation
        if nextQuestion() == nil && !isDone { finish() }
    }

    func reset() { asked = []; answers = [:]; recommendations = []; isDone = false; scores = [:] }

    // MARK: - internals
    private func chosenTags() -> Set<String> {
        var tags = Set<String>()
        for q in asked {
            if let oid = answers[q.id], let opt = q.options.first(where: { $0.id == oid }) {
                tags.formUnion(opt.moodTags)
            }
        }
        return tags
    }

    private func recalc() {
        let tags = chosenTags()
        let all = TMDBService.shared.catalogue()
        for t in all {
            if tags.isEmpty { scores[t.id] = 0.5; continue }
            let hit = Double(t.moodTags.intersection(tags).count)
            let denom = Double(max(t.moodTags.count, 1))
            // quality prior: imdb + critic nudges score so filler can't win
            let quality = (t.imdb - 8.0) * 0.15 + Double(t.criticScore) / 1000.0
            scores[t.id] = hit / denom + quality + (t.isHiddenGem ? 0.03 : 0)
        }
    }

    private func confidenceMargin() -> Double {
        let sorted = scores.values.sorted(by: >)
        guard sorted.count >= 2 else { return 0 }
        return sorted[0] - sorted[1]
    }

    private func finish() {
        let tags = chosenTags()
        let all = TMDBService.shared.catalogue()
        var cands = all
            .filter { !history.shouldExclude($0.id) } // Anti-Repetition
            .sorted { (scores[$0.id] ?? 0) > (scores[$1.id] ?? 0) }
        if cands.isEmpty { cands = all.sorted { (scores[$0.id] ?? 0) > (scores[$1.id] ?? 0) } } // all seen -> allow repeats last resort
        let top = Array(cands.prefix(10))
        recommendations = top.map { t in
            let s = scores[t.id] ?? 0.5
            let pct = min(99, max(62, Int(72 + s * 32)))
            let (badge, blocked, fallback) = JustWatchService.shared.badge(for: t, region: region)
            // Strict regional rule: blocked titles sink to bottom unless no alternative
            return Recommendation(title: t, matchPercent: blocked ? max(62, pct - 12) : pct,
                                  whyMatches: whyText(tags: tags, title: t),
                                  streamBadge: badge, isBlockedInRegion: blocked, fallback: fallback)
        }.sorted { a, b in
            if a.isBlockedInRegion != b.isBlockedInRegion { return !a.isBlockedInRegion }
            return a.matchPercent > b.matchPercent
        }
        // If every top pick is blocked in region, keep them marked + fallback (per spec: filter OR mark + alternative)
        isDone = true
    }

    private func whyText(tags: Set<String>, title: TitleItem) -> String {
        let overlap = title.moodTags.intersection(tags).sorted().prefix(3).joined(separator: ", ")
        let mood = overlap.isEmpty ? "atmospheric pacing" : overlap
        let pace = title.moodTags.contains("slow-burn") ? "It breathes at your tempo" : "It moves the way you asked"
        return "Matches your \(mood) mood. \(pace) — \(title.kind == .tv ? "series" : "film") rated \(title.imdb, specifier: "%.1f") on IMDb."
    }
}
