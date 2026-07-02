# Haru Client

Haru Client is a browser-based node configurator with Web Serial support,
preset loading, live serial logs, map tools, and full manual settings control.
It is designed so you can connect straight to a node from the browser, apply a
known preset in bulk, and still fine-tune everything else before saving.

## Features

- Web Serial connection flow with direct browser-to-node access
- Bulk preset loading for repeatable device setups
- Full manual configuration pages for radio, device, and modules
- Live serial log viewer with ANSI color support
- Map, nodes, and message views for normal day-to-day use
- GitHub Pages deployment flow for easy external testing

## Project Layout

- `apps/web` contains the Haru Client web app
- `packages` contains shared SDK, transport, and protobuf packages used by the app
- `legacy-static` keeps the earlier static prototype for reference

## Run Locally

1. Enable `pnpm` through Corepack if needed:

   ```powershell
   corepack enable
   ```

2. Install dependencies:

   ```powershell
   pnpm install
   ```

3. Start the app:

   ```powershell
   pnpm --filter haru-client-web dev
   ```

4. Open the browser app, connect your node over Web Serial, and use the
   `Presets` action or the normal config pages as needed.

## GitHub Pages Test Build

1. Push your work to GitHub.
2. In the repo, open `Settings` -> `Pages`.
3. Set `Source` to `GitHub Actions`.
4. Push to `main` or manually run the `Deploy GitHub Pages` workflow.
5. After the workflow finishes, GitHub will publish the site at:

   `https://<your-github-user>.github.io/<repo-name>/`

The Pages build is already configured for repo-path hosting and includes a SPA
fallback, so routes like `/logs`, `/map`, and `/settings/radio` still work when
shared directly.

## Preset Flow

1. Connect to the node with Web Serial.
2. Open `Presets`.
3. Load the preset you want.
4. Review or adjust anything else manually.
5. Click `Save` to push the draft to the node.
