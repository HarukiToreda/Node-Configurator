# Testing

Haru Client uses Vitest for unit and integration coverage, plus Playwright for
browser-level checks where needed.

## Run the main test suites

```sh
pnpm -r test
pnpm --filter @meshtastic/sdk test
pnpm --filter @meshtastic/sdk-storage-sqlocal test
pnpm --filter haru-client-web test
```

## Notes

- `pnpm -r test` runs the workspace test suites.
- `pnpm --filter haru-client-web test` runs the web client tests only.
- `pnpm test:e2e` runs the Playwright coverage from the repo root.
