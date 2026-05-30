import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getTurso, initDb } from './turso';
import bcrypt from 'bcryptjs';

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

        const result = await getTurso().execute({
          sql: "SELECT id, email, name, password_hash FROM users WHERE email = ?",
          args: [credentials.email as string],
        });

        if (result.rows.length === 0) return null;

        const user = result.rows[0];
        const storedHash = user.password_hash as string;
        const plainPassword = credentials.password as string;

        let valid = false;
        if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
          valid = await bcrypt.compare(plainPassword, storedHash);
        } else {
          valid = storedHash === plainPassword;
          if (valid) {
            const hashed = await bcrypt.hash(plainPassword, 10);
            await getTurso().execute({
              sql: "UPDATE users SET password_hash = ? WHERE id = ?",
              args: [hashed, user.id as string],
            });
          }
        }

        if (!valid) return null;

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
