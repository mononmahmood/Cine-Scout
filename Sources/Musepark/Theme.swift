import SwiftUI

enum Theme {
    static let bg = Color(nsColor: .init(srgbRed: 0x0F/255, green: 0x0F/255, blue: 0x0F/255, alpha: 1))
    static let panel = Color.white.opacity(0.04)
    static let accent = Color.accentColor
    static let matchHigh = Color.green
    static let matchMid = Color.orange

    static func matchColor(_ pct: Int) -> Color {
        pct >= 90 ? .green : pct >= 75 ? .mint : .orange
    }
}

// Reusable glowing availability badge (IN/BD requirement)
struct AvailabilityBadge: View {
    var text: String
    var blocked: Bool
    var body: some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 10).padding(.vertical, 5)
            .background(blocked ? Color.red.opacity(0.18) : Color.green.opacity(0.18))
            .foregroundStyle(blocked ? .red : .green)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(blocked ? Color.red.opacity(0.5) : Color.green.opacity(0.6), lineWidth: 1))
            .shadow(color: blocked ? .red.opacity(0.25) : .green.opacity(0.35), radius: 6)
    }
}

struct MatchBadge: View {
    var pct: Int
    var body: some View {
        Text("\(pct)% match")
            .font(.caption.weight(.bold))
            .padding(.horizontal, 8).padding(.vertical, 4)
            .background(Theme.matchColor(pct).opacity(0.2))
            .foregroundStyle(Theme.matchColor(pct))
            .clipShape(Capsule())
    }
}
