/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",
  // nft can't statically trace the Prisma query engine (native binary at a
  // custom output path) or runtime-read message JSON — force them in.
  outputFileTracingIncludes: {
    "*": ["./generated/**/*", "./messages/**/*"],
  },
};

export default withNextIntl(config);
