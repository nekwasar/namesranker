import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  const base = `https://${config.baseDomain}`;
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/login", "/onboarding", "/settings"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
