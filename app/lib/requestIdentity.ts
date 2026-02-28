import { NextRequest } from 'next/server'

export function getRequestIdentity(request: NextRequest) {
  const xfwd = String(request.headers.get('x-forwarded-for') || '')
  const realIp = String(request.headers.get('x-real-ip') || '')
  const ip = (xfwd.split(',')[0] || realIp || 'unknown').trim()
  const ua = String(request.headers.get('user-agent') || 'ua:unknown').slice(0, 200)
  return `${ip}|${ua}`
}

