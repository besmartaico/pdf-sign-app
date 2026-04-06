import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'admin_auth';
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours
const TOKEN_MAX_AGE_MS = 5 * 60 * 1000; // 5 minute window

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ssoToken = searchParams.get('token');
  const redirect = searchParams.get('redirect') || '/admin/documents';
  const secret = process.env.SSO_SECRET;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!ssoToken || !secret || !adminPassword) {
    return NextResponse.redirect(new URL('/admin/login?error=sso', req.url));
  }

  try {
    const decoded = atob(ssoToken);
    const [ts, sigHex] = decoded.split('.');
    if (!ts || !sigHex) throw new Error('bad token');

    // Verify token not expired
    const age = Date.now() - parseInt(ts);
    if (age > TOKEN_MAX_AGE_MS || age < 0) {
      return NextResponse.redirect(new URL('/admin/login?error=expired', req.url));
    }

    // Verify HMAC
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(ts));

    if (!valid) {
      return NextResponse.redirect(new URL('/admin/login?error=invalid', req.url));
    }

    // Valid! Set the admin cookie and redirect
    const res = NextResponse.redirect(new URL(redirect, req.url));
    res.cookies.set(COOKIE_NAME, adminPassword, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
    return res;
  } catch {
    return NextResponse.redirect(new URL('/admin/login?error=invalid', req.url));
  }
}