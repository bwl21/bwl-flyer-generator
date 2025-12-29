# UI Mockup: Template Selector

## Übersicht

UI-Komponente zur Auswahl und Verwaltung von Vorlagensets.

## Hauptansicht

```
┌─────────────────────────────────────────────────────────────┐
│  ChurchTools Flyer Generator                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Aktives Vorlagenset: Church Flyers Default v1.0     │   │
│  │ [Vorlagen wechseln]                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [Rest der Anwendung...]                                    │
└─────────────────────────────────────────────────────────────┘
```

## Template Selector Modal

```
┌─────────────────────────────────────────────────────────────┐
│  Vorlagenset auswählen                              [X]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┬──────────────────┐                   │
│  │ Lokale Vorlagen  │ Wiki-Vorlagen    │                   │
│  └──────────────────┴──────────────────┘                   │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ ○ Church Flyers Default                    v1.0    │    │
│  │   Standard-Vorlagen für Gemeinde-Flyer             │    │
│  │   📁 Lokal                                         │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ ○ Weihnachts-Special                       v1.2    │    │
│  │   Festliche Vorlagen für die Adventszeit           │    │
│  │   📁 Lokal                                         │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ ○ Modern Minimal                           v2.0    │    │
│  │   Reduziertes Design mit viel Weißraum             │    │
│  │   📁 Lokal                                         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Vorschau: Church Flyers Default                    │    │
│  │ ┌──────────┬──────────┬──────────┬──────────┐     │    │
│  │ │ A5 hoch  │ A5 quer  │ A6 lang  │ A6 lang  │     │    │
│  │ │          │          │ hoch     │ quer     │     │    │
│  │ │ [mini]   │ [mini]   │ [mini]   │ [mini]   │     │    │
│  │ └──────────┴──────────┴──────────┴──────────┘     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│                    [Laden]  [Abbrechen]                     │
└─────────────────────────────────────────────────────────────┘
```

## Mit Wiki-Integration

```
┌─────────────────────────────────────────────────────────────┐
│  Vorlagenset auswählen                              [X]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┬──────────────────┐                   │
│  │ Lokale Vorlagen  │ Wiki-Vorlagen ✓  │                   │
│  └──────────────────┴──────────────────┘                   │
│                                                              │
│  Wiki-Seite: [Flyer-Vorlagen ▼]                            │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ ○ Gemeinde Hauptvorlagen                   v3.1    │    │
│  │   Offizielle Vorlagen der Gemeinde                 │    │
│  │   🌐 Wiki • Aktualisiert: 15.12.2025              │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ ○ Jugendgottesdienst                       v1.5    │    │
│  │   Moderne Vorlagen für Jugendveranstaltungen       │    │
│  │   🌐 Wiki • Aktualisiert: 10.12.2025              │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ ○ Senioren-Nachmittag                      v1.0    │    │
│  │   Große Schrift, klares Layout                     │    │
│  │   🌐 Wiki • Aktualisiert: 01.12.2025              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ℹ️ Wiki-Vorlagen werden automatisch aktualisiert          │
│                                                              │
│                    [Laden]  [Abbrechen]                     │
└─────────────────────────────────────────────────────────────┘
```

## Detailansicht eines Template-Sets

```
┌─────────────────────────────────────────────────────────────┐
│  Church Flyers Default v1.0                         [X]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Standard-Vorlagen für Gemeinde-Flyer mit Header,           │
│  Content und QR-Code                                        │
│                                                              │
│  📊 Metadaten                                               │
│  ├─ Autor: Gemeinde Beispiel                               │
│  ├─ Erstellt: 27.12.2025                                   │
│  ├─ Aktualisiert: 27.12.2025                               │
│  └─ Lizenz: CC-BY-4.0                                      │
│                                                              │
│  🎨 Gemeinsame Elemente                                     │
│  ├─ Farben: Primary (#1e40af), Text Dark, Text Light       │
│  ├─ Schriften: Titel (14pt), Untertitel (10pt), Body (9pt) │
│  └─ Abstände: Padding (10mm), Zeilenhöhe (15mm)           │
│                                                              │
│  📄 Enthaltene Vorlagen (4)                                 │
│  ┌──────────────────────────────────────────────────┐      │
│  │ ✓ A5 hoch (148×210mm)                            │      │
│  │   Hochformat für Aushänge und Handzettel         │      │
│  ├──────────────────────────────────────────────────┤      │
│  │ ✓ A5 quer (210×148mm)                            │      │
│  │   Querformat für Präsentationen                  │      │
│  ├──────────────────────────────────────────────────┤      │
│  │ ✓ A6 lang hoch (105×210mm)                       │      │
│  │   Schmales Hochformat für Lesezeichen            │      │
│  ├──────────────────────────────────────────────────┤      │
│  │ ✓ A6 lang quer (210×105mm)                       │      │
│  │   Breites Querformat für Banner                  │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
│              [Dieses Set verwenden]  [Schließen]            │
└─────────────────────────────────────────────────────────────┘
```

## Fehlerbehandlung

### Keine Vorlagen gefunden

```
┌─────────────────────────────────────────────────────────────┐
│  Vorlagenset auswählen                              [X]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┬──────────────────┐                   │
│  │ Lokale Vorlagen  │ Wiki-Vorlagen    │                   │
│  └──────────────────┴──────────────────┘                   │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │              📭                                     │    │
│  │                                                     │    │
│  │         Keine Vorlagen gefunden                    │    │
│  │                                                     │    │
│  │  Legen Sie Template-Dateien im Ordner              │    │
│  │  public/templates/ ab.                             │    │
│  │                                                     │    │
│  │  [Dokumentation öffnen]                            │    │
│  │                                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│                         [Schließen]                         │
└─────────────────────────────────────────────────────────────┘
```

### Ladefehler

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Fehler beim Laden                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Die Vorlagendatei "christmas-special.json" konnte nicht    │
│  geladen werden.                                            │
│                                                              │
│  Fehler: Invalid JSON format at line 42                     │
│                                                              │
│  Mögliche Ursachen:                                         │
│  • Datei ist beschädigt                                     │
│  • Ungültiges JSON-Format                                   │
│  • Fehlende Berechtigungen                                  │
│                                                              │
│  [Details anzeigen]  [Erneut versuchen]  [Abbrechen]       │
└─────────────────────────────────────────────────────────────┘
```

## Ladevorgang

```
┌─────────────────────────────────────────────────────────────┐
│  Vorlagen werden geladen...                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    ⏳                                        │
│                                                              │
│  Lade "Church Flyers Default"...                            │
│                                                              │
│  ████████████████░░░░░░░░░░  60%                           │
│                                                              │
│  ✓ Datei geladen                                            │
│  ✓ JSON validiert                                           │
│  ⏳ Variablen werden aufgelöst...                           │
│  ⏳ Templates werden generiert...                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Erfolgreiche Aktivierung

```
┌─────────────────────────────────────────────────────────────┐
│  ✅ Vorlagen erfolgreich geladen                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  "Church Flyers Default v1.0" ist jetzt aktiv.              │
│                                                              │
│  4 Vorlagen verfügbar:                                      │
│  • A5 hoch                                                  │
│  • A5 quer                                                  │
│  • A6 lang hoch                                             │
│  • A6 lang quer                                             │
│                                                              │
│  Die Vorschau wird aktualisiert...                          │
│                                                              │
│                         [OK]                                │
└─────────────────────────────────────────────────────────────┘
```

## Responsive Design

### Mobile Ansicht

```
┌─────────────────────┐
│ Vorlagenset wählen  │
│                 [X] │
├─────────────────────┤
│                     │
│ [Lokal] [Wiki]      │
│                     │
│ ┌─────────────────┐ │
│ │ ○ Church Flyers │ │
│ │   Default       │ │
│ │   v1.0 • 📁     │ │
│ ├─────────────────┤ │
│ │ ○ Weihnachts-  │ │
│ │   Special       │ │
│ │   v1.2 • 📁     │ │
│ └─────────────────┘ │
│                     │
│ [Laden] [Abbrechen] │
└─────────────────────┘
```

## Interaktionen

### Hover-Effekte
- Template-Item: Hintergrund wird leicht hervorgehoben
- Buttons: Farbwechsel und leichter Schatten

### Auswahl
- Radio-Button wird gefüllt
- Item erhält farbigen Rahmen
- Vorschau wird aktualisiert

### Drag & Drop (Optional)
```
┌─────────────────────────────────────────────────────────────┐
│  Vorlagenset auswählen                              [X]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │         📁 Ziehen Sie eine Template-Datei         │    │
│  │            hierher, um sie zu laden                │    │
│  │                                                     │    │
│  │              oder [Datei auswählen]                │    │
│  │                                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Unterstützte Formate: .json                                │
└─────────────────────────────────────────────────────────────┘
```

## Tastatur-Navigation

- `Tab` / `Shift+Tab`: Zwischen Elementen navigieren
- `↑` / `↓`: Durch Template-Liste navigieren
- `Enter`: Ausgewähltes Template laden
- `Esc`: Dialog schließen
- `Ctrl+F`: Suche in Templates (wenn viele vorhanden)

## Accessibility

- ARIA-Labels für alle interaktiven Elemente
- Fokus-Indikatoren
- Screen-Reader-freundliche Beschreibungen
- Tastatur-Navigation vollständig unterstützt
- Kontrastverhältnis WCAG AA konform
