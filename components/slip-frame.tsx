import { shortAddress } from "@/lib/format";

export function SlipFrame({
  paid = false,
  stampHit = false,
  state,
  dollars,
  exact,
  payeeName,
  payeeSlug,
  payeeAddress,
  memo,
  children,
  stub,
  linkPayee = false,
}: {
  paid?: boolean;
  stampHit?: boolean;
  state: string;
  dollars: string;
  exact: string;
  payeeName: string;
  payeeSlug: string;
  payeeAddress: string;
  memo: string;
  children?: React.ReactNode;
  stub?: React.ReactNode;
  linkPayee?: boolean;
}) {
  return (
    <>
      <div className="slip">
        {paid ? <div className={stampHit ? "stamp hit" : "stamp"}>PAID</div> : null}
        <span className="state">{state}</span>
        <div className="amt">
          {dollars}
          <small>USDG</small>
        </div>
        <div className="kv">
          <span>Pay to</span>
          <span>
            {linkPayee ? <a href={`/p/${payeeSlug}`}>{payeeName}</a> : payeeName}
          </span>
        </div>
        <div className="kv">
          <span>Wallet</span>
          <span>{shortAddress(payeeAddress)}</span>
        </div>
        <div className="kv">
          <span>For</span>
          <span>{memo}</span>
        </div>
        <div className="kv">
          <span>Exact</span>
          <span>{exact}</span>
        </div>
        {children}
      </div>
      {stub}
    </>
  );
}
