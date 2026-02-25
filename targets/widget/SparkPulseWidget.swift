import WidgetKit
import SwiftUI

// MARK: - Data Model

struct SparkPulseEntry: TimelineEntry {
    let date: Date
    let senderName: String
    let text: String
}

// MARK: - Timeline Provider

struct SparkPulseProvider: TimelineProvider {
    let appGroupId = "group.com.cankuslar.spark"

    func placeholder(in context: Context) -> SparkPulseEntry {
        SparkPulseEntry(
            date: Date(),
            senderName: "Spark",
            text: "A surprise is waiting for you ✨"
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (SparkPulseEntry) -> Void) {
        let entry = getEntryFromStorage()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SparkPulseEntry>) -> Void) {
        let entry = getEntryFromStorage()
        let timeline = Timeline(entries: [entry], policy: .atEnd)
        completion(timeline)
    }

    private func getEntryFromStorage() -> SparkPulseEntry {
        let defaults = UserDefaults(suiteName: appGroupId)
        let senderName = defaults?.string(forKey: "senderName") ?? "Spark"
        let text = defaults?.string(forKey: "text") ?? "No new surprises yet..."
        return SparkPulseEntry(date: Date(), senderName: senderName, text: text)
    }
}

// MARK: - Widget Views

struct SparkPulseSmallView: View {
    let entry: SparkPulseEntry

    var body: some View {
        VStack(spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: "sparkles")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Color(hex: "#F59E0B"))
                Text(entry.senderName)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Color(hex: "#F59E0B"))
            }

            Text(entry.text)
                .font(.system(size: 13))
                .foregroundStyle(.white)
                .lineLimit(3)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct SparkPulseMediumView: View {
    let entry: SparkPulseEntry

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: "sparkles")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Color(hex: "#F59E0B"))
                Text("\(entry.senderName) says:")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(Color(hex: "#F59E0B"))
            }

            Text(entry.text)
                .font(.system(size: 14))
                .foregroundStyle(.white)
                .lineLimit(4)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct SparkPulseLargeView: View {
    let entry: SparkPulseEntry

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "sparkles")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Color(hex: "#F59E0B"))
                Text("\(entry.senderName) says:")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(Color(hex: "#F59E0B"))
            }

            Divider()
                .background(Color.white.opacity(0.2))

            Text(entry.text)
                .font(.system(size: 16))
                .foregroundStyle(.white)
                .lineLimit(8)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Widget Entry View

struct SparkPulseWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: SparkPulseProvider.Entry

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                SparkPulseSmallView(entry: entry)
            case .systemMedium:
                SparkPulseMediumView(entry: entry)
            case .systemLarge:
                SparkPulseLargeView(entry: entry)
            default:
                SparkPulseSmallView(entry: entry)
            }
        }
        .containerBackground(for: .widget) {
            Color(hex: "#0F172A")
        }
    }
}

// MARK: - Widget Definition

struct SparkPulseWidget: Widget {
    let kind: String = "SparkPulseWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SparkPulseProvider()) { entry in
            SparkPulseWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Spark Pulse")
        .description("See the latest surprise from your partner.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

// MARK: - Color Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: Double
        r = Double((int >> 16) & 0xFF) / 255.0
        g = Double((int >> 8) & 0xFF) / 255.0
        b = Double(int & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}
