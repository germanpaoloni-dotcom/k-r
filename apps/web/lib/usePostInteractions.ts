"use client";

import { useState } from "react";
import { likePost, unlikePost, savePost, unsavePost, type PostDto } from "./api";

export function usePostInteractions(post: PostDto) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [saved, setSaved] = useState(post.savedByMe);

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    await (next ? likePost(post.id) : unlikePost(post.id));
  }

  async function toggleSave() {
    const next = !saved;
    setSaved(next);
    await (next ? savePost(post.id) : unsavePost(post.id));
  }

  return { liked, likeCount, saved, toggleLike, toggleSave };
}
