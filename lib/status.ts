export function publicStatus(
  status: "unpaid" | "paid",
  dueDate: string | null,
  today: string,
): "unpaid" | "paid" | "expired" {
  if (status === "paid") return "paid";
  if (dueDate && dueDate < today) return "expired";
  return "unpaid";
}
