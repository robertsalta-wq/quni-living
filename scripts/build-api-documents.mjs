/**
 * Transpile React-PDF document modules to plain ESM .js under api/documents/
 * for Vercel Node (same rationale as api/documents/OccupancyAgreement.js).
 *
 * Sources live in src/lib/documents/ so api/ never has both foo.ts and foo.js
 * (Vercel rejects that basename collision for serverless routes).
 *
 * NSW RTA + Platform Addendum are **bundled** (theme + FT6600 strings inlined) so production
 * never depends on sibling files like quniDocumentPdfTheme.js — those were easy to omit from git
 * or from Vercel's serverless file trace, causing ERR_MODULE_NOT_FOUND at render time.
 */
import esbuild from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const reactPdfExternals = ['react', 'react/jsx-runtime', '@react-pdf/renderer']

const bundleJobs = [
  {
    inFile: 'src/lib/documents/NswResidentialTenancyAgreement.tsx',
    outFile: 'api/documents/NswResidentialTenancyAgreement.js',
  },
  {
    inFile: 'src/lib/documents/QuniPlatformAddendum.tsx',
    outFile: 'api/documents/QuniPlatformAddendum.js',
  },
]

for (const { inFile, outFile } of bundleJobs) {
  await esbuild.build({
    absWorkingDir: root,
    entryPoints: [inFile],
    outfile: outFile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node18',
    jsx: 'automatic',
    logLevel: 'info',
    external: reactPdfExternals,
  })
}

console.log('build-api-documents: wrote', bundleJobs.length, 'bundled ESM modules under api/documents/')
