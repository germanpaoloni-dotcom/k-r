"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@gossip/ui";
import {
  HeartIcon,
  HeartFilledIcon,
  CommentIcon,
  BookmarkIcon,
  BookmarkFilledIcon,
  ShareIcon,
  MapPinIcon,
  MoreHorizontalIcon,
  InfoIcon,
  XIcon,
} from "./icons";
import { dismissFromForYou, type PostDto } from "../lib/api";
import { usePostInteractions } from "../lib/usePostInteractions";

export function PostCard({
  post,
  variant = "feed",
  onDismissed,
}: {
  post: PostDto;
  /** "feed": fila de autor + badge de recomendador. "compact": para el perfil, sin repetir al dueño. */
  variant?: "feed" | "compact";
  onDismissed?: (postId: string) => void;
}) {
  const router = useRouter();
  const { liked, likeCount, saved, toggleLike, toggleSave } = usePostInteractions(post);
  const [dismissed, setDismissed] = useState(false);

  async function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    setDismissed(true);
    await dismissFromForYou(post.id);
    onDismissed?.(post.id);
  }

  if (dismissed) return null;

  const media = post.media[0];

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/p/${post.id}`)}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/p/${post.id}`)}
      className="block cursor-pointer overflow-hidden rounded-md border border-border bg-surface"
    >
      {variant === "feed" && (
        <div className="flex items-center gap-2.5 px-3.5 pb-2.5 pt-3">
          <Link href={`/u/${post.author.id}`} onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
            <Avatar seed={post.author.username} src={post.author.avatarUrl} size={36} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/u/${post.author.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[13.5px] font-semibold text-text hover:underline"
            >
              {post.author.username}
            </Link>
            {post.location && (
              <div className="flex items-center gap-1 text-[11.5px] text-text-muted">
                <MapPinIcon size={11} />
                {post.location.name} · {post.location.city}
              </div>
            )}
          </div>
          <MoreHorizontalIcon size={18} className="text-text-muted" />
        </div>
      )}

      {media && (
        <div className="flex h-[280px] items-center justify-center bg-surface-2">
          {media.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.url} alt="" className="h-full w-full object-cover" />
          ) : (
            <video src={media.url} className="h-full w-full object-cover" muted />
          )}
        </div>
      )}
      {!media && <div className="h-[70px]" />}

      {post.caption && (
        <p className="px-3.5 pb-1 pt-2.5 text-[13.5px] leading-relaxed text-text">{post.caption}</p>
      )}

      {variant === "feed" && post.reasonWhySeeing && (
        <div className="mx-3.5 mt-2 flex w-fit items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1">
          <InfoIcon size={12} className="text-text-muted" />
          <span className="text-[11px] text-text-muted">{post.reasonWhySeeing}</span>
          {onDismissed && (
            <button
              onClick={handleDismiss}
              aria-label="No me interesa"
              className="ml-0.5 text-text-muted hover:text-text"
            >
              <XIcon size={11} />
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 px-3.5 pb-3.5 pt-3">
        <button
          onClick={(e) => { e.stopPropagation(); toggleLike(); }}
          aria-label={liked ? "Quitar me gusta" : "Me gusta"}
          className="flex items-center gap-1.5 text-text-muted hover:text-accent-2"
        >
          {liked ? <HeartFilledIcon size={20} className="text-accent-2" /> : <HeartIcon size={20} />}
          <span className="text-[12.5px]">{likeCount}</span>
        </button>
        <span className="flex items-center gap-1.5 text-text-muted">
          <CommentIcon size={20} />
          <span className="text-[12.5px]">{post.commentCount}</span>
        </span>
        <span className="flex-1" />
        {variant === "feed" && <ShareIcon size={20} className="text-text-muted" />}
        <button
          onClick={(e) => { e.stopPropagation(); toggleSave(); }}
          aria-label={saved ? "Quitar de guardados" : "Guardar"}
          className="text-text-muted hover:text-text"
        >
          {saved ? <BookmarkFilledIcon size={20} className="text-accent" /> : <BookmarkIcon size={20} />}
        </button>
      </div>
    </div>
  );
}
