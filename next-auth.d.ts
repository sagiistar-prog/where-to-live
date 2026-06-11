import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
      googleEmailVerified?: boolean;
      provider?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    googleEmailVerified?: boolean;
    provider?: string;
  }
}
