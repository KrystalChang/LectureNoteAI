import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Landing Page 是唯一不需登入即可瀏覽的頁面。
const PUBLIC_PATHS = new Set(["/"]);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.has(pathname);

  // 未登入且訪問受保護頁 → 回到含登入入口的 Landing Page。
  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // 排除 API、Next 靜態資源、favicon 與 SEO 檔案(robots/sitemap/Google 驗證檔)；API 的鑑權在任務 #3 於各 route 內處理
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|google48a5b59655b7872c.html).*)",
  ],
};
