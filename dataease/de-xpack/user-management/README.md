# User Management X-Pack Module

This package is the remote shell for `/menu/system/user/index`.

## Local Usage

```bash
npm install --prefix de-xpack/user-management
npm run typecheck --prefix de-xpack/user-management
npm run build --prefix de-xpack/user-management
```

For local end-to-end exercise, build the remote module and serve the host app so the host `XpackComponent` can resolve `window.DEXPack.mapping['L21lbnUvc3lzdGVtL3VzZXIvaW5kZXg=']` for `/menu/system/user/index`.
The host loads that mapping through the plugin shell, so this package only needs to expose the page component under the expected key.

## Mapping

- `L21lbnUvc3lzdGVtL3VzZXIvaW5kZXg=` -> `/menu/system/user/index`

## Output

The build emits `dist/DEXPack.umd.js`, which the host loads through `window.DEXPack.mapping`.
