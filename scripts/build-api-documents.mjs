/**
 * Transpile React-PDF document modules to plain ESM .js for Vercel Node
 * (same rationale as api/documents/OccupancyAgreement.js).
 */
import esbuild from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const entryPoints = [
  'api/documents/NswResidentialTenancyAgreement.tsx',
  'api/documents/QuniPlatformAddendum.tsx',
  'api/documents/ft6600EmbeddedStrings.ts',
]

await esbuild.build({
  absWorkingDir: root,
  entryPoints,
  outdir: 'api/documents',
  outbase: 'api/documents',
  /** Per-file transpile only: imports stay `from "react"`, `from "@react-pdf/renderer"`, etc. (Node resolves at runtime). */
  bundle: false,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  jsx: 'automatic',
  logLevel: 'info',
})

console.log('build-api-documents: wrote', entryPoints.length, 'ESM modules under api/documents/')
