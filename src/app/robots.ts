import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog", "/beta", "/privacy", "/terms", "/cookies", "/disclaimer", "/acceptable-use", "/accessibility"],
        disallow: ["/dashboard/", "/api/", "/sign-in/", "/sign-up/", "/sentry-example-page/", "/monitoring/"],
      },
    ],
    sitemap: "https://eydn.app/sitemap.xml",
  };
}
