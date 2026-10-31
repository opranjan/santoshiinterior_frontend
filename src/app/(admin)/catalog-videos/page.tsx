import CatalogVideosWorkspace from "@/components/catalog-videos/CatalogVideosWorkspace";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Catalog Videos" };

export default function Page() {
  return <CatalogVideosWorkspace />;
}
