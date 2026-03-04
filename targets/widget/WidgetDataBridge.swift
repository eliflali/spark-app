import Foundation
import UIKit
import WidgetKit

// ─────────────────────────────────────────────────────────────────────────────
// WidgetDataBridge
//
// Writes surprise data to the shared App Group. For PHOTO surprises the image
// is downloaded here (in the main app) and saved as a file in the shared
// container — UserDefaults is NOT used for binary data because it can fail to
// flush across processes before the widget reads it.
// ─────────────────────────────────────────────────────────────────────────────

@objc public class WidgetDataBridge: NSObject {

    private static let appGroup  = "group.com.cankuslar.spark"
    private static let payloadKey = "widgetSurprise"
    private static let photoFileName = "widget_photo.dat"

    // Shared container directory (accessible by both app and widget extension)
    private static var containerURL: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup)
    }

    // MARK: - JWT

    @objc public static func saveJWT(_ jwt: String) {
        UserDefaults(suiteName: appGroup)?.set(jwt, forKey: "supabaseJWT")
    }

    // MARK: - Photo file helpers

    private static var photoFileURL: URL? {
        containerURL?.appendingPathComponent(photoFileName)
    }

    private static func cachePhoto(_ data: Data) {
        guard let url = photoFileURL else {
            NSLog("[WidgetDataBridge] ERROR: cannot resolve shared container URL")
            return
        }
        do {
            try data.write(to: url, options: .atomic)
            NSLog("[WidgetDataBridge] Photo cached successfully (%d bytes) at %@", data.count, url.path)
        } catch {
            NSLog("[WidgetDataBridge] ERROR writing photo to disk: %@", error.localizedDescription)
        }
    }

    private static func clearCachedPhoto() {
        guard let url = photoFileURL else { return }
        try? FileManager.default.removeItem(at: url)
    }

    // MARK: - Surprise data

    @objc public static func update(type: String, content: String, senderName: String) {
        guard let defaults = UserDefaults(suiteName: appGroup) else { return }

        // Always clear the previous cached photo
        clearCachedPhoto()

        // Write JSON payload
        let payload: [String: String] = [
            "type": type, "content": content,
            "senderName": senderName,
            "createdAt": ISO8601DateFormatter().string(from: Date())
        ]
        if let data = try? JSONSerialization.data(withJSONObject: payload) {
            defaults.set(data, forKey: payloadKey)
            defaults.synchronize()
        }

        if type == "PHOTO", let url = URL(string: content) {
            NSLog("[WidgetDataBridge] Starting photo download from: %@", content)

            URLSession.shared.dataTask(with: url) { data, response, error in

                if let httpResponse = response as? HTTPURLResponse {
                    NSLog("[WidgetDataBridge] HTTP %d from photo URL", httpResponse.statusCode)
                    if httpResponse.statusCode != 200 {
                        NSLog("[WidgetDataBridge] ERROR: non-200 status. Check that the Supabase storage bucket is public or that a signed URL was provided.")
                        DispatchQueue.main.async {
                            WidgetCenter.shared.reloadTimelines(ofKind: "SparkPulseWidget")
                        }
                        return
                    }
                }

                if let error = error {
                    NSLog("[WidgetDataBridge] Download network error: %@", error.localizedDescription)
                    DispatchQueue.main.async {
                        WidgetCenter.shared.reloadTimelines(ofKind: "SparkPulseWidget")
                    }
                    return
                }

                guard let data = data, !data.isEmpty else {
                    NSLog("[WidgetDataBridge] Download returned empty data")
                    DispatchQueue.main.async {
                        WidgetCenter.shared.reloadTimelines(ofKind: "SparkPulseWidget")
                    }
                    return
                }

                // Validate the bytes are actually an image before caching
                guard UIImage(data: data) != nil else {
                    NSLog("[WidgetDataBridge] ERROR: downloaded data (%d bytes) is not a valid image. Server may have returned an error body. First 200 bytes: %@",
                          data.count,
                          String(data: data.prefix(200), encoding: .utf8) ?? "<binary>")
                    DispatchQueue.main.async {
                        WidgetCenter.shared.reloadTimelines(ofKind: "SparkPulseWidget")
                    }
                    return
                }

                cachePhoto(data)

                DispatchQueue.main.async {
                    WidgetCenter.shared.reloadTimelines(ofKind: "SparkPulseWidget")
                }
            }.resume()
        } else {
            if type == "PHOTO" {
                NSLog("[WidgetDataBridge] ERROR: content is not a valid URL for PHOTO type: %@", content)
            }
            WidgetCenter.shared.reloadTimelines(ofKind: "SparkPulseWidget")
        }
    }

    @objc public static func clear() {
        clearCachedPhoto()
        let defaults = UserDefaults(suiteName: appGroup)
        defaults?.removeObject(forKey: payloadKey)
        defaults?.removeObject(forKey: "supabaseJWT")
        WidgetCenter.shared.reloadTimelines(ofKind: "SparkPulseWidget")
    }
}
