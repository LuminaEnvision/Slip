import { OpenLink } from "@/components/open-link";
import { WriteForm } from "@/components/write-form";
import { requireBook } from "@/lib/book";

export const dynamic = "force-dynamic";

export default async function AcceptPage() {
  await requireBook("/accept");
  return (
    <>
      <WriteForm kind="bill" />
      <OpenLink />
    </>
  );
}
