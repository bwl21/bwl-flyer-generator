# Template Loading - Zusammenfassung

## Übersicht

Konzept für das Laden von Vorlagen aus externen Dateien mit gemeinsamen Komponenten.

## Dokumentation

1. **[TEMPLATE_LOADING_CONCEPT.md](./TEMPLATE_LOADING_CONCEPT.md)**
   - Gesamtkonzept und Architektur
   - Template-Datei-Format
   - Implementierungs-Phasen
   - Vorteile und offene Fragen

2. **[MAIN_TEMPLATE_SYNC_CONCEPT.md](./MAIN_TEMPLATE_SYNC_CONCEPT.md)** ⭐ **EMPFOHLEN**
   - Main Template als Referenz
   - Sync-Funktionen für gemeinsame Properties
   - Bleibt bei Standard PDFme-Format
   - Designer voll nutzbar

3. **[UI_MOCKUP_TEMPLATE_SELECTOR.md](./UI_MOCKUP_TEMPLATE_SELECTOR.md)**
   - UI-Mockups für Template-Auswahl
   - Verschiedene Zustände (Laden, Fehler, Erfolg)
   - Responsive Design
   - Accessibility-Features

4. **[WIKI_INTEGRATION_PLAN.md](./WIKI_INTEGRATION_PLAN.md)**
   - ChurchTools Wiki-Integration
   - API-Endpoints und Beispiele
   - Offline-Strategie und Caching
   - Rollout-Plan und Testing

### Archiviert (Alternative Ansätze)

5. **[SHARED_FIELDS_CONCEPT.md](./SHARED_FIELDS_CONCEPT.md)** 
   - Custom Format mit `$field`-Referenzen
   - Verworfen: Zu komplex, Custom-Syntax

6. **[DESIGNER_INTEGRATION.md](./DESIGNER_INTEGRATION.md)**
   - Bidirektionale Konvertierung
   - Verworfen: Zu aufwändig, Verlust von Informationen

7. **[TEMPLATE_FORMAT_OPTIMIZED.json](./TEMPLATE_FORMAT_OPTIMIZED.json)**
   - Custom Format Beispiel
   - Verworfen: Nicht kompatibel mit PDFme

8. **[TEMPLATE_FORMAT_EXAMPLE.json](./TEMPLATE_FORMAT_EXAMPLE.json)**
   - Custom Format mit $ref
   - Verworfen: Zu komplex

## Kern-Features

### Phase 1: Asset-basiertes Laden (Sofort umsetzbar)

```
public/templates/
  ├── default-church-flyers.json
  ├── christmas-special.json
  └── modern-minimal.json
```

**Features:**
- ✅ Templates aus JSON-Dateien laden
- ✅ Gemeinsame Elemente (Farben, Schriften) nur einmal definieren
- ✅ Variable-Syntax: `{{colors.primary}}`
- ✅ UI zur Auswahl verfügbarer Templates
- ✅ Vorschau der enthaltenen Layouts

### Phase 2: Wiki-Integration (Später)

**Features:**
- ✅ Templates aus ChurchTools Wiki laden
- ✅ Zentrale Verwaltung für alle Gemeinde-Mitglieder
- ✅ Offline-Caching für Zuverlässigkeit
- ✅ Auto-Sync bei Updates
- ✅ Berechtigungen über ChurchTools

## Template-Format

### Main Template + Sync (⭐ Empfohlen)

Bleibt beim **Standard PDFme-Format** + Sync-Funktionen

```json
{
  "version": "1.0",
  "name": "Church Flyers Default",
  "mainTemplate": "a5-portrait",
  "templates": {
    "a5-portrait": {
      "name": "A5 hoch",
      "basePdf": { "width": 148, "height": 210, "padding": [0, 0, 0, 0] },
      "schemas": [[
        {
          "type": "text",
          "name": "title",
          "position": { "x": 10, "y": 23 },
          "width": 128,
          "height": 20,
          "fontSize": 14,
          "fontColor": "#ffffff",
          "alignment": "left"
        }
      ]]
    },
    "a5-landscape": {
      "name": "A5 quer",
      "basePdf": { "width": 210, "height": 148, "padding": [0, 0, 0, 0] },
      "schemas": [[
        {
          "type": "text",
          "name": "title",
          "position": { "x": 10, "y": 19.5 },
          "width": 190,
          "height": 18,
          "fontSize": 12,
          "fontColor": "#ffffff",
          "alignment": "left"
        }
      ]]
    }
  }
}
```

### Sync-Workflow

1. **Main Template bearbeiten** (z.B. Farbe ändern)
2. **Sync-Funktion aufrufen**
   ```typescript
   syncService.syncFromMain(templateSet, {
     properties: ['fontColor', 'color', 'alignment']
   })
   ```
3. **Gemeinsame Properties werden synchronisiert**
   - `fontColor`, `color`, `alignment`, `type`, `name`
4. **Template-spezifische Properties bleiben**
   - `position`, `width`, `height`, `fontSize`

### Vorteile

- ✅ **Standard PDFme-Format** - keine Custom-Syntax
- ✅ **Designer voll nutzbar** - keine Konvertierung
- ✅ **Teilnahme an Weiterentwicklung** - kompatibel mit PDFme Updates
- ✅ **Flexibel** - wähle was synchronisiert wird
- ✅ **Transparent** - sehe Unterschiede vor Sync

## UI-Flow

```
1. Benutzer öffnet Anwendung
   └─> Zeigt aktuelles Template-Set

2. Benutzer klickt "Vorlagen wechseln"
   └─> Modal öffnet sich
       ├─> Tab: Lokale Vorlagen
       │   └─> Liste aus public/templates/
       └─> Tab: Wiki-Vorlagen (später)
           └─> Liste aus ChurchTools Wiki

3. Benutzer wählt Template-Set
   └─> Vorschau der enthaltenen Layouts
   └─> Klick auf "Laden"
       └─> Templates werden geladen
       └─> Variablen werden aufgelöst
       └─> Vorschau wird aktualisiert
       └─> Modal schließt sich
```

## Implementierungs-Reihenfolge

### Schritt 1: Template-Format definieren (✅ Erledigt)
- JSON-Schema festgelegt
- Beispiel-Datei erstellt
- Variable-Syntax definiert

### Schritt 2: Asset-Loader (Nächster Schritt)
- [ ] `TemplateLoader` Service erstellen
- [ ] Bestehende Templates nach JSON exportieren
- [ ] Variable-Resolver implementieren
- [ ] Validierung

### Schritt 3: UI-Komponenten
- [ ] `TemplateSelectorModal` Komponente
- [ ] `AssetTemplateList` Komponente
- [ ] Integration in `FlyerGenerator`
- [ ] Loading/Error States

### Schritt 4: Testing
- [ ] Unit Tests für Loader
- [ ] Integration Tests
- [ ] Manuelle Tests mit verschiedenen Templates

### Schritt 5: Wiki-Integration (Später)
- [ ] `WikiTemplateLoader` Service
- [ ] `WikiTemplateList` Komponente
- [ ] Offline-Caching
- [ ] Auto-Sync

## Vorteile

### Für Entwickler
- ✅ Keine Template-Logik im Code
- ✅ Einfachere Wartung
- ✅ Testbare Struktur
- ✅ Klare Trennung: Code vs. Daten

### Für Benutzer
- ✅ Templates ohne Code-Änderung aktualisieren
- ✅ Mehrere Template-Sets parallel nutzen
- ✅ Einfacher Austausch zwischen Gemeinden
- ✅ Zentrale Verwaltung im Wiki (später)

### Für Gemeinden
- ✅ Eigene Vorlagen erstellen
- ✅ Branding anpassen (Farben, Schriften)
- ✅ Saisonale Vorlagen (Weihnachten, Ostern)
- ✅ Gemeinde-übergreifender Austausch

## Entscheidungen

### ✅ Template-Format: Standard PDFme + Main Template Sync
- Bleibt bei PDFme-Format (keine Custom-Syntax)
- Main Template als Referenz
- Sync-Funktionen für gemeinsame Properties
- Designer voll nutzbar

### ✅ Persistierung: Ein JSON-File pro Set
- `public/templates/default-church-flyers.json`
- Git-freundlich (lesbare Diffs)
- Einfach zu implementieren
- Ausreichend für 4 Templates pro Set
- ZIP nicht benötigt

## Implementierungs-Status

### ✅ Phase 1: Basis-Implementierung (Abgeschlossen)

1. ✅ **TemplateSyncService** (`src/services/template-sync.ts`)
   - `syncFromMain()` - Sync gemeinsame Properties
   - `getDiff()` - Zeige Unterschiede
   - `validate()` - Prüfe Konsistenz
   - `syncColors()` - Sync nur Farben
   - `syncField()` - Sync einzelnes Feld

2. ✅ **TemplateLoader** (`src/services/template-loader.ts`)
   - Lade JSON-Files aus `public/templates/`
   - Liste verfügbare Template-Sets
   - Validierung der Template-Struktur
   - Export als JSON

3. ✅ **UI-Komponenten**
   - `TemplateSelectorModal.vue` - Template-Auswahl-Dialog
   - Integration in `FlyerGenerator.vue`

4. ✅ **Migration**
   - Bestehende Templates nach JSON exportiert
   - `public/templates/default-church-flyers.json` erstellt

### 🚧 Phase 2: Erweiterte Features (TODO)

5. [ ] **Sync-UI in TemplateAdmin**
   - Diff-Anzeige zwischen Templates
   - Selektive Sync-Optionen
   - Validierungs-Anzeige

6. [ ] **Testing**
   - Unit Tests für Sync-Service
   - Integration Tests
   - E2E Tests

7. [ ] **Dokumentation**
   - Benutzer-Anleitung
   - Template-Erstellung-Guide
   - API-Dokumentation

### 📋 Nächste Schritte

1. Teste Template-Auswahl im Browser
2. Implementiere Sync-UI in TemplateAdmin
3. Schreibe Unit Tests
4. Erstelle Benutzer-Dokumentation

## Offene Fragen

1. **Template-Format:** Einfache Variante ausreichend oder erweiterte Features ($ref) gewünscht?
2. **Validierung:** Wie streng? Fehlerbehandlung?
3. **Fallback:** Was passiert, wenn keine Templates geladen werden können?
4. **Migration:** Bestehende Templates automatisch konvertieren oder manuell?
5. **Versionierung:** Wie mit inkompatiblen Änderungen umgehen?

## Zeitschätzung

### Phase 1: Asset-basiertes Laden
- Template-Loader Service: 4h
- UI-Komponenten: 6h
- Testing: 2h
- **Gesamt: ~1.5 Tage**

### Phase 2: Wiki-Integration
- Wiki-Loader Service: 6h
- Offline-Caching: 4h
- UI-Integration: 4h
- Testing: 2h
- **Gesamt: ~2 Tage**

## Risiken & Mitigation

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Template-Format zu komplex | Mittel | Hoch | Einfache Variante starten |
| Wiki-API-Änderungen | Niedrig | Mittel | Versionierung, Tests |
| Performance-Probleme | Niedrig | Mittel | Caching, Lazy Loading |
| Benutzer-Fehler bei JSON | Hoch | Niedrig | Validierung, Hilfe-Texte |

## Erfolgs-Kriterien

- ✅ Templates können ohne Code-Änderung geladen werden
- ✅ Gemeinsame Elemente sind nur einmal definiert
- ✅ UI ist intuitiv und selbsterklärend
- ✅ Offline-Modus funktioniert zuverlässig
- ✅ Performance ist akzeptabel (<1s Ladezeit)
