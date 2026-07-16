import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('spark_token')?.value
  const isProjectRoute = request.nextUrl.pathname.startsWith('/project')

  if (isProjectRoute && !token) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/project/:path*'],
}
