# previs

Interactive AI markupper for frontend developpers.

![previs example](ss.png)

## Install

```bash
$ deno install -Af https://deno.land/x/previs@0.0.20/previs.ts
```

Optional dependencies

- bat (terminal code highlighter) https://github.com/sharkdp/bat
- imgcat (print image in vscode/iterm2) https://iterm2.com/documentation-images.html
- vscode's `settings.json`: `"terminal.integrated.enableImages": true`

## How to use

At first, check with `previs doctor`.

```bash
$ export PREVIS_OPENAI_API_KEY=...
$ previs doctor
✅ git
✅ code
✅ imgcat
✅ bat
✅ PREVIS_OPENAI_API_KEY is set
✅ vite: ./vite.config.mts
✅ package.json: ./package.json
✅ tsconfig.json: ./tsconfig.json
✅ compilerOptions.jsx: react-jsx
Library: react
Base: ./
```

```bash
$ previs button.tsx
# with stylesheet (for tailwind and others)
$ previs button.tsx --style style.css
```

### Preview Convensions

Put single file for preview in vite project.

- exported `__PREVIEW__`
- exported `default`

Example.

```tsx
// default or filename(caseless) component
export default function Button() {
  const buttonStyle = {
    backgroundColor: 'red',
    color: 'white',
  };
  return <button type="button" style={buttonStyle}>Click me</button>
}
// export { Button }

// Prefer __PREVIEW__
export const __PREVIEW__ = () => {
  return <div>
    <Button />
  </div>
}
```

### Run with test

```bash
# run after -- command before code accept and retry.
$ previs button.tsx -- pnpm vitest --run
```

## TODO

- Commands
  - [x] previs
  - [x] previs ss
  - [x] previs gen
  - [x] previs fix
  - [x] previs doctor
  - [ ] previs init
- Integration
  - [x] react
  - [ ] svelte
  - [ ] vue
  - [ ] qwik
  - [ ] preact
  - [ ] astro
  - [ ] htmx
- Auto Detection
  - [x] UI library auto detection
  - [x] tailwind auto detection
  - [x] file named component detection
  - [ ] pandacss
- [x] load tailwind config
- [x] format
- [ ] Load `previs.config.json`
- [ ] width/height on preview
- [ ] show diff
- [ ] Web UI
- [ ] test checker
- [ ] --import option
- [ ] VRT
- Node package
  - [ ] @previs/helper

## LICENSE

MIT