"use client";

import React, { useEffect, useRef, useState } from "react";

const accent = "#E85D75";

type Props = {
  title?: string;
  value: string;
  onChange: (html: string) => void;
  onRemove?: () => void;
  dragHandle?: boolean;
  /** Inline document cell (company / prepared for) — no section title */
  inline?: boolean;
  className?: string;
  onFocusChange?: (focused: boolean) => void;
};

function ToolBtn({
  title,
  onMouseDown,
  children,
}: {
  title: string;
  onMouseDown: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={onMouseDown}
      className="inline-flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-sm text-gray-600 hover:bg-gray-100"
    >
      {children}
    </button>
  );
}

export default function MakerRichTextEditor({
  title,
  value,
  onChange,
  onRemove,
  dragHandle = true,
  inline = false,
  className = "",
  onFocusChange,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [fontSize, setFontSize] = useState("3");
  const [fontName, setFontName] = useState("Arial");
  const [blockStyle, setBlockStyle] = useState("p");
  const syncing = useRef(false);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || syncing.current) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || "";
    }
  }, [value]);

  const setFocus = (v: boolean) => {
    setFocused(v);
    onFocusChange?.(v);
  };

  const run = (e: React.MouseEvent, command: string, arg?: string) => {
    e.preventDefault();
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const applyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = window.prompt("Enter URL");
    if (!url) return;
    run(e, "createLink", url);
  };

  const applyColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    editorRef.current?.focus();
    document.execCommand("foreColor", false, e.target.value);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const toolbar = (
    <div
      className={`no-print flex flex-wrap items-center gap-0.5 bg-white px-2 py-1.5 ${
        inline
          ? "rounded-t-md border border-b-0 border-[#E85D75]"
          : "border-y border-gray-100 bg-gray-50"
      }`}
    >
      <ToolBtn title="Bold" onMouseDown={(e) => run(e, "bold")}>
        <strong>B</strong>
      </ToolBtn>
      <ToolBtn title="Italic" onMouseDown={(e) => run(e, "italic")}>
        <em>I</em>
      </ToolBtn>
      <ToolBtn title="Underline" onMouseDown={(e) => run(e, "underline")}>
        <span className="underline">U</span>
      </ToolBtn>
      <ToolBtn title="Strikethrough" onMouseDown={(e) => run(e, "strikeThrough")}>
        <span className="line-through">S</span>
      </ToolBtn>
      <span className="mx-1 h-5 w-px bg-gray-200" />
      <ToolBtn title="Numbered list" onMouseDown={(e) => run(e, "insertOrderedList")}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M8 6h12M8 12h12M8 18h12M3 6h1v1H3V6zm0 5.5h2v.5H4v.5h1v.5H3M3 17h2v1H3"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </ToolBtn>
      <ToolBtn title="Bullet list" onMouseDown={(e) => run(e, "insertUnorderedList")}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </ToolBtn>
      <ToolBtn title="Subscript" onMouseDown={(e) => run(e, "subscript")}>
        x<sub className="text-[9px]">2</sub>
      </ToolBtn>
      <ToolBtn title="Superscript" onMouseDown={(e) => run(e, "superscript")}>
        x<sup className="text-[9px]">2</sup>
      </ToolBtn>
      <span className="mx-1 h-5 w-px bg-gray-200" />
      <select
        value={blockStyle}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          setBlockStyle(e.target.value);
          editorRef.current?.focus();
          document.execCommand("formatBlock", false, e.target.value);
          if (editorRef.current) onChange(editorRef.current.innerHTML);
        }}
        className="h-7 rounded border border-gray-200 bg-white px-1.5 text-xs text-gray-700"
      >
        <option value="p">Normal</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>
      <select
        value={fontSize}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          setFontSize(e.target.value);
          editorRef.current?.focus();
          document.execCommand("fontSize", false, e.target.value);
          if (editorRef.current) onChange(editorRef.current.innerHTML);
        }}
        className="h-7 rounded border border-gray-200 bg-white px-1.5 text-xs text-gray-700"
      >
        <option value="1">Small</option>
        <option value="3">Normal</option>
        <option value="5">Large</option>
        <option value="7">Huge</option>
      </select>
      <select
        value={fontName}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          setFontName(e.target.value);
          editorRef.current?.focus();
          document.execCommand("fontName", false, e.target.value);
          if (editorRef.current) onChange(editorRef.current.innerHTML);
        }}
        className="h-7 rounded border border-gray-200 bg-white px-1.5 text-xs text-gray-700"
      >
        <option value="Arial">Arial</option>
        <option value="Georgia">Georgia</option>
        <option value="Times New Roman">Times</option>
        <option value="Verdana">Verdana</option>
      </select>
      <label className="inline-flex h-7 cursor-pointer items-center px-1.5 text-xs text-gray-600 hover:bg-gray-100">
        <span className="font-semibold">
          A
          <span className="mt-0.5 block h-0.5 w-full rounded" style={{ backgroundColor: accent }} />
        </span>
        <input type="color" defaultValue={accent} className="absolute h-0 w-0 opacity-0" onChange={applyColor} />
      </label>
      <ToolBtn title="Align left" onMouseDown={(e) => run(e, "justifyLeft")}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M4 6h16M4 12h10M4 18h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </ToolBtn>
      <ToolBtn title="Align center" onMouseDown={(e) => run(e, "justifyCenter")}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M4 6h16M7 12h10M5 18h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </ToolBtn>
      <ToolBtn title="Align right" onMouseDown={(e) => run(e, "justifyRight")}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M4 6h16M10 12h10M6 18h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </ToolBtn>
      <ToolBtn title="Clear formatting" onMouseDown={(e) => run(e, "removeFormat")}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M4 5h12l-4 14H8L4 5zm12 4h4M6 9h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </ToolBtn>
      {dragHandle ? (
        <span className="ml-auto inline-flex h-7 w-7 cursor-grab items-center justify-center text-gray-400" title="Drag">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5v14M5 12h14M8 8l4-4 4 4M8 16l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
      ) : (
        <span className="ml-auto" />
      )}
      {onRemove ? (
        <button
          type="button"
          title="Remove section"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="no-print print:hidden inline-flex h-7 w-7 items-center justify-center rounded text-[#E85D75] hover:bg-[#E85D75]/10"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : null}
      <div className="basis-full" />
      <ToolBtn title="Insert link" onMouseDown={applyLink}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M10 13a5 5 0 007.07 0l1.4-1.4a5 5 0 00-7.07-7.07L10 6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M14 11a5 5 0 00-7.07 0l-1.4 1.4a5 5 0 007.07 7.07L14 18"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </ToolBtn>
    </div>
  );

  return (
    <div
      className={`relative bg-white print:border-0 print:shadow-none ${
        inline
          ? focused
            ? "border border-[#E85D75]"
            : "border border-transparent hover:border-gray-200"
          : `rounded-lg border ${focused ? "border-[#E85D75]/60 shadow-sm" : "border-gray-200"}`
      } ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {!inline && title ? (
        <div className="flex items-center justify-between gap-2 px-3 pt-3">
          <h3 className="text-base font-semibold" style={{ color: accent }}>
            {title}
          </h3>
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="no-print print:hidden inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#E85D75] hover:bg-[#E85D75]/10"
              title="Remove section"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              Remove
            </button>
          ) : null}
        </div>
      ) : null}

      {focused ? toolbar : null}

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label={title || "Editable text"}
        className={`min-h-[100px] px-3 py-3 text-sm leading-relaxed text-gray-800 outline-none [&_a]:text-blue-600 [&_a]:underline [&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:ml-5 [&_ul]:list-disc ${
          inline ? "min-h-[120px]" : ""
        }`}
        onFocus={() => setFocus(true)}
        onBlur={() => {
          window.setTimeout(() => setFocus(false), 180);
          if (editorRef.current) onChange(editorRef.current.innerHTML);
        }}
        onInput={() => {
          syncing.current = true;
          if (editorRef.current) onChange(editorRef.current.innerHTML);
          window.setTimeout(() => {
            syncing.current = false;
          }, 0);
        }}
      />
    </div>
  );
}

export const DEFAULT_COMPANY_HTML = `
<p><strong>SANTOSHI INTERIOR</strong></p>
<p>Mes Junction, Vidhyanagar Colony, Goa, Sancoale, Goa 403726</p>
<p>GST NO 30LJIPS0941L1ZV</p>
<p>VASCO DA GAMA, Goa</p>
<p>9766195560</p>
<p>santoshisalessouthgoa@gmail.com</p>
`.trim();

export function defaultPreparedHtml(opts?: {
  clientName?: string;
  projectTitle?: string;
  phone?: string;
  dateLabel?: string;
  reference?: string;
}) {
  const name = opts?.clientName || "Client";
  const project = opts?.projectTitle || "INTERIOR WORK";
  const phone = opts?.phone || "—";
  const date =
    opts?.dateLabel ||
    new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const ref = opts?.reference || "—";
  return `
<p><strong>Prepared for</strong></p>
<p><strong>${name}</strong></p>
<p>${project}</p>
<p>${phone}</p>
<p>${date}</p>
<p>Ref: ${ref}</p>
`.trim();
}

export const DEFAULT_BANK_HTML = `
<p><strong>NAME</strong> SANTOSHI INTERIOR</p>
<p><strong>Account number</strong> —</p>
<p><strong>IFSC</strong> —</p>
<p><strong>Google PAY NUMBER</strong> —</p>
<p><strong>UPI ID</strong> —</p>
`.trim();

export const DEFAULT_TERMS_HTML = `
<p>1. Prices are inclusive of applicable taxes unless stated otherwise.</p>
<p>2. Quotation is valid for 15 days from the date of issue.</p>
<p>3. Work will commence after advance payment as per the payment plan.</p>
`.trim();
