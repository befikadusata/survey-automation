import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { query } from '@/lib/db';
import bcrypt from 'bcrypt';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        // First try env-based credentials for backward-compat
        const adminUser = process.env.ADMIN_USER;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (
          credentials.username === adminUser &&
          credentials.password === adminPassword
        ) {
          return { id: '1', name: adminUser, email: `${adminUser}@localhost` };
        }

        // Then try database auth with bcrypt
        try {
          const result = await query(
            `SELECT id, username, password_hash, role FROM users WHERE username = $1 LIMIT 1`,
            [credentials.username]
          );
          const user = result.rows[0];

          if (user) {
            const valid = await bcrypt.compare(credentials.password, user.password_hash);
            if (valid) {
              return { 
                id: user.id, 
                name: user.username, 
                email: `${user.username}@localhost`,
                role: user.role || 'user'
              };
            }
          }
        } catch {
          // db may not be initialized
        }

        return null;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || 'admin'; // Default to admin for env-based user
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};
