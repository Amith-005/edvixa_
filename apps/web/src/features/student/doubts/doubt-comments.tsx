import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Send } from 'lucide-react'
import { useState } from 'react'

import { api } from '../../../lib/api'
import type { DoubtPollDetailResponse } from '../../doubts/types'

export function DoubtComments({ pollId }: { pollId: string }) {
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const detailQuery = useQuery({
    queryKey: ['doubt-poll-detail', pollId],
    queryFn: () =>
      api
        .get<{ data: DoubtPollDetailResponse }>(`/doubt-polls/${pollId}`)
        .then((response) => response.data.data),
  })

  const commentMutation = useMutation({
    mutationFn: () =>
      api.post(`/doubt-polls/${pollId}/comments`, { body: body.trim() }),
    onSuccess: async () => {
      setBody('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['doubt-poll-detail', pollId] }),
        queryClient.invalidateQueries({ queryKey: ['student-doubt-polls'] }),
      ])
    },
  })

  return (
    <div className="doubt-comments-panel">
      <div className="doubt-comments-heading">
        <MessageCircle size={17} />
        <strong>Discussion</strong>
      </div>
      {detailQuery.isLoading ? (
        <p className="muted">Loading discussion…</p>
      ) : detailQuery.data?.comments.length ? (
        <div className="doubt-comment-list">
          {detailQuery.data.comments.map((comment) => (
            <article key={comment.id} className="doubt-comment">
              <div>
                <strong>{comment.author.name}</strong>
                <span>{comment.authorRole === 'teacher' ? 'Teacher' : 'Student'}</span>
                <time dateTime={comment.createdAt}>
                  {new Date(comment.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </time>
              </div>
              <p>{comment.body}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">No comments yet. Add more detail to help others.</p>
      )}

      <div className="doubt-comment-compose">
        <input
          value={body}
          maxLength={800}
          placeholder="Add a related doubt or more detail…"
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && body.trim().length >= 2) {
              commentMutation.mutate()
            }
          }}
        />
        <button
          type="button"
          className="button"
          disabled={body.trim().length < 2 || commentMutation.isPending}
          onClick={() => commentMutation.mutate()}
        >
          <Send size={16} /> Send
        </button>
      </div>
    </div>
  )
}
