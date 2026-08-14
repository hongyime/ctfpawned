import astro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      ".astro/**",
      "dist/**",
      "node_modules/**",
      "playwright-report/**",
      "public/targets/**",
      "test-results/**",
    ],
  },
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
];
