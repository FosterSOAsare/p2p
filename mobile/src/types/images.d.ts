/**
 * Type declarations for bundled image imports.
 *
 * Metro resolves `import photo from './thing.jpg'` at build time and hands back
 * an asset id (a number), but TypeScript has no built-in knowledge of image
 * files and Expo doesn't ship a declaration for them — so without this, every
 * image import raises TS2307 "Cannot find module".
 *
 * The `number` type matches what Metro actually returns, which is exactly what
 * expo-image and react-native's Image accept as a `source`.
 */

declare module '*.jpg' {
  const asset: number;
  export default asset;
}

declare module '*.jpeg' {
  const asset: number;
  export default asset;
}

declare module '*.png' {
  const asset: number;
  export default asset;
}

declare module '*.webp' {
  const asset: number;
  export default asset;
}

declare module '*.gif' {
  const asset: number;
  export default asset;
}

declare module '*.svg' {
  const asset: number;
  export default asset;
}
