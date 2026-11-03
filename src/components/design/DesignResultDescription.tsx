"use client";

import React from "react";

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

function stripMd(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function parseDescription(raw: string): Block[] {
  const lines = String(raw || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd());

  const blocks: Block[] = [];
  let list: string[] = [];
  let para: string[] = [];

  const flushList = () => {
    if (!list.length) return;
    blocks.push({ type: "list", items: list.map(stripMd) });
    list = [];
  };
  const flushPara = () => {
    if (!para.length) return;
    blocks.push({ type: "paragraph", text: stripMd(para.join(" ")) });
    para = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      flushPara();
      continue;
    }

    const heading =
      trimmed.match(/^#{1,3}\s+(.+)$/) ||
      trimmed.match(/^\*\*(.+)\*\*:?\s*$/);
    const bullet =
      trimmed.match(/^[-*•]\s+(.+)$/) || trimmed.match(/^\d+[.)]\s+(.+)$/);

    if (heading && !bullet && trimmed.length < 90) {
      flushList();
      flushPara();
      blocks.push({ type: "heading", text: stripMd(heading[1]) });
      continue;
    }

    if (bullet) {
      flushPara();
      list.push(bullet[1]);
      continue;
    }

    flushList();
    para.push(trimmed);
  }

  flushList();
  flushPara();
  return blocks;
}

/** ChatGPT often leads with a short opener, then the image, then the rest. */
export function splitChatGptReply(text?: string | null): { lead: string; body: string } {
  const raw = String(text || "").trim();
  if (!raw) return { lead: "", body: "" };
  const parts = raw.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (
    parts.length >= 2 &&
    parts[0].length > 0 &&
    parts[0].length <= 240 &&
    !/^[-*•]/.test(parts[0]) &&
    !/^#{1,3}\s/.test(parts[0])
  ) {
    return { lead: parts[0], body: parts.slice(1).join("\n\n") };
  }
  return { lead: "", body: raw };
}

export default function DesignResultDescription({
  text,
  fallback,
  className = "",
}: {
  text?: string | null;
  fallback?: string;
  className?: string;
}) {
  const content = String(text || "").trim();
  if (!content) {
    return fallback ? (
      <p className={`text-[16px] leading-[1.75] text-[#0d0d0d] ${className}`}>{fallback}</p>
    ) : null;
  }

  const blocks = parseDescription(content);

  return (
    <div
      className={`max-w-[46rem] space-y-[14px] text-[16px] leading-[1.75] text-[#0d0d0d] ${className}`}
    >
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h3
              key={`h-${i}`}
              className="pt-1 text-[16px] font-semibold tracking-[-0.01em] text-[#0d0d0d]"
            >
              {block.text}
            </h3>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={`l-${i}`} className="list-disc space-y-2 pl-6 marker:text-[#0d0d0d]">
              {block.items.map((item, j) => (
                <li key={`li-${i}-${j}`} className="pl-1">
                  {item}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={`p-${i}`} className="whitespace-pre-wrap">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
