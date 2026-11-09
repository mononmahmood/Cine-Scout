import Foundation

// MARK: - Region (strict IN/BD)
enum Region: String, CaseIterable, Identifiable, Codable {
    case IN, BD
    var id: String { rawValue }
    var label: String {
        switch self {
        case .IN: return "India (IN)"
        case .BD: return "Bangladesh (BD)"
        }
    }
}

// MARK: - Streaming platform
enum StreamPlatform: String, CaseIterable, Identifiable, Codable {
    case netflix, prime, appleTV
    var id: String { rawValue }
    var displayName: String {
        switch self {
        case .netflix: return "Netflix"
        case .prime: return "Prime Video"
        case .appleTV: return "Apple TV+"
        }
    }
}

// MARK: - Availability
enum AccessType: String, Codable {
    case stream, rent, buy
}

struct Availability: Codable, Hashable {
    var platform: StreamPlatform
    var regions: [Region]
    var type: AccessType
    var deepLink: String // JustWatch / platform URL
    func supports(_ region: Region) -> Bool { regions.contains(region) }
}

// MARK: - Title
enum TitleKind: String, Codable {
    case movie, tv
}

struct TitleItem: Identifiable, Codable, Hashable {
    var id: String
    var title: String
    var year: Int
    var kind: TitleKind
    var posterURL: URL?
    var overview: String
    var imdb: Double
    var criticScore: Int // 0-100
    var isHiddenGem: Bool
    var moodTags: Set<String> // e.g. "slow-burn", "moral-ambiguity", "claustrophobic"
    var availabilities: [Availability]
}

// MARK: - Diagnostic Q&A (Mind-Reader, situational — never raw genre)
struct QuestionOption: Identifiable, Hashable {
    var id: String
    var label: String
    var moodTags: Set<String> // weight contribution
}

struct DiagnosticQuestion: Identifiable, Hashable {
    var id: String
    var prompt: String
    var options: [QuestionOption] // exactly 3
}

// MARK: - Recommendation output
struct Recommendation: Identifiable, Hashable {
    var id: String { title.id }
    var title: TitleItem
    var matchPercent: Int // 50-99
    var whyMatches: String // 2 sentences
    var streamBadge: String // e.g. "Available on Prime Video [IN]"
    var isBlockedInRegion: Bool
    var fallback: String? // rent/buy or closest alternative
}
