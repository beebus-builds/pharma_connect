import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
       async authorize(credentials) {
         console.log("Authorize called with:", credentials?.email);
         if (!credentials?.email || !credentials?.password) {
           console.log("Missing credentials");
           throw new Error("Email and password are required");
         }

         const user = await prisma.user.findUnique({
           where: { email: credentials.email.toLowerCase() },
           include: { pharmacy: true },
         });

         if (!user) {
           console.log("User not found:", credentials.email);
           throw new Error("Invalid email or password");
         }

         if (!user.emailVerified) {
           console.log("User not verified:", user.email);
           throw new Error("Please verify your email address before logging in");
         }

         const isValid = await bcrypt.compare(credentials.password, user.password);
         if (!isValid) {
           console.log("Password mismatch for:", user.email);
           throw new Error("Invalid email or password");
         }

         console.log("Authorization successful for:", user.email);
         return {
           id: user.id,
           name: user.name,
           email: user.email,
           role: user.role,
           pharmacyId: user.pharmacy?.id ?? null,
         };
       },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.pharmacyId = (user as any).pharmacyId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "PATIENT" | "PHARMACY" | "ADMIN";
        session.user.pharmacyId = (token.pharmacyId as string | null) ?? null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
