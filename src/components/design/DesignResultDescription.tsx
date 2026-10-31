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
      trimmed.match(/^\*\*(.+)\*\*:?\s*$/) ||
      trimmed.match(/^(.+):\s*$/);
    const bullet = trimmed.match(/^[-*•]\s+(.+)$/) || trimmed.match(/^\d+[.)]\s+(.+)$/);

    if (heading && !bullet && trimmed.length < 80) {
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

export default function DesignResultDescription({
  text,
  fallback,
}: {
  text?: string | null;
  fallback?: string;
}) {
  const content = String(text || "").trim();
  if (!content) {
    return fallback ? (
      <p className="mt-3 text-[15px] leading-6 text-[#0d0d0d]">{fallback}</p>
    ) : null;
  }

  const blocks = parseDescription(content);

  return (
    <div className="mt-3 space-y-3 text-[15px] leading-6 text-[#0d0d0d]">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h3
              key={`h-${i}`}
              className="pt-1 text-[15px] font-semibold tracking-tight text-[#0d0d0d]"
            >
              {block.text}
            </h3>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={`l-${i}`} className="list-disc space-y-1.5 pl-5 text-[#0d0d0d]">
              {block.items.map((item, j) => (
                <li key={`li-${i}-${j}`} className="pl-0.5">
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
