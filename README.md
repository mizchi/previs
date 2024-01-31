# previs

Code generation toolkit for frontend components.

## Install

```bash
$ deno install -Af https://deno.land/x/previs@v0.0.2/previs.ts
```

## How to use

Put file for preview.

```tsx
// src/components/Button.tsx
export default function Button() {
  const buttonStqsyle = {
    backgroundColor: 'red',
    color: 'white',
  };
  return <button type="button" style={buttonStyle}>Click me</button>
}
```

```bash
# setup vite project
$ previs -p 3001 src/components/Button.tsx
[previs] start http://localhost:3001/
```

## TODO

- [ ] documentation
- [x] react
- [ ] svelte
- [ ] vue
- [ ] library detection

## LICENSE

MIT