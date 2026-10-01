import ProfilePageView from "@/components/user-profile/ProfilePageView";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Profile Settings",
  description: "Santoshi Interior CRM user profile",
};

export default function Profile() {
  return <ProfilePageView />;
}
