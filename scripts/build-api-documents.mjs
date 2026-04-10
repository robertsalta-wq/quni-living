/**
 * Transpile React-PDF document modules to plain ESM .js under api/documents/
 * for Vercel Node (same rationale as api/documents/OccupancyAgreement.js).
 *
 * Sources live in src/lib/documents/ so api/ never has both foo.ts and foo.js
 * (Vercel rejects that basename collision for serverless routes).
 */
import esbuild from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const jobs = [
  {
    inFile: 'src/lib/documents/NswResidentialTenancyAgreement.tsx',
    outFile: 'api/documents/NswResidentialTenancyAgreement.js',
  },
  {
    inFile: 'src/lib/documents/QuniPlatformAddendum.tsx',
    outFile: 'api/documents/QuniPlatformAddendum.js',
  },
  {
    inFile: 'src/lib/documents/ft6600EmbeddedStrings.ts',
    outFile: 'api/documents/ft6600EmbeddedStrings.js',
  },
]

for (const { inFile, outFile } of jobs) {
  await esbuild.build({
    absWorkingDir: root,
    entryPoints: [inFile],
    outfile: outFile,
    /** Per-file transpile: bare imports stay external (Node resolves at runtime). */
    bundle: false,
    platform: 'node',
    format: 'esm',
    target: 'node18',
    jsx: 'automatic',
    logLevel: 'info',
  })
}

console.log('build-api-documents: wrote', jobs.length, 'ESM modules under api/documents/')
