import WidgetKit
import SwiftUI

// MARK: - Constants

private let kAppGroup      = "group.com.cankuslar.spark"
private let kEdgeFnURL     = "https://apzsnrkehgmwrsqcynbw.supabase.co/functions/v1/widget-surprise-payload"

// MARK: - Surprise Type

enum SurpriseKind: String, Codable {
    case photo    = "PHOTO"
    case note     = "NOTE"
    case reaction = "REACTION"
}

// MARK: - App-Group data model (shared with main app)

struct WidgetSurprise: Codable {
    var type: SurpriseKind
    var content: String        // note text | photo URL | emoji
    var senderName: String
    var createdAt: String

    static let placeholder = WidgetSurprise(
        type: .note,
        content: "A secret is on its way… ✨",
        senderName: "Spark",
        createdAt: ""
    )
}

// Keys inside UserDefaults(suiteName:)
enum WidgetKeys {
    static let surprise  = "widgetSurprise"   // JSON-encoded WidgetSurprise
    static let jwt       = "supabaseJWT"      // stored by the main app after login
}

// MARK: - Timeline Entry

struct SparkPulseEntry: TimelineEntry {
    let date: Date
    let surprise: WidgetSurprise
    let isPlaceholder: Bool
    /// Pre-fetched image bytes (set for PHOTO type only).
    /// Using Data instead of UIImage because widget entries must be Sendable.
    var imageData: Data?
}

// MARK: - Timeline Provider

struct SparkPulseProvider: TimelineProvider {

    // Placeholder shown during widget gallery / configuration
    func placeholder(in context: Context) -> SparkPulseEntry {
        SparkPulseEntry(date: Date(), surprise: .placeholder, isPlaceholder: true, imageData: nil)
    }

    // Snapshot shown in the widget picker — use cached data for speed
    func getSnapshot(in context: Context, completion: @escaping (SparkPulseEntry) -> Void) {
        completion(SparkPulseEntry(date: Date(), surprise: cachedSurprise(),
                                  isPlaceholder: false, imageData: loadCachedPhotoData()))
    }

    // Full timeline: try to fetch fresh data, fall back to cache
    func getTimeline(in context: Context, completion: @escaping (Timeline<SparkPulseEntry>) -> Void) {
        Task {
            let surprise = await fetchOrFallback()
            let imageData = surprise.type == .photo ? loadCachedPhotoData() : nil
            // Refresh every 30 minutes; silent push will force early refresh via reloadAllTimelines()
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
            let entry = SparkPulseEntry(date: Date(), surprise: surprise,
                                        isPlaceholder: false, imageData: imageData)
            let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
            completion(timeline)
        }
    }

    // MARK: Private helpers

    private func cachedSurprise() -> WidgetSurprise {
        guard
            let defaults = UserDefaults(suiteName: kAppGroup),
            let data = defaults.data(forKey: WidgetKeys.surprise),
            let decoded = try? JSONDecoder().decode(WidgetSurprise.self, from: data)
        else { return .placeholder }
        return decoded
    }

    /// Reads the pre-downloaded photo from the shared container file first,
    /// then falls back to the UserDefaults bytes written simultaneously by WidgetDataBridge.
    private func loadCachedPhotoData() -> Data? {
        // Primary: shared container file (most reliable cross-process storage)
        if let containerURL = FileManager.default.containerURL(
                forSecurityApplicationGroupIdentifier: kAppGroup) {
            let fileURL = containerURL.appendingPathComponent("widget_photo.dat")
            if let fileData = try? Data(contentsOf: fileURL), !fileData.isEmpty {
                NSLog("[SparkPulseWidget] Loaded photo from file: %d bytes", fileData.count)
                return fileData
            }
        }
        // Fallback: UserDefaults (also written by WidgetDataBridge.cachePhoto)
        let fallback = UserDefaults(suiteName: kAppGroup)?.data(forKey: "widgetPhotoData")
        NSLog("[SparkPulseWidget] UserDefaults fallback photo: %d bytes", fallback?.count ?? 0)
        return fallback
    }

    private func fetchOrFallback() async -> WidgetSurprise {
        guard
            let defaults = UserDefaults(suiteName: kAppGroup),
            let jwt = defaults.string(forKey: WidgetKeys.jwt),
            !jwt.isEmpty,
            let url = URL(string: kEdgeFnURL)
        else { return cachedSurprise() }

        do {
            var request = URLRequest(url: url, timeoutInterval: 10)
            request.setValue("Bearer \(jwt)", forHTTPHeaderField: "Authorization")
            let (data, response) = try await URLSession.shared.data(for: request)

            guard (response as? HTTPURLResponse)?.statusCode == 200 else {
                return cachedSurprise()
            }

            struct EdgeResponse: Decodable {
                struct Payload: Decodable {
                    let type: String
                    let content: String
                    let sender_name: String
                    let created_at: String?
                }
                let data: Payload?
            }

            let decoded = try JSONDecoder().decode(EdgeResponse.self, from: data)
            guard let payload = decoded.data else { return cachedSurprise() }

            let surprise = WidgetSurprise(
                type: SurpriseKind(rawValue: payload.type) ?? .note,
                content: payload.content,
                senderName: payload.sender_name,
                createdAt: payload.created_at ?? ""
            )

            // Persist for offline / snapshot use
            if let encoded = try? JSONEncoder().encode(surprise) {
                defaults.set(encoded, forKey: WidgetKeys.surprise)
            }

            return surprise
        } catch {
            return cachedSurprise()
        }
    }
}

// MARK: - Shared Design Tokens

private enum DS {
    static let bg        = Color(hex: "#0F172A")
    static let amber     = Color(hex: "#F59E0B")
    static let rose      = Color(hex: "#FB7185")
    static let slate     = Color(hex: "#94A3B8")
    static let stickyBg  = Color(hex: "#1E293B")
    static let stickyBdr = Color(hex: "#FBBF24")
    static let surface   = Color.white.opacity(0.06)
}

// MARK: - Subviews: Photo

struct PhotoWidgetView: View {
    let entry: SparkPulseEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            // Use pre-cached image bytes — AsyncImage is NOT reliable in widget extensions
            // because the extension cannot make network calls at render time.
            if let imageData = entry.imageData,
               let uiImage = UIImage(data: imageData) {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFill()
            } else {
                fallbackPhotoPlaceholder
            }

            // Sender name badge
            senderBadge(label: "📷 \(entry.surprise.senderName)")
        }
        .clipped()
    }

    private var fallbackPhotoPlaceholder: some View {
        DS.stickyBg
            .overlay(
                VStack(spacing: 8) {
                    Image(systemName: "photo")
                        .font(.system(size: 32, weight: .light))
                        .foregroundStyle(DS.slate)
                    Text("Memory Loading…")
                        .font(.system(size: 12))
                        .foregroundStyle(DS.slate)
                    Text("from \(entry.surprise.senderName)")
                        .font(.system(size: 10))
                        .foregroundStyle(DS.slate.opacity(0.6))
                }
            )
    }
}

// MARK: - Subviews: Note

struct NoteWidgetView: View {
    let entry: SparkPulseEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Top bar
            HStack(spacing: 6) {
                Image(systemName: "sparkles")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(DS.amber)
                Text(entry.surprise.senderName)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(DS.amber)
                    .lineLimit(1)
                Spacer()
                Image(systemName: "note.text")
                    .font(.system(size: 11))
                    .foregroundStyle(DS.slate)
            }

            // Sticky note body
            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(hex: "#FBBF24").opacity(0.10))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .strokeBorder(Color(hex: "#FBBF24").opacity(0.25), lineWidth: 1)
                    )

                Text(entry.surprise.content)
                    .font(.system(size: noteSize, weight: .medium))
                    .foregroundStyle(Color(hex: "#FDE68A"))
                    .lineLimit(noteLines)
                    .padding(12)
            }
        }
        .padding(family == .systemSmall ? 14 : 18)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private var noteSize: CGFloat {
        switch family {
        case .systemSmall:  return 13
        case .systemMedium: return 14
        default:            return 16
        }
    }

    private var noteLines: Int {
        switch family {
        case .systemSmall:  return 4
        case .systemMedium: return 5
        default:            return 9
        }
    }
}

// MARK: - Subviews: Reaction

struct ReactionWidgetView: View {
    let entry: SparkPulseEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        VStack(spacing: family == .systemSmall ? 8 : 14) {
            Text(entry.surprise.content)
                .font(.system(size: emojiSize))

            VStack(spacing: 3) {
                Text(entry.surprise.senderName)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(DS.amber)
                Text("sent a reaction")
                    .font(.system(size: 11))
                    .foregroundStyle(DS.slate)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var emojiSize: CGFloat {
        switch family {
        case .systemSmall:  return 44
        case .systemMedium: return 56
        default:            return 72
        }
    }
}

// MARK: - Shared sender badge helper

private func senderBadge(label: String) -> some View {
    Text(label)
        .font(.system(size: 11, weight: .semibold))
        .foregroundStyle(.white)
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(.ultraThinMaterial, in: Capsule())
        .padding(12)
}

// MARK: - Placeholder / Empty State

struct EmptyWidgetView: View {
    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: "gift")
                .font(.system(size: 28, weight: .light))
                .foregroundStyle(DS.amber)
            Text("No surprises yet")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.white)
            Text("Hint your partner 😉")
                .font(.system(size: 11))
                .foregroundStyle(DS.slate)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Entry View (dispatcher)

struct SparkPulseWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: SparkPulseProvider.Entry

    var body: some View {
        Group {
            if entry.isPlaceholder {
                EmptyWidgetView()
            } else {
                switch entry.surprise.type {
                case .photo:
                    PhotoWidgetView(entry: entry)
                case .note:
                    NoteWidgetView(entry: entry)
                case .reaction:
                    ReactionWidgetView(entry: entry)
                }
            }
        }
        .containerBackground(for: .widget) {
            DS.bg
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
        let r = Double((int >> 16) & 0xFF) / 255.0
        let g = Double((int >> 8)  & 0xFF) / 255.0
        let b = Double(int         & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}
