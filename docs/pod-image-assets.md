# POD image assets

These images were generated with the built-in image generation tool for the local POD fixtures, not sourced from actual deliveries. Production integration must replace the fixture adapter in `src/features/live-dashboard/pod-demo-data.ts` with authorized POD records. The UI intentionally does not display a demo-data label.

Saved files:

- `public/assets/live-dashboard/pod/parcel-label.png`
- `public/assets/live-dashboard/pod/doorstep.png`
- `public/assets/live-dashboard/pod/parcel-side.png`

## Exact prompt set

Each prompt uses this prefix:

> Use case: photorealistic-natural. Asset type: local proof-of-delivery photo for a logistics interface prototype.

Scene text, in the file order above:

1. Close-up from above of a plain sealed cardboard parcel on a concrete doorstep, white shipping sticker with only abstract illegible barcode lines, no names or addresses.
2. Wider view of a plain sealed cardboard parcel beside a dark green apartment door on a small stone doorstep, no people, no house number.
3. Side view of a plain sealed cardboard parcel on a residential entryway floor beside the doorframe, focus on intact packaging and clear surrounding environment.

Each prompt ends with:

> Natural daylight, candid handheld courier smartphone photo, portrait composition 3:4, realistic unstyled textures. Single photograph only, no UI, no collage, no branding, no readable personal information.
