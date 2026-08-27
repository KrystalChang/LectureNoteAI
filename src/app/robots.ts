import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 使用者私人內容與後端端點不需要被搜尋引擎爬
      disallow: ["/dashboard", "/documents/", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
