import { copyFile, mkdir } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const distribution = dirname(require.resolve("maplibre-gl/dist/maplibre-gl-worker.mjs"))
const destination = fileURLToPath(new URL("../public/vendor/maplibre/", import.meta.url))

// Next's asset loader does not emit the worker's relative shared-module import.
// Keep both files together and in sync with the installed MapLibre version.
await mkdir(destination, { recursive: true })
await Promise.all(["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"].map((file) =>
  copyFile(join(distribution, file), join(destination, file))
))
