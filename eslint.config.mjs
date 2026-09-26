import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  // docs/ui is the UI standard, not application source: its shared script
  // declares globals the pages use, so eslint cannot see them being read.
  { ignores: [".next/**", "next-env.d.ts", "docs/ui/**"] },
  ...nextCoreWebVitals,
  ...nextTypescript,
];

export default config;
