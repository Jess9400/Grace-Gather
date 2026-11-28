import SwiftUI
import WidgetKit

private struct Verse: Decodable {
    let reference: String
    let text: String
}

private struct Edition: Decodable {
    let name: String
    let verses: [Verse]
}

private struct Reading: TimelineEntry {
    let date: Date
    let verse: Verse
    let edition: String
}

private struct Readings: TimelineProvider {
    static let editions: [String: Edition] = {
        guard let url = Bundle.main.url(forResource: "verses", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let editions = try? JSONDecoder().decode([String: Edition].self, from: data)
        else { return [:] }
        return editions
    }()

    private func selectedEdition() -> Edition {
        let appID = String((Bundle.main.bundleIdentifier ?? "").dropLast(".DailyVerse".count))
        let preferences = UserDefaults(suiteName: "group." + appID + ".dailyverse")
        if let key = preferences?.string(forKey: "edition"), let edition = Self.editions[key] {
            return edition
        }
        let language = Locale.current.language.languageCode?.identifier ?? "en"
        let fallback = ["pt": "blivre", "es": "rv1909", "ru": "synodal"][language] ?? "web"
        return Self.editions[fallback] ?? Edition(name: "World English Bible", verses: [
            Verse(reference: "Proverbs 16:3", text: "Commit your deeds to the LORD, and your plans shall succeed.")
        ])
    }

    private func readings(from now: Date, count: Int) -> [Reading] {
        let edition = selectedEdition()
        let verses = edition.verses
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = .current
        let today = calendar.startOfDay(for: now)
        return (0..<count).compactMap { offset in
            guard let day = calendar.date(byAdding: .day, value: offset, to: today),
                  let ordinal = calendar.ordinality(of: .day, in: .era, for: day),
                  !verses.isEmpty else { return nil }
            return Reading(date: offset == 0 ? now : day, verse: verses[ordinal % verses.count], edition: edition.name)
        }
    }

    func placeholder(in context: Context) -> Reading {
        readings(from: Date(), count: 1)[0]
    }

    func getSnapshot(in context: Context, completion: @escaping (Reading) -> Void) {
        completion(placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Reading>) -> Void) {
        completion(Timeline(entries: readings(from: Date(), count: 8), policy: .atEnd))
    }
}

private struct VerseView: View {
    let entry: Reading
    @Environment(\.widgetFamily) var family
    private let gold = Color(red: 0.89, green: 0.76, blue: 0.52)

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Label("Daily verse", systemImage: "book")
                .font(.caption2.weight(.semibold)).foregroundStyle(gold)
            Spacer(minLength: 0)
            Text(entry.verse.text)
                .font(.system(family == .systemSmall ? .callout : .title3, design: .serif))
                .foregroundStyle(Color(red: 1, green: 0.97, blue: 0.89))
                .minimumScaleFactor(0.78)
            Spacer(minLength: 0)
            Text(entry.verse.reference)
                .font(.caption.weight(.semibold)).foregroundStyle(gold)
            if family == .systemMedium {
                Text(entry.edition).font(.caption2).foregroundStyle(gold)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .containerBackground(for: .widget) {
            LinearGradient(colors: [Color(red: 0.26, green: 0.19, blue: 0.13),
                                    Color(red: 0.12, green: 0.09, blue: 0.07)],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
        }
        .accessibilityElement(children: .combine)
        .widgetURL(URL(string: "awaychurch:///"))
    }
}

@main
struct DailyVerseWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DailyVerse", provider: Readings()) { entry in
            VerseView(entry: entry)
        }
        .configurationDisplayName("Daily verse")
        .description("Read today’s verse and tap to enter the church.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
