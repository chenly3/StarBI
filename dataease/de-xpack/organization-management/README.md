# Organization Management X-Pack Module

This package is the remote shell for `/menu/system/org/index`.

## Local Usage

```bash
npm install --prefix de-xpack/organization-management
npm run typecheck --prefix de-xpack/organization-management
npm run build --prefix de-xpack/organization-management
```

For local end-to-end exercise, build the remote module and serve the host app so the host `XpackComponent` can resolve `window.DEXPack.mapping['L21lbnUvc3lzdGVtL29yZy9pbmRleA==']` for `/menu/system/org/index`.

## Mapping

- `L21lbnUvc3lzdGVtL29yZy9pbmRleA==` -> `/menu/system/org/index`

## Output

The build emits `dist/DEXPack.umd.js`, which the host loads through `window.DEXPack.mapping`.
