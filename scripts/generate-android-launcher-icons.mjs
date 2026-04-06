/**
 * Generate Android launcher PNGs from a 1024×1024 master.
 *
 * Place your artwork at (default):
 *   android/app-icon-source/quni-launcher-master-1024.png
 *
 * Recommended masters:
 * - Master: full square icon (coral background + white “Q”) for legacy ic_launcher / ic_launcher_round.
 * - Optional second file for adaptive foreground (transparent background, white Q only):
 *   android/app-icon-source/quni-launcher-foreground-1024.png
 *   Pass with: node scripts/generate-android-launcher-icons.mjs --foreground android/app-icon-source/quni-launcher-foreground-1024.png
 *
 * Adaptive background colour is android/app/src/main/res/values/ic_launcher_background.xml (#E8705A).
 *
 * Legacy ic_launcher / ic_launcher_round: master is scaled into the centre 44% of the output
 * (28% inset on each side) to reduce OEM mask clipping; pad colour matches ic_launcher_background.
 *
 * Alternative: Android Studio → res → New → Image Asset → Launcher Icons (Adaptive and Legacy).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const LEGACY_SIZES = [
  { folder: "mipmap-mdpi", px: 48 },
  { folder: "mipmap-hdpi", px: 72 },
  { folder: "mipmap-xhdpi", px: 96 },
  { folder: "mipmap-xxhdpi", px: 144 },
  { folder: "mipmap-xxxhdpi", px: 192 },
];

/** Adaptive foreground layer (Google’s mipmap sizes in px). */
const FOREGROUND_SIZES = [
  { folder: "mipmap-mdpi", px: 108 },
  { folder: "mipmap-hdpi", px: 162 },
  { folder: "mipmap-xhdpi", px: 216 },
  { folder: "mipmap-xxhdpi", px: 324 },
  { folder: "mipmap-xxxhdpi", px: 432 },
];

const DEFAULT_MASTER = path.join(
  repoRoot,
  "android",
  "app-icon-source",
  "quni-launcher-master-1024.png",
);

const DEFAULT_FOREGROUND = path.join(
  repoRoot,
  "android",
  "app-icon-source",
  "quni-launcher-foreground-1024.png",
);

/** Matches android/app/src/main/res/values/ic_launcher_background.xml */
const LEGACY_PAD_RGBA = { r: 232, g: 112, b: 90, alpha: 1 };

/** Fraction of canvas used as padding on each side (content uses middle 1 − 2× this). */
const LEGACY_PAD_FRACTION = 0.28;

/**
 * Legacy launcher output: content uses 44% of px (28% margin each side).
 */
function pipelineLegacyLauncher(sharpMod, input, px) {
  const pad = Math.round(px * LEGACY_PAD_FRACTION);
  const inner = px - 2 * pad;
  return sharpMod(input)
    .resize(inner, inner, {
      fit: "contain",
      background: LEGACY_PAD_RGBA,
    })
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: LEGACY_PAD_RGBA,
    })
    .png();
}

function parseArgs(argv) {
  let master = DEFAULT_MASTER;
  let foreground = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--master" && argv[i + 1]) {
      master = path.resolve(process.cwd(), argv[++i]);
    } else if (argv[i] === "--foreground" && argv[i + 1]) {
      foreground = path.resolve(process.cwd(), argv[++i]);
    }
  }
  return { master, foreground };
}

async function main() {
  const { master, foreground } = parseArgs(process.argv);

  if (!fs.existsSync(master)) {
    console.error(`Missing master PNG:\n  ${master}\n\nCreate a 1024×1024 PNG at that path, then run again.`);
    process.exit(1);
  }

  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error('Install sharp: npm install (devDependency "sharp" should be in package.json)');
    process.exit(1);
  }

  const resDir = path.join(repoRoot, "android", "app", "src", "main", "res");
  const fgSource =
    foreground && fs.existsSync(foreground)
      ? foreground
      : fs.existsSync(DEFAULT_FOREGROUND)
        ? DEFAULT_FOREGROUND
        : master;

  if (fgSource === master && !foreground && !fs.existsSync(DEFAULT_FOREGROUND)) {
    console.warn(
      "Using the composite master for adaptive foreground PNGs.\n" +
        "For a cleaner adaptive icon, add a transparent Q-only PNG at:\n" +
        `  ${DEFAULT_FOREGROUND}\n`,
    );
  }

  const masterBuf = await fs.promises.readFile(master);
  const fgBuf = await fs.promises.readFile(fgSource);

  for (const { folder, px } of LEGACY_SIZES) {
    const dir = path.join(resDir, folder);
    await fs.promises.mkdir(dir, { recursive: true });
    await pipelineLegacyLauncher(sharp, masterBuf, px).toFile(
      path.join(dir, "ic_launcher.png"),
    );
    await pipelineLegacyLauncher(sharp, masterBuf, px).toFile(
      path.join(dir, "ic_launcher_round.png"),
    );
  }

  for (const { folder, px } of FOREGROUND_SIZES) {
    const dir = path.join(resDir, folder);
    await fs.promises.mkdir(dir, { recursive: true });
    await sharp(fgBuf)
      .resize(px, px, { fit: "fill" })
      .png()
      .toFile(path.join(dir, "ic_launcher_foreground.png"));
  }

  console.log("Wrote launcher icons to android/app/src/main/res/mipmap-*");
  console.log(`  legacy: ${master}`);
  console.log(`  foreground: ${fgSource}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
