# previs

Interactive AI markupper for programmers.

![previs example](ss.png)

## Install

```bash
$ deno install -Af https://deno.land/x/previs@0.0.19/previs.ts
```

Optional dependencies

- bat (terminal code highlighter) https://github.com/sharkdp/bat
- imgcat (print image in vscode/iterm2) https://iterm2.com/documentation-images.html
- vscode's `settings.json`: `"terminal.integrated.enableImages": true`

## How to use

Setup vite project and run `previs fix ...`

```bash
$ export PREVIS_OPENAI_API_KEY=...
$ previs fix button.tsx

# with stylesheet (for tailwind and others)
$ previs fix button.tsx --style style.css
```

### Preview Convensions

Put single file for preview in vite project.

- exported `__PREVIEW__`
- exported `deafult`

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

Run `previs` with screenshot.

```bash
$ previs ss button.tsx
[previs] start http://localhost:3434/
<image output>
```

## TODO

- Commands
  - [x] previs (serve)
  - [x] previs ss (screenshot)
  - [x] previs create
  - [x] previs fix
  - [ ] previs doctor
- Integration
  - [x] react
  - [ ] svelte
  - [ ] vue
  - [ ] qwik
  - [ ] preact
  - [ ] astro
  - [ ] htmx
- Auto Detection
  - [ ] UI library auto detection
  - [ ] tailwind auto detection
  - [ ] pandacss auto detection
  - [ ] file named component detection
- [x] load tailwind config
- [x] format
- [x] width/height on preview
- [x] show diff
- [ ] refactor cli
- [ ] cleanup pre/post
- [ ] tmp file fix
- [ ] tailwind cdn option
- [ ] single binary
- [ ] Fix retry
- [ ] Web UI
- [ ] Vitest
- [ ] --import option
- [ ] VRT
- [ ] Change 

## LICENSE

MIT