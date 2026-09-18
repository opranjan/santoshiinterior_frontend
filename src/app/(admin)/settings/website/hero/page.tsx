import WebsiteHeroBanners from "@/components/settings/WebsiteHeroBanners";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Home Banner",
  description: "Manage homepage hero banners and side offers",
};

export default function Page() {
  return <WebsiteHeroBanners />;
}
