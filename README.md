# previs

Code generation toolkit for frontend components.

## Install

```bash
$ deno install -Af https://deno.land/x/previs@v0.0.2/previs.ts
```

## How to use

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
$ previs -p 3001 button.tsx
[previs] start http://localhost:3001/
```

## with tailwind

TBD

see examples/with-tailwind

## TODO

- [ ] Localize
- [ ] documentation
- [x] react
- [ ] svelte
- [ ] vue
- [ ] library detection
- [ ] AI code fixer
- [ ] test retryer
- [ ] tailwind cdn option

## LICENSE

MIT