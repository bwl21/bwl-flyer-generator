<template>
  <div class="preview-container">
    <h4 class="preview-title">{{ config.name }}</h4>
    <div class="preview-wrapper">
      <div class="pages-container">
        <div 
          v-for="(page, index) in pages" 
          :key="index" 
          class="page-wrapper"
        >
          <div class="page-header">
            <span class="page-number">Seite {{ index + 1 }}</span>
            <button 
              class="view-fullscreen-btn"
              @click="openPdfViewer(index + 1)"
              title="In neuem Fenster öffnen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 3h6v6M14 10l6-6M9 21H3v-6M4 14l6 6"/>
              </svg>
            </button>
          </div>
          <canvas 
            :ref="el => { if (el) canvasRefs[index] = el as HTMLCanvasElement }" 
            class="preview-canvas"
          ></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import { generate } from '@pdfme/generator'
import { text, barcodes, rectangle, image } from '@pdfme/schemas'
import type { FlyerData, LayoutConfig } from '../../types/flyer'
import { getTemplate, flyerDataToInput } from '../../services/pdfme-templates'

const props = defineProps<{
  data: FlyerData | Record<string, string>
  config: LayoutConfig
}>()

const pages = ref<number[]>([])
const canvasRefs = ref<HTMLCanvasElement[]>([])
let pdfBlob: Blob | null = null

const plugins = {
  Text: text,
  QRCode: barcodes.qrcode,
  Rectangle: rectangle,
  Image: image,
}

const renderPreview = async () => {
  try {
    const template = getTemplate(props.config.id)
    if (!template) {
      console.error('Template not found:', props.config.id)
      return
    }
    
    const inputs = [flyerDataToInput(props.data)]
    if (!inputs[0]) {
      console.error('Failed to convert flyer data to input')
      return
    }

    // Generate PDF
    const pdf = await generate({
      template,
      inputs,
      plugins,
    })

    // Set PDF Blob for Fullscreen
    pdfBlob = new Blob([pdf], { type: 'application/pdf' })

    // Load PDF with PDF.js
    const pdfjsLib = (window as any).pdfjsLib
    if (!pdfjsLib) {
      console.error('PDF.js not loaded')
      return
    }

    const loadingTask = pdfjsLib.getDocument({ data: pdf })
    const pdfDoc = await loadingTask.promise

    // Update pages array to trigger re-render
    pages.value = Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1)

    // Wait for Vue to update the DOM
    await nextTick()

    // Render each page
    for (let i = 0; i < pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i + 1)
      const canvas = canvasRefs.value[i]
      if (!canvas) continue

      const context = canvas.getContext('2d')
      if (!context) continue

      // Calculate scale to fit width (280px)
      const viewport = page.getViewport({ scale: 1 })
      const scale = 280 / viewport.width
      const scaledViewport = page.getViewport({ scale })

      canvas.width = scaledViewport.width
      canvas.height = scaledViewport.height

      await page.render({
        canvasContext: context,
        viewport: scaledViewport,
      }).promise
    }
  } catch (error) {
    console.error('Failed to render preview:', error)
  }
}

const openPdfViewer = async (pageNumber: number = 1) => {
  if (!pdfBlob) {
    console.error('PDF not generated yet')
    return
  }

  const pdfUrl = URL.createObjectURL(pdfBlob)
  const width = 1000
  const height = 800
  const left = (window.screen.width - width) / 2
  const top = (window.screen.height - height) / 2

  // HTML für natives PDF-iframe
  const html = `<!DOCTYPE html><html><head><title>PDF Vorschau</title><style>body,html{margin:0;padding:0;height:100%;width:100%;overflow:hidden;}iframe{border:none;width:100vw;height:100vh;}</style></head><body><iframe src='${pdfUrl}' allow='fullscreen'></iframe></body></html>`
  const win = window.open('', 'pdfNative', `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`)
  if (win) {
    win.document.write(html)
    win.document.close()
  } else {
    window.location.href = pdfUrl
  }
}

// Initialize on mount
onMounted(() => {
  renderPreview()
})

// Update when data changes
watch(
  () => [props.data, props.config.id],
  () => {
    renderPreview()
  },
  { deep: true }
)
</script>

<style scoped>
.preview-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 300px;
  flex-shrink: 0;
}

.preview-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  text-align: center;
}

.preview-wrapper {
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  overflow: auto;
  background: #f9fafb;
  max-height: 80vh;
  padding: 1rem;
  display: flex;
  justify-content: center;
}

.pages-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  max-width: 300px;
}

.page-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0 0.25rem;
}

.view-fullscreen-btn {
  background: none;
  border: none;
  color: #4b5563;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.view-fullscreen-btn:hover {
  color: #1f2937;
  background-color: #e5e7eb;
}

.view-fullscreen-btn svg {
  width: 16px;
  height: 16px;
}

.page-number {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
}

.preview-canvas {
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  display: block;
  max-width: 100%;
  height: auto;
}
</style>
