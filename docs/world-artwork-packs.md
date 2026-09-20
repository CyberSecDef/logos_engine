# World-local artwork packs

A world can now activate its own versioned PNG replacements for the six installed
terrain slots: `ocean`, `city`, `alpine`, `forest`, `meadow`, and `dry`. Unspecified
slots retain the built-in painterly images. Appearance rules keep choosing those
slot IDs, so custom world properties can select imported artwork too.

This is the first part of the agreed world-local/layered artwork milestone.
Settlement/condition composition is still in progress; a replacement image does
not create settlement mechanics or a separate visual layer.

## Create and import a pack

Put your PNGs beside a source manifest such as:

```json
{
  "id": "enchanted-forest",
  "version": 1,
  "label": "Enchanted forest",
  "credit": "Artwork by its author; record its source and license here.",
  "images": [
    {"slot": "forest", "file": "enchanted-forest.png"}
  ]
}
```

Build the import file locally:

```sh
npm run artwork:pack -- /path/to/source-manifest.json /path/to/enchanted-forest.pack.json
```

The helper reads image paths relative to the source manifest, validates the images,
computes their SHA-256 hashes, and creates a self-contained JSON pack. It refuses
to overwrite an existing output file. The output contains the PNG bytes unchanged.
The source manifest's file paths are not imported into the world.

Open **Worlds → World artwork → Import artwork pack**, select that JSON file,
and review the image thumbnails, slots, credit, label and version. **Activate
artwork** saves the images and applies the pinned manifest. Cancel/preview does
not save images or change the world. **Review built-in artwork** restores the
original pack while retaining imported images for history/checkpoints.

## Limits and behavior

- At most six unique terrain slots per pack; a single image may fill multiple slots.
- Non-animated, non-interlaced 8-bit PNGs; dimensions 1–2048 in each axis.
- Each image at most 8 MiB; import JSON at most 32 MiB, including base64 overhead.
- Signatures, headers, chunk checksums, references, compressed output size and
  scanline filters are validated. SVGs, external image URLs and scripts are not accepted.
- Pack ID/version contents are immutable within a world's retained proposal history.
  Change the version when changing its label, credit or image references.
- Imported transparent pixels show the tile's fallback color. Multi-layer blending
  is a later part of this same Phase 4 item.

Activation is cosmetic. It does not advance time, change terrain physics, or reveal
all textures immediately. Birth stays color-only; the 1,000-day reveal schedule and
tile-action reveals continue. Pack activation/reset itself is not a tile action.
Thematic overlays and Colors only retain their existing behavior.

The atlas stays bounded at 2048×1024. World switching discards obsolete asynchronous
image results, and failed/missing image loads leave the relevant tiles colored.
Images are served through the authenticated local API for the active world. No
model or image-generation service is called to render, import or switch packs.

## Persistence and model interface

The pinned manifest lives at `world.artwork`; immutable image bytes live under
`worlds/<id>/assets/<sha256>.png`. Checkpoints and replay records retain the manifest.
Checkpoint and historical branches copy the images referenced by their current
manifest and accepted artwork history. Images are not automatically deleted when
a pack is reset or a checkpoint is restored.

The model may use `artwork-activate` only to select an exact previously imported
manifest exposed in its context, or `artwork-reset` to use built-in artwork.
Both require Entire world scope. Image creation/upload is a separate user-reviewed
workflow, not a model filesystem capability. Model Apply also checks referenced
images are available. Game ticks do not depend on decoding images.

Current state-only world exports include manifest references but **do not yet
bundle image bytes**. Back up the whole world directory to preserve its artwork.
Complete portable bundles are the next agreed Phase 4 item. Older engine builds
without the artwork contract cannot load worlds containing these manifests/operations.
