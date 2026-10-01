import { OpenLink } from "@/components/open-link";
import { WriteForm } from "@/components/write-form";
import { requireBook } from "@/lib/book";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requireBook("/");
  return (
    <>
      <WriteForm kind="pay" />
      <OpenLink />
    </>
  );
}
