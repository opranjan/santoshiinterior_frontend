"use client";

import React from "react";

export const OFFER_TEMPLATE_BODY = `Hi {{1}},

Looking to transform your home or workspace?

Santoshi Interiors offers thoughtfully designed interior solutions for:

{{2}}

Share your requirements with us and let our team help you create a space that feels truly yours.

Contact Santoshi Interiors today to get started.`;

export const OFFER_SERVICES_LINE =
  "🏠 Home Interiors  🛋 Living Rooms  🛏 Bedrooms  🍳 Modular Kitchens  🏢 Office Interiors";

export const DEFAULT_OFFER_HEADER_IMAGE =
  "https://images.unsplash.com/photo-1600585154340-0ef3d5b58525?auto=format&fit=crop&w=1200&q=80";

export type TemplatePreviewModel = {
  name?: string;
  headerFormat?: string | null;
  bodyText?: string | null;
  footerText?: string | null;
  buttons?: Array<{ type: string; text: string }>;
};

type Props = {
  template?: TemplatePreviewModel | null;
  customerName: string;
  servicesText: string;
  headerImage?: string | null;
};

function firstName(name: string) {
  const raw = String(name || "there").trim();
  return raw.split(/\s+/)[0] || "there";
}

function fillBody(template: string, values: string[]) {
  return template.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n) => {
    const value = values[Number(n) - 1];
    return value == null || value === "" ? `{{${n}}}` : value;
  });
}

export default function WhatsAppTemplatePreview({
  template,
  customerName,
  servicesText,
  headerImage,
}: Props) {
  const isOffer = !template?.name || template.name === "interior_design_offer";
  const rawBody =
    template?.bodyText?.trim() ||
    (isOffer ? OFFER_TEMPLATE_BODY : "Hi {{1}},\n\n{{2}}");
  const body = fillBody(rawBody, [
    firstName(customerName),
    servicesText.trim() || OFFER_SERVICES_LINE,
  ]);
  const showImage =
    String(template?.headerFormat || "").toUpperCase() === "IMAGE" || isOffer;
  const imageSrc = headerImage || DEFAULT_OFFER_HEADER_IMAGE;
  const [imgOk, setImgOk] = React.useState(true);
  React.useEffect(() => {
    setImgOk(true);
  }, [imageSrc]);
  const buttons =
    template?.buttons?.length
      ? template.buttons
      : isOffer
        ? [
            { type: "URL", text: "Visit website" },
            { type: "PHONE_NUMBER", text: "Call phone" },
          ]
        : [];
  const now = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-[#efeae2] dark:border-gray-700">
      <div
        className="flex items-center justify-between bg-[#075e54] px-3 py-2 text-xs font-medium text-white"
        role="heading"
        aria-level={4}
      >
        Template preview
        <span className="opacity-80">▶</span>
      </div>
      <div className="p-3">
        <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-900">
          {showImage ? (
            imgOk ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageSrc}
                alt=""
                className="h-36 w-full object-cover"
                onError={() => setImgOk(false)}
              />
            ) : (
              <div className="flex h-36 items-center justify-center bg-gradient-to-br from-stone-200 to-stone-500 text-xs text-white">
                Interior offer image
              </div>
            )
          ) : null}
          <div className="whitespace-pre-wrap px-3 py-2.5 text-[13px] leading-5 text-gray-800 dark:text-white/90">
            {body}
          </div>
          {template?.footerText ? (
            <p className="px-3 pb-1 text-[11px] text-gray-400">{template.footerText}</p>
          ) : null}
          <div className="flex items-center justify-end gap-1 px-3 pb-2 text-[10px] text-gray-400">
            {now}
            <span className="text-[#53bdeb]">✓✓</span>
          </div>
          {buttons.map((btn) => (
            <div
              key={`${btn.type}-${btn.text}`}
              className="border-t border-gray-100 px-3 py-2 text-center text-[13px] font-medium text-[#00a5f4] dark:border-gray-800"
            >
              {btn.type === "PHONE_NUMBER" ? "📞 " : ""}
              {btn.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
