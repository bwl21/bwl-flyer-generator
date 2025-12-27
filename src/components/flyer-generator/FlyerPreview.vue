<template>
  <div class="preview-container">
    <h4 class="preview-title">{{ config.name }}</h4>
    <div class="preview-wrapper" :style="wrapperStyle">
      <svg
        :viewBox="`0 0 ${config.width} ${config.height}`"
        :width="scaledWidth"
        :height="scaledHeight"
        class="preview-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Background -->
        <rect x="0" y="0" :width="config.width" :height="config.height" fill="#ffffff" />
        <rect
          x="0"
          y="0"
          :width="config.width"
          :height="config.height"
          fill="none"
          stroke="#e5e7eb"
          stroke-width="0.5"
        />

        <!-- Header background -->
        <rect x="0" y="0" :width="config.width" :height="headerHeight" fill="#1e40af" />

        <!-- Title -->
        <text
          :x="padding"
          :y="titleY"
          :font-size="titleFontSize"
          font-weight="bold"
          fill="#ffffff"
          font-family="Arial, sans-serif"
        >
          {{ truncate(data.title, titleMaxChars) }}
        </text>

        <!-- Date/Time -->
        <text
          :x="padding"
          :y="datetimeY"
          :font-size="subtitleFontSize"
          fill="#374151"
          font-family="Arial, sans-serif"
        >
          {{ truncate(data.datetime, subtitleMaxChars) }}
        </text>

        <!-- Location -->
        <text
          :x="padding"
          :y="locationY"
          :font-size="subtitleFontSize"
          fill="#374151"
          font-family="Arial, sans-serif"
        >
          {{ truncate(data.location, subtitleMaxChars) }}
        </text>

        <!-- Speaker -->
        <text
          :x="padding"
          :y="speakerY"
          :font-size="bodyFontSize"
          fill="#6b7280"
          font-family="Arial, sans-serif"
        >
          {{ truncate(data.speaker, bodyMaxChars) }}
        </text>

        <!-- Description (multi-line) -->
        <text
          v-for="(line, index) in descriptionLines"
          :key="index"
          :x="padding"
          :y="descY + index * lineHeight"
          :font-size="bodyFontSize"
          fill="#374151"
          font-family="Arial, sans-serif"
        >
          {{ line }}
        </text>

        <!-- QR Code placeholder -->
        <rect
          :x="qrX"
          :y="qrY"
          :width="qrSize"
          :height="qrSize"
          fill="#f3f4f6"
          stroke="#d1d5db"
          stroke-width="0.5"
        />
        <text
          :x="qrX + qrSize / 2"
          :y="qrY + qrSize / 2 + 2"
          :font-size="qrFontSize"
          fill="#9ca3af"
          text-anchor="middle"
          font-family="Arial, sans-serif"
        >
          QR
        </text>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FlyerData, LayoutConfig } from '../../types/flyer'

const props = defineProps<{
  data: FlyerData
  config: LayoutConfig
  scale?: number
}>()

const scale = computed(() => props.scale ?? 1.5)

// Convert mm to pixels (1mm = 3.7795275591 pixels at 96dpi)
const mmToPx = (mm: number): number => mm * 3.7795275591

// Scaled dimensions for display
const scaledWidth = computed(() => mmToPx(props.config.width) * scale.value)
const scaledHeight = computed(() => mmToPx(props.config.height) * scale.value)

const wrapperStyle = computed(() => ({
  width: `${scaledWidth.value}px`,
  height: `${scaledHeight.value}px`,
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
}))

// Layout calculations based on format
const isLandscape = computed(() => props.config.width > props.config.height)
const isNarrow = computed(() => props.config.width <= 110)

const padding = computed(() => (isNarrow.value ? 6 : 10))
const headerHeight = computed(() => (isNarrow.value ? 25 : isLandscape.value ? 35 : 40))

// Font sizes
const titleFontSize = computed(() => (isNarrow.value ? 8 : isLandscape.value ? 12 : 14))
const subtitleFontSize = computed(() => (isNarrow.value ? 5 : isLandscape.value ? 7 : 8))
const bodyFontSize = computed(() => (isNarrow.value ? 4 : isLandscape.value ? 6 : 7))
const qrFontSize = computed(() => (isNarrow.value ? 6 : 8))
const lineHeight = computed(() => bodyFontSize.value * 1.4)

// Y positions
const titleY = computed(() => headerHeight.value / 2 + titleFontSize.value / 3)
const datetimeY = computed(() => headerHeight.value + padding.value + subtitleFontSize.value)
const locationY = computed(() => datetimeY.value + subtitleFontSize.value * 1.5)
const speakerY = computed(() => locationY.value + subtitleFontSize.value * 1.5)
const descY = computed(() => speakerY.value + bodyFontSize.value * 2)

// QR code positioning
const qrSize = computed(() => (isNarrow.value ? 20 : isLandscape.value ? 30 : 35))
const qrX = computed(() => props.config.width - qrSize.value - padding.value)
const qrY = computed(() => props.config.height - qrSize.value - padding.value)

// Character limits based on layout
const titleMaxChars = computed(() => (isNarrow.value ? 15 : isLandscape.value ? 30 : 20))
const subtitleMaxChars = computed(() => (isNarrow.value ? 18 : isLandscape.value ? 35 : 25))
const bodyMaxChars = computed(() => (isNarrow.value ? 20 : isLandscape.value ? 45 : 30))

// Description line wrapping
const descriptionLines = computed(() => {
  const maxLines = isNarrow.value ? 6 : isLandscape.value ? 4 : 8
  const charsPerLine = bodyMaxChars.value
  const text = props.data.desc || ''
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= charsPerLine) {
      currentLine = (currentLine + ' ' + word).trim()
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
      if (lines.length >= maxLines - 1) break
    }
  }
  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine)
  }

  return lines
})

// Truncate helper
const truncate = (text: string, maxLength: number): string => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength - 1) + '…' : text
}
</script>

<style scoped>
.preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  margin: 0.5rem;
}

.preview-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  text-align: center;
}

.preview-wrapper {
  background: white;
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
  display: inline-flex;
  justify-content: center;
  align-items: center;
}

.preview-svg {
  display: block;
  background: white;
  max-width: 100%;
  height: auto;
}

/* Add a subtle border to the SVG for better visibility */
.preview-svg rect:first-of-type {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.05));
}
</style>
