import { auth } from "@/auth";
import { NextResponse } from "next/server";

// 不需登入就能看的頁面
const PUBLIC_PATHS = ["/login"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // 未登入且訪問受保護頁 → 導向 /login
  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // 已登入卻在 /login → 導回首頁
  if (req.auth && isPublic) {
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
