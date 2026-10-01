export function DueItem({
  href,
  memo,
  name,
  dollars,
  paid,
  hash,
  meta,
}: {
  href: string;
  memo: string;
  name: string;
  dollars: string;
  paid: boolean;
  hash?: string | null;
  meta?: string;
}) {
  return (
    <a className={paid ? "item paid" : "item"} href={href}>
      <span>
        {memo}
        <br />
        <small>
          {meta ?? `${name} · ${paid ? "paid" : "due"}`}
        </small>
        {hash ? (
          <>
            <br />
            <small className="hash">{hash}</small>
          </>
        ) : null}
      </span>
      <b>{dollars}</b>
    </a>
  );
}
