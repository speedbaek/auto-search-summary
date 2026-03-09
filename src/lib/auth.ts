import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

const providers = [];

// Google OAuth (production)
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}

// Credentials (local dev) - DEV_LOGIN=true 일 때만 활성화
if (process.env.DEV_LOGIN === "true") {
  providers.push(
    Credentials({
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        if (!email) return null;

        // 허용된 이메일 체크
        const allowedEmail = process.env.ALLOWED_EMAIL;
        if (allowedEmail && email !== allowedEmail) return null;

        // DB에서 유저 찾거나 생성
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          user = await prisma.user.create({
            data: { email, name: email.split("@")[0] },
          });
        }
        return { id: user.id, email: user.email, name: user.name };
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  session: {
    strategy: process.env.DEV_LOGIN === "true" ? "jwt" : "database",
  },
  callbacks: {
    signIn({ user }) {
      const allowedEmail = process.env.ALLOWED_EMAIL;
      if (allowedEmail && user.email !== allowedEmail) {
        return false;
      }
      return true;
    },
  },
});
