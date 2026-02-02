import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
)

// Edge Runtimeで動作するJWT検証関数
async function verifyToken(token: string): Promise<{ userId: string; email: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
    }
  } catch (error) {
    return null
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get('auth-token')?.value

  // ログインページは認証済みユーザーをリダイレクト
  if (pathname === '/' && token) {
    const decoded = await verifyToken(token)
    if (decoded) {
      if (decoded.role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url))
      } else {
        return NextResponse.redirect(new URL('/member/home', req.url))
      }
    }
  }

  // 保護されたルートのチェック
  if (pathname.startsWith('/member') || pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    // 管理者ページへのアクセス制御
    if (pathname.startsWith('/admin') && decoded.role !== 'admin') {
      return NextResponse.redirect(new URL('/member/home', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
