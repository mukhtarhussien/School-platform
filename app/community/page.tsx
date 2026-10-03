import Link from 'next/link'
import { desc, eq } from 'drizzle-orm'
import { MessageCircle, Send, Users } from 'lucide-react'
import { requireDb } from '@/db'
import { communityComments, communityPosts, users } from '@/db/schema'
import { getCurrentUser } from '@/lib/auth'
import { Localized } from '@/components/localized'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

async function createComment(formData: FormData) {
  'use server'

  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const postId = String(formData.get('postId') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()

  if (!postId || !body) {
    return
  }

  await requireDb().insert(communityComments).values({
    postId,
    authorId: user.id,
    body,
    published: true,
  })
}

export default async function Community() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const db = requireDb()

  const rows = await db
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

  const postIds = rows.map((post) => post.id)

  const comments = postIds.length
    ? await db
        .select({
          id: communityComments.id,
          postId: communityComments.postId,
          body: communityComments.body,
          createdAt: communityComments.createdAt,
          author: users.fullNameAr,
          authorEn: users.fullNameEn,
        })
        .from(communityComments)
        .innerJoin(
          users,
          eq(users.id, communityComments.authorId)
        )
        .where(eq(communityComments.published, true))
        .orderBy(desc(communityComments.createdAt))
    : []

  const commentsByPost = new Map<string, typeof comments>()

  for (const comment of comments) {
    if (!postIds.includes(comment.postId)) {
      continue
    }

    const existing = commentsByPost.get(comment.postId) ?? []

    existing.push(comment)

    commentsByPost.set(comment.postId, existing)
  }

  return (
    <div className="page-card card">
      <div className="page-title-row">
        <div>
          <h1 className="page-title">
            <Localized
              ar="المجتمع"
              en="Community"
            />
          </h1>

          <p className="page-subtitle">
            <Localized
              ar="منشورات منشورة من مجتمع المدرسة."
              en="Published posts from your school community."
            />
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Link
            href="/community/new"
            className="button primary"
          >
            +{' '}
            <Localized
              ar="إنشاء منشور"
              en="Create post"
            />
          </Link>

          <div className="stat-icon purple">
            <Users size={20} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {rows.length ? (
          rows.map((p) => {
            const postComments =
              commentsByPost.get(p.id) ?? []

            return (
              <div
                className="community-post"
                key={p.id}
                style={{
                  padding: '15px 4px',
                }}
              >
                <span className="avatar purple">
                  {p.author.slice(0, 1)}
                </span>

                <div style={{ flex: 1 }}>
                  {/* Post header */}
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

                    <span
                      style={{
                        fontSize: 8,
                        color: '#9aa1af',
                      }}
                    >
                      {p.createdAt.toLocaleString('ar-IQ')}
                    </span>
                  </div>

                  {/* Post body */}
                  <p
                    style={{
                      fontSize: 10,
                      marginTop: 5,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {p.body}
                  </p>

                  {/* Post info */}
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
                        style={{
                          verticalAlign: 'middle',
                        }}
                      />{' '}
                      <Localized
                        ar={`${postComments.length} تعليق`}
                        en={`${postComments.length} comments`}
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

                  {/* Comments */}
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 10,
                      borderTop: '1px solid #eee',
                    }}
                  >
                    {postComments.length > 0 && (
                      <div
                        style={{
                          display: 'grid',
                          gap: 9,
                          marginBottom: 12,
                        }}
                      >
                        {postComments.map((comment) => (
                          <div
                            key={comment.id}
                            style={{
                              display: 'flex',
                              gap: 8,
                              alignItems: 'flex-start',
                            }}
                          >
                            <span className="avatar purple">
                              {comment.author.slice(0, 1)}
                            </span>

                            <div
                              style={{
                                flex: 1,
                                background: '#f8f9fb',
                                borderRadius: 10,
                                padding: '8px 10px',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent:
                                    'space-between',
                                  gap: 8,
                                }}
                              >
                                <strong
                                  style={{
                                    fontSize: 9,
                                  }}
                                >
                                  <Localized
                                    ar={comment.author}
                                    en={comment.authorEn}
                                  />
                                </strong>

                                <span
                                  style={{
                                    fontSize: 7,
                                    color: '#9aa1af',
                                  }}
                                >
                                  {comment.createdAt.toLocaleString(
                                    'ar-IQ'
                                  )}
                                </span>
                              </div>

                              <p
                                style={{
                                  fontSize: 9,
                                  marginTop: 4,
                                  whiteSpace: 'pre-wrap',
                                }}
                              >
                                {comment.body}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* New comment form */}
                    <form
                      action={createComment}
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'flex-end',
                      }}
                    >
                      <input
                        type="hidden"
                        name="postId"
                        value={p.id}
                      />

                      <textarea
                        name="body"
                        required
                        rows={2}
                        placeholder="اكتب تعليقك..."
                        style={{
                          flex: 1,
                          resize: 'vertical',
                          minHeight: 42,
                          padding: '9px 10px',
                          borderRadius: 10,
                          border: '1px solid #e5e7eb',
                          outline: 'none',
                          fontSize: 10,
                        }}
                      />

                      <button
                        type="submit"
                        className="button primary"
                        aria-label="إرسال التعليق"
                        title="إرسال التعليق"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <Send size={13} />

                        <Localized
                          ar="إرسال"
                          en="Send"
                        />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )
          })
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
