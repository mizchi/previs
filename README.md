# previs

Code generation toolkit for frontend components.

## What it is?

- Standalone component preview
- Screenshot
- CLI Code fixing with OpenAI

## Install

```bash
$ deno install -Af https://deno.land/x/previs@0.0.12/previs.ts

## TODO: should be optional
$ brew install bat rlwrap
```

## previs preview

Put file for preview.

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

```bash
# setup vite project
$ previs button.tsx
[previs] start http://localhost:3434/
```

## previs fix

TBD

## TODO

- [x] standalnoe vite builder
- [x] code fixer
- [x] screenshot
- [x] react
- [ ] preview: width height
- [ ] documentation
- [ ] show diff
- [ ] svelte
- [ ] tmp file fix
- [ ] vue
- [ ] library detection
- [ ] tailwind cdn option
- [x] load tailwind config
- [ ] code format on rewrite

## LICENSE

MIT