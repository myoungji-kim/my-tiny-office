"use client";

import { useEffect, useRef } from "react";

import { castMember, paint, skin, TILES, tokenResolver, PALETTE } from "../ui/paint";

const SCALE = 3;
const TILE = 16 * SCALE;
const SEATS = [
  { key: "cat", col: 0.25 },
  { key: "bunny", col: 3.25 },
  { key: "chick", col: 6.25 },
];

// Three of the cast at their desks, so the first screen shows the office
// instead of describing it.
export function OfficePeek() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const g = el?.getContext("2d");
    if (el === null || g === null || g === undefined) return;
    g.imageSmoothingEnabled = false;
    const resolve = tokenResolver(el);
    const cols = el.width / TILE;
    const rows = el.height / TILE;
    let tick = 0;

    const draw = () => {
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) paint(g, TILES.floor, SCALE, x * TILE, y * TILE, undefined, resolve);
      for (let x = 0; x < cols; x++) paint(g, TILES.wall, SCALE, x * TILE, 0, undefined, resolve);
      paint(g, TILES.window, SCALE, TILE, 0, undefined, resolve);
      paint(g, TILES.board, SCALE, 3 * TILE, 0, undefined, resolve);
      paint(g, TILES.shelf, SCALE, 6 * TILE, 0, undefined, resolve);
      SEATS.forEach((seat, i) => {
        const member = castMember(seat.key);
        if (member === undefined) return;
        const dx = seat.col * TILE;
        const dy = 3 * TILE;
        // a one-pixel idle bob is enough to say these are alive
        const lift = (tick + i) % 4 === 0 ? -SCALE : 0;
        paint(g, TILES.chair, SCALE, dx, dy - TILE, undefined, resolve);
        paint(g, member.sprite, SCALE, dx, dy - TILE + lift, skin(member), resolve);
        paint(g, TILES.deskL, SCALE, dx, dy, undefined, resolve);
        paint(g, TILES.deskR, SCALE, dx + TILE, dy, undefined, resolve);
        paint(g, TILES.monitor, SCALE, dx + TILE / 2, dy - 2 * SCALE, { M: PALETTE.M ?? "" }, resolve);
      });
    };
    draw();
    const timer = setInterval(() => {
      tick = (tick + 1) % 4;
      draw();
    }, 820);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="peek">
      <canvas ref={canvas} width={408} height={216} aria-hidden="true" />
    </div>
  );
}
