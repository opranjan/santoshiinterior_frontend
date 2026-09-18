import WebsiteTestimonials from "@/components/settings/WebsiteTestimonials";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Website Testimonials",
  description: "Manage testimonials shown on the public website",
};

export default function Page() {
  return <WebsiteTestimonials />;
}
