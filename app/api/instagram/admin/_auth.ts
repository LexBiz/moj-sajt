import { NextRequest } from 'next/server'

export function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const password = (process.env.ADMIN_PASSWORD || 'admin123').trim()
  return authHeader === `Bearer ${password}`
}



