import Link from 'next/link'
import { desc, eq } from 'drizzle-orm'
import { MessageCircle, Users } from 'lucide-react'
import { requireDb } from '@/db'
import { communityPosts, users } from '@/db/schema'
import { getCurrentUser } from '@/lib/auth'
import { Localized } from '@/components/localized'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function Community() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const rows = await requireDb()
    .select({
      id: communityPosts.id,
      body: communityPosts.body,
      createdAt: communityPosts.createdAt,
      pinned: communityPosts.pinned,
      author: users.fullNameAr,
      authorEn: users.fullNameEn,
    })
    .from(communityPosts)
    .innerJoin(users, eq(users.id, communityPosts.authorId))
    .where(eq(communityPosts.published, true))
    .orderBy(
      desc(communityPosts.pinned),
      desc(communityPosts.createdAt)
    )
    .limit(40)

  return (
    <div className="page-card card">
      <div className="page-title-row">
        <div>
          <h1 className="page-title">
            <Localized ar="المجتمع" en="Community" />
          </h1>

          <p className="page-subtitle">
            <Localized
              ar="منشورات منشورة من مجتمع المدرسة."
              en="Published posts from your school community."
            />
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/community/new" className="button primary">
            + <Localized ar="إنشاء منشور" en="Create post" />
          </Link>

          <div className="stat-icon purple">
            <Users size={20} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {rows.length ? (
          rows.map((p) => (
            <div
              className="community-post"
              key={p.id}
              style={{ padding: '15px 4px' }}
            >
              <span className="avatar purple">
                {p.author.slice(0, 1)}
              </span>

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <strong>
                    <Localized
                      ar={p.author}
                      en={p.authorEn}
                    />
                  </strong>

                  <span style={{ fontSize: 8, color: '#9aa1af' }}>
                    {p.createdAt.toLocaleString('ar-IQ')}
                  </span>
                </div>

                <p style={{ fontSize: 10, marginTop: 5 }}>
                  {p.body}
                </p>

                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    color: '#6b7280',
                    fontSize: 8,
                    marginTop: 8,
                  }}
                >
                  <span>
                    <MessageCircle
                      size={13}
                      style={{ verticalAlign: 'middle' }}
                    />{' '}
                    <Localized
                      ar="التعليقات"
                      en="Comments"
                    />
                  </span>

                  {p.pinned && (
                    <span>
                      <Localized
                        ar="مثبت"
                        en="Pinned"
                      />
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="admin-empty">
            <Localized
              ar="لا توجد منشورات منشورة."
              en="No published posts."
            />
          </p>
        )}
      </div>
    </div>
  )
                    }
