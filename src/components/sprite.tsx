"use client";

import { useEffect, useRef } from "react";

import { castMember, paint, skin, tokenResolver } from "../ui/paint";

// One employee's sprite at a whole-pixel scale, centred in a square of `size`.
export function Sprite({ species, size }: { readonly species: string; readonly size: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const member = castMember(species);
    const ctx = el?.getContext("2d");
    if (el === null || member === undefined || ctx === null || ctx === undefined) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    const scale = Math.max(1, Math.floor(size / 16));
    const pad = Math.floor((size - 16 * scale) / 2);
    paint(ctx, member.sprite, scale, pad, pad, skin(member), tokenResolver(el));
  }, [species, size]);

  return <canvas ref={canvas} width={size} height={size} className="sprite" aria-hidden="true" />;
}
