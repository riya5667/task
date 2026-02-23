import type { AuthConfig } from "convex/server";

const clerkIssuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;

if (!clerkIssuerDomain) {
  throw new Error(
    "Missing CLERK_JWT_ISSUER_DOMAIN. Set it with `npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-clerk-domain>`.",
  );
}

export default {
  providers: [
    {
      domain: clerkIssuerDomain,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
