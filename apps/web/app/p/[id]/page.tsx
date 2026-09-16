"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@kor/ui";
import {
  ChevronLeftIcon,
  MoreHorizontalIcon,
  MapPinIcon,
  HeartIcon,
  HeartFilledIcon,
  CommentIcon,
  ShareIcon,
  BookmarkIcon,
  BookmarkFilledIcon,
  InfoIcon,
  SendIcon,
} from "../../../components/icons";
import { usePostInteractions } from "../../../lib/usePostInteractions";
import { getSession, getPost, getComments, addComment, type PostDto, type CommentDto } from "../../../lib/api";

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const postId = params.id;

  const [post, setPost] = useState<PostDto | null>(null);
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getSession()) {
      router.push("/login");
      return;
    }
    Promise.all([getPost(postId), getComments(postId)]).then(([postRes, commentsRes]) => {
      setPost(postRes.data);
      setComments(commentsRes.data ?? []);
      setLoading(false);
    });
  }, [postId, router]);

  function onCommentAdded(comment: CommentDto) {
    setComments((prev) => [...prev, comment]);
    setPost((p) => (p ? { ...p, commentCount: p.commentCount + 1 } : p));
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center text-text-muted">Cargando…</main>;
  }
  if (!post) {
    return <main className="flex min-h-screen items-center justify-center text-text-muted">No encontrado.</main>;
  }

  return <PostDetailView post={post} comments={comments} onCommentAdded={onCommentAdded} onBack={() => router.back()} />;
}

function PostDetailView({
  post,
  comments,
  onCommentAdded,
  onBack,
}: {
  post: PostDto;
  comments: CommentDto[];
  onCommentAdded: (c: CommentDto) => void;
  onBack: () => void;
}) {
  const { liked, likeCount, saved, toggleLike, toggleSave } = usePostInteractions(post);
  const [commentBody, setCommentBody] = useState("");
  const [posting, setPosting] = useState(false);
  const media = post.media[0];

  async function onSubmitComment() {
    if (!commentBody.trim() || posting) return;
    setPosting(true);
    const res = await addComment(post.id, commentBody.trim());
    setPosting(false);
    if (res.data) {
      onCommentAdded(res.data);
      setCommentBody("");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col">
      <div className="flex-1">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-4">
          <button onClick={onBack} aria-label="Volver">
            <ChevronLeftIcon size={21} />
          </button>
          <span className="font-display text-[14.5px] font-semibold">Publicación</span>
          <MoreHorizontalIcon size={20} className="text-text" />
        </div>

        <div className="flex items-center gap-2.5 px-3.5 py-3.5">
          <Link href={`/u/${post.author.id}`}>
            <Avatar seed={post.author.username} src={post.author.avatarUrl} size={38} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/u/${post.author.id}`} className="text-[14px] font-semibold hover:underline">
              {post.author.username}
            </Link>
            {post.location && (
              <div className="flex items-center gap-1 text-[11.5px] text-text-muted">
                <MapPinIcon size={11} />
                {post.location.name} · {post.location.city}
              </div>
            )}
          </div>
        </div>

        {media && (
          <div className="flex h-[340px] items-center justify-center bg-surface-2">
            {media.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media.url} alt="" className="h-full w-full object-cover" />
            ) : (
              <video src={media.url} className="h-full w-full object-cover" controls />
            )}
          </div>
        )}

        {post.caption && <p className="px-3.5 pb-1 pt-3.5 text-[14px] leading-relaxed">{post.caption}</p>}

        {post.reasonWhySeeing && (
          <div className="mx-3.5 mt-2.5 flex w-fit items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1">
            <InfoIcon size={12} className="text-text-muted" />
            <span className="text-[11px] text-text-muted">{post.reasonWhySeeing}</span>
          </div>
        )}

        <div className="flex items-center gap-4 border-b border-border px-3.5 py-3.5">
          <button
            onClick={toggleLike}
            aria-label={liked ? "Quitar me gusta" : "Me gusta"}
            className="flex items-center gap-1.5 text-text-muted hover:text-accent-2"
          >
            {liked ? <HeartFilledIcon size={22} className="text-accent-2" /> : <HeartIcon size={22} />}
            <span className="text-[13px]">{likeCount}</span>
          </button>
          <span className="flex items-center gap-1.5 text-text-muted">
            <CommentIcon size={22} />
            <span className="text-[13px]">{post.commentCount}</span>
          </span>
          <span className="flex-1" />
          <ShareIcon size={22} className="text-text-muted" />
          <button
            onClick={toggleSave}
            aria-label={saved ? "Quitar de guardados" : "Guardar"}
            className="text-text-muted hover:text-text"
          >
            {saved ? <BookmarkFilledIcon size={22} className="text-accent" /> : <BookmarkIcon size={22} />}
          </button>
        </div>

        <div className="px-3.5 pb-2 pt-3.5">
          <span className="font-display text-[11.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">
            {comments.length} comentarios
          </span>
        </div>

        <div className="flex flex-col gap-4 px-3.5 pb-6">
          {comments.length === 0 && (
            <p className="py-4 text-center text-[13px] text-text-muted">Sé el primero en comentar.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Link href={`/u/${c.author.id}`} className="flex-shrink-0">
                <Avatar seed={c.author.username} src={c.author.avatarUrl} size={30} />
              </Link>
              <div className="flex-1">
                <p className="text-[13px] leading-relaxed">
                  <Link href={`/u/${c.author.id}`} className="font-semibold hover:underline">
                    {c.author.username}
                  </Link>{" "}
                  <span className="text-text-muted">{c.body}</span>
                </p>
                <div className="mt-0.5 text-[11px] text-text-muted">
                  {new Date(c.createdAt).toLocaleDateString("es-AR")}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 flex items-center gap-2.5 border-t border-border bg-surface px-3.5 py-3">
        <input
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmitComment()}
          placeholder="Agregá un comentario..."
          className="flex-1 rounded-full border border-border bg-transparent px-3.5 py-2 text-[13px] outline-none focus:border-accent"
        />
        <button onClick={onSubmitComment} disabled={!commentBody.trim() || posting} aria-label="Enviar">
          <SendIcon size={20} className={commentBody.trim() ? "text-accent" : "text-text-muted"} />
        </button>
      </div>
    </main>
  );
}
