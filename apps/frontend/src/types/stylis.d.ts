declare module 'stylis' {
  // Loose typing — emotion's `stylisPlugins` accepts middleware functions and
  // typing them strictly here would duplicate stylis's internal signatures.
  type StylisMiddleware = (...args: unknown[]) => unknown;
  export const prefixer: StylisMiddleware;
}

declare module 'stylis-plugin-rtl' {
  type StylisMiddleware = (...args: unknown[]) => unknown;
  const plugin: StylisMiddleware;
  export default plugin;
}
