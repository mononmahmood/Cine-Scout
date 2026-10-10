import Foundation

// MARK: - Mock catalogue (stands in for TMDB; wire real API key later)
enum MockCatalogue {
    static func titles() -> [TitleItem] {
        func avail(_ p: StreamPlatform, _ r: [Region], _ t: AccessType = .stream) -> Availability {
            Availability(platform: p, regions: r, type: t, deepLink: "https://justwatch.com/in/\(p.rawValue)")
        }
        return [
            TitleItem(id: "tt1856101", title: "Blade Runner 2049", year: 2017, kind: .movie,
                      posterURL: URL(string: "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg"),
                      overview: "A young blade runner unearths a buried secret.",
                      imdb: 8.0, criticScore: 81, isHiddenGem: false,
                      moodTags: ["expansive", "slow-burn", "moral-ambiguity", "surreal"],
                      availabilities: [avail(.netflix, [.IN]), avail(.appleTV, [.IN, .BD], .rent)]),
            TitleItem(id: "tt6751668", title: "Parasite", year: 2019, kind: .movie,
                      posterURL: URL(string: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg"),
                      overview: "A poor family schemes into a wealthy household.",
                      imdb: 8.5, criticScore: 97, isHiddenGem: false,
                      moodTags: ["moral-ambiguity", "slow-burn", "claustrophobic", "silence-flaw"],
                      availabilities: [avail(.prime, [.IN, .BD])]),
            TitleItem(id: "tt2084970", title: "The Imitation Game", year: 2014, kind: .movie,
                      posterURL: nil, overview: "Turing cracks Enigma under pressure.",
                      imdb: 8.0, criticScore: 73, isHiddenGem: true,
                      moodTags: ["moral-ambiguity", "silence-flaw", "claustrophobic"],
                      availabilities: [avail(.prime, [.IN])]),
            TitleItem(id: "tt1190634", title: "The Boys", year: 2019, kind: .tv,
                      posterURL: nil, overview: "Vigilantes vs. corrupt supes.",
                      imdb: 8.7, criticScore: 84, isHiddenGem: false,
                      moodTags: ["adrenaline", "moral-ambiguity", "expansive"],
                      availabilities: [avail(.prime, [.IN, .BD])]),
            TitleItem(id: "tt6208148", title: "Severance", year: 2022, kind: .tv,
                      posterURL: nil, overview: "Office workers split work/life memories.",
                      imdb: 8.7, criticScore: 86, isHiddenGem: true,
                      moodTags: ["psych-fracture", "claustrophobic", "slow-burn", "surreal"],
                      availabilities: [avail(.appleTV, [.IN, .BD])]),
            TitleItem(id: "tt3581920", title: "The Last of Us", year: 2023, kind: .tv,
                      posterURL: nil, overview: "A smuggler escorts a girl across ruin.",
                      imdb: 8.8, criticScore: 84, isHiddenGem: false,
                      moodTags: ["slow-burn", "moral-ambiguity", "expansive"],
                      availabilities: []), // NOT streaming IN/BD -> fallback path
            TitleItem(id: "tt5051245", title: "Tumbbad", year: 2018, kind: .movie,
                      posterURL: nil, overview: "A cursed treasure and greed in colonial India.",
                      imdb: 8.2, criticScore: 80, isHiddenGem: true,
                      moodTags: ["lore", "surreal", "slow-burn", "expansive"],
                      availabilities: [avail(.prime, [.IN])]),
            TitleItem(id: "tt8108198", title: "Andhadhun", year: 2018, kind: .movie,
                      posterURL: nil, overview: "A fake-blind pianist witnesses a crime.",
                      imdb: 8.2, criticScore: 83, isHiddenGem: true,
                      moodTags: ["psych-fracture", "adrenaline", "moral-ambiguity"],
                      availabilities: [avail(.netflix, [.IN, .BD])]),
        ]
    }

    /// Curated Platform Explorer fetch: IMDb 8.0+, hidden gems first.
    static func top(for platform: StreamPlatform, region: Region) -> [TitleItem] {
        titles()
            .filter { $0.imdb >= 8.0 }
            .sorted {
                if $0.isHiddenGem != $1.isHiddenGem { return $0.isHiddenGem && !$1.isHiddenGem }
                return ($0.imdb + Double($0.criticScore)/100) > ($1.imdb + Double($1.criticScore)/100)
            }
    }
}

// MARK: - TMDB service stub (swap mock for real network + API key)
final class TMDBService {
    static let shared = TMDBService()
    var apiKey: String { ProcessInfo.processInfo.environment["TMDB_API_KEY"] ?? "" }
    func catalogue() -> [TitleItem] { MockCatalogue.titles() } // TODO: URLSession fetch
    func top(for platform: StreamPlatform, region: Region) -> [TitleItem] {
        MockCatalogue.top(for: platform, region: region)
    }
}

// MARK: - JustWatch regional verifier stub (strict IN/BD)
struct RegionCheck {
    var playable: Availability?
    var rentBuy: [Availability]
    var blocked: Bool { playable == nil }
}

final class JustWatchService {
    static let shared = JustWatchService()
    /// Never suggest without verifying IN/BD. Returns playable stream or rent/buy fallback.
    func verify(_ title: TitleItem, region: Region) -> RegionCheck {
        let playable = title.availabilities.first { $0.type == .stream && $0.supports(region) }
        let rentBuy = title.availabilities.filter { $0.type != .stream && $0.supports(region) }
        return RegionCheck(playable: playable, rentBuy: rentBuy)
    }

    func badge(for title: TitleItem, region: Region) -> (String, Bool, String?) {
        let c = verify(title, region: region)
        if let p = c.playable {
            return ("Available on \(p.platform.displayName) [\(region.rawValue)]", false, nil)
        }
        if let rb = c.rentBuy.first {
            return ("Not streaming — Rent/Buy on \(rb.platform.displayName) [\(region.rawValue)]", true,
                    "Rent via \(rb.deepLink)")
        }
        return ("Not currently streaming in your region", true,
                "Closest alternative: similar mood title that IS streaming (see Platform Explorer).")
    }
}
