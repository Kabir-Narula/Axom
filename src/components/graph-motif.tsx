import { cn } from "@/lib/utils";

// Hand-placed nodes for a calm, balanced constellation.
const NODES = [
  { id: "a", x: 90, y: 70, r: 4 },
  { id: "b", x: 210, y: 130, r: 5, accent: true },
  { id: "c", x: 150, y: 220, r: 4 },
  { id: "d", x: 320, y: 60, r: 4 },
  { id: "e", x: 360, y: 175, r: 5 },
  { id: "f", x: 470, y: 110, r: 4 },
  { id: "g", x: 520, y: 215, r: 4 },
  { id: "h", x: 250, y: 280, r: 3 },
];

const EDGES: [string, string][] = [
  ["a", "b"],
  ["b", "c"],
  ["b", "d"],
  ["b", "e"],
  ["d", "f"],
  ["e", "f"],
  ["e", "g"],
  ["c", "h"],
  ["e", "h"],
  ["f", "g"],
];

const byId = (id: string) => NODES.find((n) => n.id === id)!;

/**
 * Static, monochrome knowledge-graph motif — a quiet visual that mirrors what
 * the product actually builds. One node carries the accent; nothing animates.
 */
export function GraphMotif({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 320"
      fill="none"
      className={cn("h-auto w-full", className)}
      aria-hidden
    >
      <g stroke="#27272a" strokeWidth="1">
        {EDGES.map(([from, to]) => {
          const a = byId(from);
          const b = byId(to);
          return <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
      </g>
      {NODES.map((n) => (
        <g key={n.id}>
          {n.accent && (
            <circle cx={n.x} cy={n.y} r={n.r + 6} fill="#a78bfa" opacity="0.12" />
          )}
          <circle
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill={n.accent ? "#a78bfa" : "#52525b"}
            stroke="#09090b"
            strokeWidth="2"
          />
        </g>
      ))}
    </svg>
  );
}
