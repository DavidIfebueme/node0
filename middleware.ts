import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const publicRoutes = ['/', '/login', '/signup'];
  const authRoutes = ['/login', '/signup'];
  const isPublicRoute = publicRoutes.some(r => pathname === r || pathname.startsWith('/login') || pathname.startsWith('/signup'));
  const isAuthRoute = authRoutes.some(r => pathname.startsWith(r));
  const isApiRoute = pathname.startsWith('/api');

  if (isApiRoute) return NextResponse.next();

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts).*)'],
};
