import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  // 明確信任本機/部署 host（Auth.js v5 在非 Vercel 或某些情境需要）
  trustHost: true,
  // 用 JWT session：不必每個請求打 DB，且與 proxy 路由保護搭配最順。
  // 使用者/OAuth 帳號仍會由 adapter 寫進 User / Account 表。
  session: { strategy: "jwt" },
  callbacks: {
    // 登入當下把 DB 的 user.id 放進 token
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    // 把 id 從 token 帶到 session.user.id，之後 route/元件才拿得到
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

// 型別擴充：讓 session.user 多一個 id（tsconfig 的 include 涵蓋 **/*.ts，
// 放在此檔即生效，不需獨立的 next-auth.d.ts）。
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
