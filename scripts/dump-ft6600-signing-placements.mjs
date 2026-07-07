import React from 'react'
globalThis.React = React

const { loadOfficialNswFt6600Template } = await import('../api/lib/documents/officialNswFt6600Fill.ts')
const { collectOfficialNswFt6600SigningPlacements, buildWidgetTagPlacements } = await import(
  '../api/lib/documents/officialNswFt6600Signing.ts'
)

const doc = await loadOfficialNswFt6600Template()
const widgets = collectOfficialNswFt6600SigningPlacements(doc, { includeCoTenantSignatureTags: false })
const placements = buildWidgetTagPlacements(widgets, false)

console.log('=== SIGNING PLACEMENTS (AcroForm-derived) ===')
for (const w of widgets) console.log(w)

console.log('\n=== TAG PLACEMENTS ===')
for (const p of placements) {
  console.log(p.fieldName, 'page', p.pageIndex, 'x', p.x.toFixed(1), 'y', p.y.toFixed(1), p.tag.slice(0, 60))
}
