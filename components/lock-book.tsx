"use client";

export function LockBook() {
  return (
    <button
      className="textbtn"
      type="button"
      onClick={async () => {
        await fetch("/api/book", { method: "DELETE" });
        window.location.href = "/unlock";
      }}
    >
      Lock book
    </button>
  );
}
