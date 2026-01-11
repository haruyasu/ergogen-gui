# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ergogen GUI is a web-based interface for [Ergogen](https://github.com/mrzealot/ergogen), a tool for generating ergonomic keyboard layouts. Users write YAML configurations to design keyboards and see live 2D/3D previews.

**Requirements:** Node.js v20 (required - newer versions like v22 will fail), Yarn package manager.

## Development Commands

```bash
yarn install          # Install dependencies (also runs build-ergogen via postinstall)
yarn start            # Start dev server at http://localhost:3000
yarn build            # Production build
yarn test             # Run all tests (unit + e2e)
yarn test:unit        # Run unit tests only (Jest, jsdom)
yarn test:e2e         # Run e2e tests only (Playwright)
yarn lint             # Run markdown lint, ESLint, and knip
yarn format           # Run Prettier on all files
yarn precommit        # Format + lint + test (run before committing)
```

**Dev with Ergogen live reload:**
```bash
yarn dev              # Runs Ergogen watcher + copy watcher + React dev server concurrently
```

## Architecture

### State Management
- **ConfigContext** (`src/context/ConfigContext.tsx`): Central React context managing all app state - configuration, injections (custom footprints), settings, and Ergogen results. Uses `useLocalStorage` for persistence.

### Web Workers
Heavy processing runs in web workers to avoid blocking the UI:
- **ergogen.worker.ts**: Runs Ergogen generation, handles code injection for custom footprints
- **jscad.worker.ts**: Converts JSCAD to STL for 3D preview

### Component Structure (Atomic Design)
- `atoms/`: Basic UI components (Button, Input, previews)
- `molecules/`: Composed components (ConfigEditor, FilePreview, Downloads)
- `organisms/`: Page sections (Banners)
- `pages/`: Route pages (Welcome)

### Key Files
- `src/App.tsx`: Router setup, hash fragment handling for shared configs
- `src/Ergogen.tsx`: Main layout with split panes (editor, preview, downloads)
- `src/utils/share.ts`: URI sharing via LZ-string compression in hash fragment
- `src/utils/github.ts`: Fetch configs from GitHub URLs

### Ergogen Integration
- Ergogen is bundled as a dependency and patched during `yarn install`
- Patch script: `patch/patch_ergogen.sh` - builds Ergogen and copies to `public/dependencies/`
- Custom footprints from [ceoloide/ergogen-footprints](https://github.com/ceoloide/ergogen-footprints) are bundled

### Configuration Sharing
Configs can be shared via:
1. **Hash fragment**: LZ-compressed config in URL hash (includes injections)
2. **GitHub URL**: `?github=<url>` query param loads config + footprints from GitHub

## Testing

Unit tests use Jest with `@testing-library/react`. E2E tests use Playwright (Chromium only).

```bash
# Run specific unit test file
CI=true yarn react-scripts --openssl-legacy-provider test path/to/file.test.tsx

# Run e2e tests with UI
npx playwright test --ui
```

## Key Patterns

- Monaco Editor for YAML editing with syntax highlighting
- React-split for resizable panes
- styled-components for CSS-in-JS
- Hotkeys: Cmd/Ctrl+Enter triggers full generation
- Settings persisted to localStorage with `ergogen:config:*` keys
