import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { bookUnlocked, localBookHint, safeNext } from "@/lib/book";

export const dynamic = "force-dynamic";

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const query = await searchParams;
  const next = safeNext(query.next);
  if (await bookUnlocked()) redirect(next);

  const host = (await headers()).get("host") ?? "";
  const hint = localBookHint(host);

  return (
    <article className="slip">
      <h2>Private book</h2>
      <p className="sub">Receipts, the spreadsheet, and new slips stay behind this key. A link you send still opens that one payment.</p>
      {query.error ? (
        <div className="err" role="alert">
          That key did not open the book.
        </div>
      ) : null}
      <form action="/api/book" method="post">
        <input type="hidden" name="next" value={next} />
        <label className="f" htmlFor="book-key">
          Book key
        </label>
        <input id="book-key" name="key" type="password" autoComplete="current-password" required />
        <button className="btn" type="submit">
          Open book
        </button>
      </form>
      {hint ? (
        <p className="sub">
          On this computer the key is <span className="addr">{hint}</span>
        </p>
      ) : (
        <p className="sub">The person running this site sets the book key.</p>
      )}
    </article>
  );
}
