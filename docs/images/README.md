# Documentation visuals

The main README shows the current dashboard application. `docs/operating-system.md` uses the
separate appliance images and installer screenshots.

## Dashboard screenshots

From `app/`, with the locked dependencies installed:

```sh
npm run build
npx playwright install chromium
npm run screenshots
```

The capture script starts its own loopback server with a temporary data directory and key.
It captures the actual editor, display preview, five themes, widget collection, phone editor,
and pairing dialog. The date is fixed, the agenda and weather are fictional, and the video tile
is the app's original illustration. The pairing dialog uses a fixed example code and expiry.
The three Home Assistant captures use explicit local response fixtures for connection status,
entity discovery, and a temperature reading. Their dashboard is labeled as a fictional preview;
the capture server never receives HA credentials or contacts an HA installation.
Every external browser request is blocked. The browser,
server, and temporary data are removed when capture finishes.

The four rich-widget captures use `/demo?home` and `/demo?home&cameras`. Calendar events, readings,
and histories are fictional, and the camera image is an original illustration. The real household
reference is not included in the repository. These previews make no HA or external-source requests.

The script writes seventeen PNGs into this directory. Review them after interface changes, then commit
the updated images alongside the relevant documentation. The screenshots contain no data from a
real installation. `NDASH_DOCS_PORT` selects another local port if the default, 3002, is busy.

`ndash-weather-sensor.png` and `ndash-second-location.png` are the editor captures from
`npm run test:browser -- weather-sensor.spec.ts`. That test uses a synthetic loopback HA server
and intercepts Open-Meteo requests with fictional responses. Copy the reviewed desktop captures
from `app/test-results/` into this directory after changing the weather selector. The same test
captures a phone view for review; neither view contains data from a real installation.

## Boot animation

`ndash-boot.webp`, at the top of the main README, shows the hero's TV powering on into the
NdashOS boot splash and then the demo dashboard with the status bar. From `app/`:

```sh
npm run build
npm run boot-animation
```

The script captures the demo dashboard's preview the way `npm run screenshots` does: its own
loopback server, a temporary data directory and key, a fixed date, and every external request
blocked. It then plays `src/boot.html` frame by frame. The scene reads the box's own splash
(`os/rootfs/usr/share/plymouth/themes/ndash/ndash.png`), status bar lockup and icons at render
time, lays the bar out as `os/install.sh` does on a 3840px screen with the example values of
`ndash-statusbar.png`, and fades the splash in over 0.6 seconds as the boot theme does. Run it
again after changing the dashboard, the splash or the status bar. It needs ImageMagick 7 and
libwebp's `img2webp`; `NDASH_BOOT_WIDTH` and `NDASH_BOOT_QUALITY` change the output width
(default 1200) and WebP quality (default 85).

## Diagrams

The two diagrams are Mermaid code blocks in the root `README.md`; GitHub renders them directly.
They describe the server/editor/display relationships and the distinction between drafts,
previews, and publication. Keep those blocks with the documentation they explain.

## Appliance images

`render.sh` builds the OS installation visuals from the HTML files in `src/` and screenshots
from the existing VM tools. Its header documents the inputs. These assets are separate from
the dashboard capture command and do not contact a real appliance.
