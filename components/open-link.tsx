"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OpenLink() {
  const router = useRouter();
  const [error, setError] = useState("");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = String(new FormData(event.currentTarget).get("link") ?? "").trim();
    const fromPath = raw.match(/\/d\/([A-Za-z0-9_-]+)/);
    const id = fromPath?.[1] ?? raw;
    if (!/^[A-Za-z0-9_-]{8,}$/.test(id)) {
      setError("Paste a due link.");
      return;
    }
    router.push(`/d/${id}`);
  }

  return (
    <form onSubmit={onSubmit}>
      <label className="f" htmlFor="pasted">
        Or paste a slip link
      </label>
      <input id="pasted" name="link" placeholder="https://…/d/…" spellCheck={false} autoCapitalize="off" />
      <div className="err" role="alert">
        {error}
      </div>
      <button className="btn ghost" type="submit">
        Open slip
      </button>
    </form>
  );
}
