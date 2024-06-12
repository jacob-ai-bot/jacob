import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import GitHubProvider, { type GithubProfile } from "next-auth/providers/github";
import PostgresAdapter from "@auth/pg-adapter";
import { Pool } from "pg";

import { env } from "~/env";
import { db } from "./db/db";

export enum UserRole {
  user = "user",
  admin = "admin",
}

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth/adapters" {
  interface AdapterUser {
    login?: string;
    role?: UserRole;
  }
}

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      login: string;
      role?: UserRole;
      // ...other properties
    } & DefaultSession["user"];
    accessToken: string;
  }

  export interface Profile {
    login: string;
  }

  interface User {
    // ...other properties
    role: UserRole;
    login: string;
  }
}

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === "production" ? undefined : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  adapter: PostgresAdapter(pool) as NextAuthOptions["adapter"],
  events: {
    signIn: async (params) => {
      const { user, profile } = params;
      const userId = parseInt(user.id, 10);
      await db.users.find(userId).update({ login: profile?.login });
    },
  },
  callbacks: {
    session: async (params) => {
      const { session, user } = params;
      const userId = parseInt(user.id, 10);
      const account = await db.accounts.findBy({ userId });
      return {
        ...session,
        accessToken: account.access_token,
        user: {
          ...session.user,
          id: userId,
          role: user.role,
          login: user.login,
        },
      };
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    maxAge: 8 * 60 * 60, // 8 hours (to match GitHub's token expiration time)
    updateAge: 24 * 60 * 60, // 24 hours (don't update to extend the 8 hour session)
  },
  providers: [
    GitHubProvider({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "read:user",
        },
      },
      profile(profile: GithubProfile) {
        return {
          id: profile.id.toString(),
          name: profile.name ?? profile.login,
          login: profile.login,
          email: profile.email,
          image: profile.avatar_url,
          role: UserRole.user,
        };
      },
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = () => getServerSession(authOptions);
