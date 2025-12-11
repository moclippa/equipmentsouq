import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { UserRole, Currency, Country } from "@prisma/client";

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      phone?: string | null;
      phoneVerified: boolean;
      fullName: string;
      role: UserRole;
      preferredLanguage: string;
      preferredCurrency: Currency;
      country: Country;
      businessProfileId?: string | null;
    };
  }

  interface User {
    id: string;
    email?: string | null;
    phone?: string | null;
    phoneVerified: boolean;
    fullName: string;
    role: UserRole;
    preferredLanguage: string;
    preferredCurrency: Currency;
    country: Country;
    businessProfileId?: string | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    // Email + Password Provider
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { businessProfile: { select: { id: true } } },
        });

        if (!user || !user.hashedPassword) {
          throw new Error("Invalid email or password");
        }

        if (!user.isActive) {
          throw new Error("Account is deactivated");
        }

        if (user.isSuspended) {
          throw new Error("Account is suspended");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          phone: user.phone,
          phoneVerified: !!user.phoneVerified,
          fullName: user.fullName,
          role: user.role,
          preferredLanguage: user.preferredLanguage,
          preferredCurrency: user.preferredCurrency,
          country: user.country,
          businessProfileId: user.businessProfile?.id ?? null,
        };
      },
    }),

    // Phone + OTP Provider
    CredentialsProvider({
      id: "phone-otp",
      name: "Phone OTP",
      credentials: {
        phone: { label: "Phone", type: "tel" },
        code: { label: "OTP Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.code) {
          throw new Error("Phone and OTP code are required");
        }

        const phone = credentials.phone as string;
        const code = credentials.code as string;

        // Find valid OTP
        const otp = await prisma.oTPCode.findFirst({
          where: {
            phone,
            code,
            type: "LOGIN",
            expiresAt: { gt: new Date() },
            verified: false,
          },
        });

        if (!otp) {
          // Increment attempts on existing OTPs
          await prisma.oTPCode.updateMany({
            where: { phone, type: "LOGIN", verified: false },
            data: { attempts: { increment: 1 } },
          });
          throw new Error("Invalid or expired OTP");
        }

        // Mark OTP as used
        await prisma.oTPCode.update({
          where: { id: otp.id },
          data: { verified: true },
        });

        // Find or create user
        let user = await prisma.user.findUnique({
          where: { phone },
          include: { businessProfile: { select: { id: true } } },
        });

        if (!user) {
          // Determine country from phone number
          const country: Country = phone.startsWith("+966") ? "SA" : "BH";
          const currency: Currency = country === "SA" ? "SAR" : "BHD";

          user = await prisma.user.create({
            data: {
              phone,
              phoneVerified: new Date(),
              fullName: "New User",
              country,
              preferredCurrency: currency,
            },
            include: { businessProfile: { select: { id: true } } },
          });
        } else {
          // Update phone verification and last login
          await prisma.user.update({
            where: { id: user.id },
            data: {
              phoneVerified: user.phoneVerified ?? new Date(),
              lastLoginAt: new Date(),
            },
          });
        }

        if (!user.isActive) {
          throw new Error("Account is deactivated");
        }

        if (user.isSuspended) {
          throw new Error("Account is suspended");
        }

        return {
          id: user.id,
          email: user.email,
          phone: user.phone,
          phoneVerified: !!user.phoneVerified,
          fullName: user.fullName,
          role: user.role,
          preferredLanguage: user.preferredLanguage,
          preferredCurrency: user.preferredCurrency,
          country: user.country,
          businessProfileId: user.businessProfile?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.fullName = user.fullName;
        token.phone = user.phone;
        token.phoneVerified = user.phoneVerified;
        token.preferredLanguage = user.preferredLanguage;
        token.preferredCurrency = user.preferredCurrency;
        token.country = user.country;
        token.businessProfileId = user.businessProfileId;
      }

      // Handle session updates - refetch user from DB to get latest data
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            fullName: true,
            phoneVerified: true,
            phone: true,
            preferredLanguage: true,
            preferredCurrency: true,
            country: true,
          },
        });
        if (dbUser) {
          token.fullName = dbUser.fullName;
          token.phoneVerified = !!dbUser.phoneVerified;
          token.phone = dbUser.phone;
          token.preferredLanguage = dbUser.preferredLanguage;
          token.preferredCurrency = dbUser.preferredCurrency;
          token.country = dbUser.country;
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as UserRole;
      session.user.fullName = token.fullName as string;
      session.user.phone = token.phone as string | null;
      session.user.phoneVerified = token.phoneVerified as boolean;
      session.user.preferredLanguage = token.preferredLanguage as string;
      session.user.preferredCurrency = token.preferredCurrency as Currency;
      session.user.country = token.country as Country;
      session.user.businessProfileId = token.businessProfileId as string | null;
      return session;
    },
  },
});

// Helper function to hash passwords
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Helper function to verify passwords
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
