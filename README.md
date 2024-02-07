# previs

Interactive AI markup for frontend developpers.

![previs example](ss.png)

## Install

```bash
$ deno install -Af https://deno.land/x/previs@0.0.28/previs.ts
```

Optional dependencies

- bat (terminal code highlighter) https://github.com/sharkdp/bat
- imgcat (print image in vscode/iterm2) https://iterm2.com/documentation-images.html
- vscode's `settings.json`: `"terminal.integrated.enableImages": true`

## How to use

At first, check with `previs doctor`.

```bash
# Set PREVIS_OPENAI_API_KEY in your env
$ export PREVIS_OPENAI_API_KEY=...

# Create vite project
$ npm create vite@latest
# I recommend react-ts template

# cd <project>
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
# Fix
$ previs src/button.tsx

# Fix with import (for tailwind and others)
$ previs src/button.tsx --import style.css

# Fix with image upload (CAUTION: many token used)
$ previs src/button.tsx --vision

# Preview with size
$ previs src/button.tsx -w 400px

# Generate new file
$ previs newfile.tsx
```

### Previs Preview Convension

Put single file for preview in vite project.

- exported `__PREVIEW__`
- exported `default`
- Same symbol of filename(caseless)

Examples.

```tsx
export default function Button() {
  const buttonStyle = {
    backgroundColor: 'red',
    color: 'white',
  };
  return <button type="button" style={buttonStyle}>Click me</button>
}
```

Same filename (caseless)

```tsx
// Button.tsx
export function Button() {
  return <button type="button" style={buttonStyle}>Click me</button>
}
```

`__PREVIEW__`

```tsx
// __PREVIEW__: best priority.
export function __PREVIEW__() {
  return <>...</>
}
```


### Run with test

```bash
# run after -- command before code accept and retry.
$ previs button.tsx -- pnpm vitest --run __FILE__
```

`__FILE__` is replaced to generated temp file. (eg. `button.__previs__.tsx`)

## TODO

- Commands
  - [x] previs
  - [x] previs gen
  - [x] previs fix
  - [x] previs fix --auto
  - [x] previs doctor
  - [x] previs ss
  - [x] previs test
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
  - [ ] panda-css
- [x] load tailwind config
- [x] format
- [ ] Zero config tailwind
- [ ] Load `previs.config.json`
- [ ] Load specified vite.config by options
- [x] width/height
- [x] show diff
- [ ] Web UI
- [ ] VRT
- [ ] testing library sample
- Node package
  - [ ] @previs/helper

## LICENSE

MIT