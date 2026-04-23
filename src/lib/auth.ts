import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { connectDB } from "./db";
import { Admin } from "@/models/Admin";
import { ROLE_PERMISSIONS, type AdminRole, type Permission } from "./permissions";

/* --- Augment NextAuth types --------------------------------------------------- */
declare module "next-auth" {
  interface User {
    id:          string;
    role:        AdminRole;
    permissions: Permission[];
    division?:   string;
    lastLogin?:  string;
  }
  interface Session {
    user: {
      id:          string;
      name:        string;
      email:       string;
      role:        AdminRole;
      permissions: Permission[];
      division?:   string;
      lastLogin?:  string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id:          string;
    role:        AdminRole;
    permissions: Permission[];
    division?:   string;
    lastLogin?:  string;
  }
}

/* --- Config ------------------------------------------------------------------- */
const config: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectDB();

        const admin = await Admin.findOne({
          email:    (credentials.email as string).toLowerCase().trim(),
          isActive: true,
        }).select("+hashedPassword");

        if (!admin) return null;

        /* Lockout check */
        if (admin.isLocked()) {
          const remaining = Math.ceil(
            ((admin.lockoutUntil?.getTime() ?? 0) - Date.now()) / 60_000
          );
          throw new Error(`LOCKED:${remaining}`);
        }

        const valid = await admin.comparePassword(credentials.password as string);

        if (!valid) {
          await admin.incrementFailedAttempts();
          const attemptsLeft = 5 - (admin.loginAttempts + 1);
          if (attemptsLeft <= 0) throw new Error("LOCKED:15");
          throw new Error(`INVALID:${Math.max(0, attemptsLeft)}`);
        }

        /* Successful login - reset counters, record lastLogin */
        admin.loginAttempts = 0;
        admin.lockoutUntil  = undefined;
        admin.lastLogin     = new Date();
        await admin.save();

        /* Merge stored permissions with role defaults (role defaults take precedence) */
        const permissions: Permission[] =
          admin.permissions?.length
            ? admin.permissions
            : ROLE_PERMISSIONS[admin.role] ?? [];

        return {
          id:          admin._id.toString(),
          name:        admin.name,
          email:       admin.email,
          role:        admin.role,
          permissions,
          division:    admin.division,
          lastLogin:   admin.lastLogin?.toISOString(),
        };
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id          = user.id;
        token.role        = user.role;
        token.permissions = user.permissions;
        token.division    = user.division;
        token.lastLogin   = user.lastLogin;
      }
      return token;
    },

    session({ session, token }) {
      session.user = {
        id:          token.id,
        name:        token.name ?? "",
        email:       token.email ?? "",
        role:        token.role,
        permissions: token.permissions,
        division:    token.division,
        lastLogin:   token.lastLogin,
        emailVerified: null,
      };
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error:  "/login",
  },

  trustHost: true,

  session: {
    strategy:  "jwt",
    maxAge:    8 * 60 * 60,   /* 8 hours */
    updateAge: 60 * 60,       /* refresh token every 1 hour */
  },

  jwt: {
    maxAge: 8 * 60 * 60,
  },

  events: {
    async signOut() {
      /* Could clear server-side audit log here */
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
