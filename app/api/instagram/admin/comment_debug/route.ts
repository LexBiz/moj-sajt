import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../_auth'
import { readTokenFile } from '../../oauth/_store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getAccessToken() {
  const envToken = (process.env.INSTAGRAM_ACCESS_TOKEN || '').trim()
  if (envToken) return envToken
  const saved = (readTokenFile()?.accessToken || '').trim()
  return saved
}

async function graphGet(path: string, accessToken: string) {
  const apiHost = (process.env.INSTAGRAM_API_HOST || 'graph.facebook.com').trim()
  const apiVersion = (process.env.INSTAGRAM_API_VERSION || 'v24.0').trim()
  const url = new URL(`https://${apiHost}/${apiVersion}/${path}`)
  if (apiHost !== 'graph.instagram.com') url.searchParams.set('access_token', accessToken)
  const resp = await fetch(url.toString(), { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } })
  const text = await resp.text().catch(() => '')
  const json = (() => {
    try {
      return JSON.parse(text) as any
    } catch {
      return null
    }
  })()
  return { ok: resp.ok, status: resp.status, json, text }
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const commentId = String(searchParams.get('commentId') || '').trim()
  if (!commentId) return NextResponse.json({ error: 'Missing commentId' }, { status: 400 })

  const token = getAccessToken()
  if (!token) return NextResponse.json({ error: 'Missing access token' }, { status: 400 })

  const comment = await graphGet(`${commentId}?fields=id,text,from,timestamp`, token)
  const replies = await graphGet(`${commentId}/replies?fields=id,text,from,timestamp&limit=25`, token)
  return NextResponse.json(
    {
      ok: true,
      commentId,
      comment: comment.ok ? comment.json : { error: comment.status, details: comment.json || comment.text?.slice(0, 800) },
      replies: replies.ok ? replies.json : { error: replies.status, details: replies.json || replies.text?.slice(0, 800) },
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}


