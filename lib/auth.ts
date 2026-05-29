import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { turso, initDb } from './turso';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'email', type: 'email' },
        password: { label: 'password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await ensureDb();

        const result = await turso.execute({
          sql: "SELECT id, email, name, password_hash FROM users WHERE email = ?",
          args: [credentials.email as string],
        });

        if (result.rows.length === 0) return null;

        const user = result.rows[0];
        if (user.password_hash !== credentials.password) return null;

        return { id: user.id as string, email: user.email as string, name: user.name as string };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
});
