import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { upsertAuthUser } from "@/lib/server/auth-users";

type GoogleProfile = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

function googleProviderConfig() {
  const clientId =
    process.env.AUTH_GOOGLE_ID?.trim() || process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret =
    process.env.AUTH_GOOGLE_SECRET?.trim() || process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) return {};
  return { clientId, clientSecret };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google(googleProviderConfig())],
  pages: {
    signIn: "/auth",
    error: "/auth",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim(),
  trustHost: true,
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider !== "google") return true;

      const googleProfile = profile as GoogleProfile | undefined;
      const email = user.email ?? googleProfile?.email;

      if (!email) {
        return "/auth?error=google_email_missing";
      }

      if (googleProfile?.email_verified !== true) {
        return "/auth?error=google_email_unverified";
      }

      const localUser = await upsertAuthUser({
        email,
        name: user.name ?? googleProfile.name,
        image: user.image ?? googleProfile.picture,
        provider: "google",
        providerAccountId: account.providerAccountId ?? googleProfile.sub,
        emailVerified: true,
      });

      user.id = localUser.id;
      return true;
    },
    async jwt({ token, account, profile, user }) {
      if (account?.provider === "google") {
        const googleProfile = profile as GoogleProfile | undefined;
        token.googleEmailVerified = googleProfile?.email_verified === true;
        token.provider = "google";
      }

      if (user?.id) {
        token.userId = user.id;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.userId === "string") {
          session.user.id = token.userId;
        }
        session.user.googleEmailVerified = token.googleEmailVerified === true;
        if (typeof token.provider === "string") {
          session.user.provider = token.provider;
        }
      }

      return session;
    },
  },
});
