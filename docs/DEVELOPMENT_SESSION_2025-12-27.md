# Development Session 2025-12-27

## Session Overview

Fixed critical issues with PDF generation and preview rendering, ensuring pixel-perfect match between preview and generated PDFs.

## Problems Identified

### 1. PDFme Plugin Error
**Error:** `[@pdfme/common] Invalid argument: plugins.rect.propPanel`

**Root Cause:** Custom `rect` plugin was missing required `propPanel` property.

**Solution:** Replaced custom plugin with PDFme's built-in `rectangle` plugin.

### 2. Preview-PDF Mismatch
**Problem:** Generated PDFs looked completely different from the browser preview.

**Root Causes:**
- Preview used custom SVG rendering (separate system)
- PDFme templates had incorrect coordinate system
- `basePdf` was converted to points, but PDFme expects millimeters

**Key Discovery:** PDFme uses **millimeters for everything** (basePdf, schemas, positions, sizes).

### 3. Growing Preview Canvas
**Problem:** Preview canvases started small and continuously grew larger.

**Root Cause:** 
- PDFme's Viewer/Form components respond to resize events
- Auto-update on every keystroke triggered re-rendering

**Solution:** 
- Generate PDF with PDFme Generator
- Render PDF to static canvas using PDF.js
- Only update on button click, not on every input change

## Technical Changes

### Template Coordinate System

**Before (Incorrect):**
```typescript
basePdf: {
  width: mmToPt(148),  // ❌ Converted to points
  height: mmToPt(210),
}
schemas: [{
  position: { x: 10, y: 10 },  // In mm
  width: 100,
  height: 20,
}]
```

**After (Correct):**
```typescript
basePdf: {
  width: 148,  // ✅ In millimeters
  height: 210,
}
schemas: [{
  position: { x: 10, y: 10 },  // In mm
  width: 100,
  height: 20,
}]
```

### Plugin Configuration

**Before (Custom Plugin):**
```typescript
const plugins = {
  rect: {
    pdf: (arg) => { /* custom rendering */ },
    propPanel: { /* manual config */ },
    ui: () => {},
  },
}
```

**After (Built-in Plugin):**
```typescript
import { rectangle } from '@pdfme/schemas'

const plugins = {
  Rectangle: rectangle,  // ✅ Built-in, handles everything
}
```

### Preview Architecture

**Before (Two Systems):**
```
Preview: Custom SVG → Manual calculations
PDF: PDFme Generator → Different rendering
❌ Can diverge
```

**After (Single System):**
```
Preview: PDFme Generator → PDF → PDF.js → Canvas
PDF: PDFme Generator → PDF
✅ Guaranteed identical
```

## Files Modified

### Core Changes
- `src/services/pdfme-templates.ts` - Fixed coordinate system (removed mmToPt conversions)
- `src/services/pdf-generator.ts` - Replaced custom rect plugin with built-in rectangle
- `src/components/flyer-generator/FlyerPreviewPdfme.vue` - New preview component using PDF.js
- `src/components/flyer-generator/FlyerGenerator.vue` - Updated to use new preview, removed auto-update
- `src/components/admin/TemplateAdmin.vue` - Added more built-in plugins (rectangle, image, line)
- `index.html` - Added PDF.js library

### Backup
- `src/components/flyer-generator/FlyerPreview.vue.backup` - Old SVG preview (kept for reference)

## Key Learnings

### PDFme Coordinate System
1. **Everything in millimeters** - basePdf, schemas, positions, sizes
2. **No conversion needed** - PDFme handles mm→points internally
3. **Custom plugins must handle conversion** - if creating custom plugins, convert mm→pt in the pdf() function

### PDFme Plugins
1. **Check built-in plugins first** - Many common shapes already exist
2. **Available plugins:** text, image, rectangle, ellipse, line, table, barcodes, etc.
3. **Custom plugins need:** pdf(), ui(), propPanel with schema and defaultSchema

### Preview Strategy
1. **Viewer** - For multi-page PDFs, includes navigation
2. **Form** - For single-page editable forms, more compact
3. **Generator + PDF.js** - For static preview, guaranteed match with PDF output

### Performance
1. **Debounce updates** - Don't regenerate on every keystroke
2. **Manual trigger** - User clicks "Update Preview" button
3. **Static canvas** - No resize observers, no growing canvases

## Testing Results

✅ Preview matches PDF exactly
✅ No coordinate system issues
✅ Stable canvas size
✅ All 4 layouts render correctly (A5 portrait/landscape, A6 long portrait/landscape)
✅ Templates editable in Designer
✅ PDF generation works

## Future Considerations

### Potential Improvements
1. **Live preview option** - Toggle between manual/auto update
2. **Preview zoom controls** - Allow users to zoom in/out
3. **Side-by-side comparison** - Show preview and PDF together
4. **Template validation** - Check templates before saving

### Known Limitations
1. **PDF.js dependency** - Requires external CDN (could bundle locally)
2. **Initial render delay** - PDF generation takes ~200-500ms
3. **No real-time editing** - Must click button to update preview

## References

- [PDFme Documentation](https://pdfme.com/docs/getting-started)
- [PDFme Template Format](https://pdfme.com/docs/getting-started#template)
- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [PDFme Built-in Schemas](https://pdfme.com/docs/supported-features)

## Session Statistics

- **Duration:** ~2 hours
- **Issues Fixed:** 3 major issues
- **Files Modified:** 7 files
- **Lines Changed:** ~200 lines
- **Build Status:** ✅ Successful
