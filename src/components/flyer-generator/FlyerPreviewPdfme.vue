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
          <div class="page-number">Seite {{ index + 1 }}</div>
          <canvas :ref="el => { if (el) canvasRefs[index] = el as HTMLCanvasElement }" 
                 class="preview-canvas">
          </canvas>
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

// Initialize on mount
onMounted(() => {
  renderPreview()
})

// Update when data changes (triggered by "Vorschau aktualisieren" button)
watch(
  () => props.data,
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
