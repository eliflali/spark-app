import Foundation
import UIKit
import WidgetKit

// ─────────────────────────────────────────────────────────────────────────────
// WidgetDataBridge
//
// Writes surprise data to the shared App Group. For PHOTO surprises the image
// is downloaded here (in the main app) and saved BOTH as a file AND in
// UserDefaults so the widget extension can read it regardless of which storage
// path its provider checks.
// ─────────────────────────────────────────────────────────────────────────────

@objc public class WidgetDataBridge: NSObject {

    private static let appGroup     = "group.com.cankuslar.spark"
    private static let payloadKey   = "widgetSurprise"
    private static let photoFileKey = "widget_photo.dat"     // used by ios/widget provider
    private static let photoDataKey = "widgetPhotoData"      // used by targets/widget provider

    // Debug status — read by JS side via getPhotoDebugStatus
    private static var _photoStatus: String = "no_attempt"

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
        containerURL?.appendingPathComponent(photoFileKey)
    }

    private static func cachePhoto(_ data: Data) {
        // 1) Write to file (read by ios/widget/SparkPulseWidgetProvider.swift)
        if let url = photoFileURL {
            do {
                try data.write(to: url, options: .atomic)
                NSLog("[WidgetDataBridge] Photo written to file (%d bytes) → %@", data.count, url.path)
            } catch {
                NSLog("[WidgetDataBridge] ERROR writing photo file: %@", error.localizedDescription)
            }
        } else {
            NSLog("[WidgetDataBridge] ERROR: cannot resolve shared container URL")
        }

        // 2) Write to UserDefaults (read by targets/widget/SparkPulseWidget.swift provider)
        if let defaults = UserDefaults(suiteName: appGroup) {
            defaults.set(data, forKey: photoDataKey)
            defaults.synchronize()
            NSLog("[WidgetDataBridge] Photo written to UserDefaults[\"%@\"] (%d bytes)", photoDataKey, data.count)
        }

        _photoStatus = String(format: "cached_%d_bytes", data.count)
    }

    private static func clearCachedPhoto() {
        if let url = photoFileURL {
            try? FileManager.default.removeItem(at: url)
        }
        UserDefaults(suiteName: appGroup)?.removeObject(forKey: photoDataKey)
        _photoStatus = "no_attempt"
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
            _photoStatus = "downloading"
            NSLog("[WidgetDataBridge] Starting photo download from: %@", content)

            URLSession.shared.dataTask(with: url) { data, response, error in

                if let httpResponse = response as? HTTPURLResponse {
                    NSLog("[WidgetDataBridge] HTTP %d from photo URL", httpResponse.statusCode)
                    if httpResponse.statusCode != 200 {
                        _photoStatus = String(format: "http_%d", httpResponse.statusCode)
                        NSLog("[WidgetDataBridge] ERROR: non-200 status. Check Supabase storage bucket permissions.")
                        DispatchQueue.main.async {
                            WidgetCenter.shared.reloadTimelines(ofKind: "SparkPulseWidget")
                        }
                        return
                    }
                }

                if let error = error {
                    _photoStatus = "network_error"
                    NSLog("[WidgetDataBridge] Download network error: %@", error.localizedDescription)
                    DispatchQueue.main.async {
                        WidgetCenter.shared.reloadTimelines(ofKind: "SparkPulseWidget")
                    }
                    return
                }

                guard let data = data, !data.isEmpty else {
                    _photoStatus = "empty_response"
                    NSLog("[WidgetDataBridge] Download returned empty data")
                    DispatchQueue.main.async {
                        WidgetCenter.shared.reloadTimelines(ofKind: "SparkPulseWidget")
                    }
                    return
                }

                // Validate the bytes are actually an image before caching
                guard UIImage(data: data) != nil else {
                    _photoStatus = String(format: "invalid_image_%d_bytes", data.count)
                    NSLog("[WidgetDataBridge] ERROR: downloaded data (%d bytes) is not a valid image. First 200 bytes: %@",
                          data.count,
                          String(data: data.prefix(200), encoding: .utf8) ?? "<binary>")
                    DispatchQueue.main.async {
                        WidgetCenter.shared.reloadTimelines(ofKind: "SparkPulseWidget")
                    }
                    return
                }

                // Cache to both storage paths and reload widget
                cachePhoto(data)

                DispatchQueue.main.async {
                    WidgetCenter.shared.reloadAllTimelines()
                }
            }.resume()
        } else {
            if type == "PHOTO" {
                _photoStatus = "invalid_url"
                NSLog("[WidgetDataBridge] ERROR: content is not a valid URL for PHOTO type: %@", content)
            }
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    // MARK: - Debug status

    @objc public static func getPhotoDebugStatus() -> String {
        return _photoStatus
    }

    // MARK: - Clear

    @objc public static func clear() {
        clearCachedPhoto()
        let defaults = UserDefaults(suiteName: appGroup)
        defaults?.removeObject(forKey: payloadKey)
        defaults?.removeObject(forKey: "supabaseJWT")
        WidgetCenter.shared.reloadAllTimelines()
    }
}

