/**
 * Apt packages installed inside the pinned LO Docker container (never on GHA host).
 */

export const VIC_FORM1_CONTAINER_APT_PACKAGES = [
  'libnss3',
  'libnspr4',
  'libxslt1.1',
  'libxml2',
  'libfontconfig1',
  'libcups2',
  'libdbus-1-3',
  'libglib2.0-0',
  'libxinerama1',
  'libsm6',
  'libice6',
  'libxext6',
  'libxrender1',
  'libx11-6',
  'libxcb1',
  'libgl1',
  'poppler-utils',
  'fonts-liberation',
  'fonts-noto-core',
  'fonts-noto-cjk',
]

/** dpkg names recorded in provenance after install. */
export const VIC_FORM1_FONT_PACKAGE_NAMES = ['fonts-liberation', 'fonts-noto-core', 'fonts-noto-cjk']

/**
 * @param {string} bodyScript bash lines run after apt + fc-cache
 */
export function dockerContainerSetupScript(bodyScript) {
  return [
    'set -e',
    'export DEBIAN_FRONTEND=noninteractive',
    'apt-get update -qq >/dev/null 2>&1',
    `apt-get install -y -qq ${VIC_FORM1_CONTAINER_APT_PACKAGES.join(' ')} >/dev/null 2>&1`,
    'fc-cache -f >/dev/null 2>&1 || true',
    bodyScript,
  ].join('\n')
}

/**
 * @param {string} stdout from dpkg-query inside container
 */
export function parseDpkgVersionLines(stdout) {
  /** @type {Record<string, string>} */
  const versions = {}
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const tab = trimmed.indexOf('\t')
    if (tab < 0) continue
    versions[trimmed.slice(0, tab)] = trimmed.slice(tab + 1)
  }
  return versions
}

/**
 * @param {string} imageRef
 * @param {(imageRef: string, args: string[]) => { stdout: string, stderr: string }} runDocker
 */
export function queryFontPackageVersionsDocker(imageRef, runDocker) {
  const dpkgLine =
    "dpkg-query -W -f='${Package}\\t${Version}\\n' " +
    `${VIC_FORM1_FONT_PACKAGE_NAMES.join(' ')} 2>/dev/null || true`
  const inner = dockerContainerSetupScript(dpkgLine)
  const { stdout } = runDocker(imageRef, ['bash', '-lc', inner])
  return parseDpkgVersionLines(stdout)
}
