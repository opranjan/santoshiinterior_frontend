import SignInForm from "@/components/auth/SignInForm";
import { CrmBootScreen } from "@/components/ui/loader/CrmLoader";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Santoshi Interior CRM sign in",
};

export default function SignIn() {
  return (
    <Suspense fallback={<CrmBootScreen label="Loading sign in" />}>
      <SignInForm />
    </Suspense>
  );
}
