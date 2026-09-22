import PublicRfqForm from "@/components/procurement/PublicRfqForm";

export default async function PublicRfqPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PublicRfqForm token={token} />;
}
