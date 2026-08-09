import TemplateEditor from "@/components/settings/template-editor/TemplateEditor";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Edit Quotation Template",
  description: "Drag-and-drop quotation template editor",
};

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await Promise.resolve(params);
  return <TemplateEditor templateId={id} />;
}
