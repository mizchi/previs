# previs

Code generation toolkit for frontend components.

![previs example](ss.png)

## What it is?

- Standalone component preview
- Screenshot
- CLI Code fixing with OpenAI



## Install

```bash
$ deno install -Af https://deno.land/x/previs@0.0.12/previs.ts

## optional
$ brew install bat rlwrap
```

imgcat https://iterm2.com/documentation-images.html

## in vscode settings

```json
{
  // in settings.json
  "terminal.integrated.enableImages": true,
}
```

## How to use

### preview

Put single file for preview in vite project.

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

Run previs with screenshot

```bash
$ previs ss button.tsx
[previs] start http://localhost:3434/
<image output>
```

### fix

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