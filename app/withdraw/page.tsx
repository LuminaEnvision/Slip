import type { Metadata } from "next";
import WithdrawFees from "@/components/withdraw-fees";

export const metadata: Metadata = {
  title: "Fees",
  description: "Withdraw the USDG fee collected by the Slip pay contract.",
};

export default function WithdrawPage() {
  return <WithdrawFees />;
}
