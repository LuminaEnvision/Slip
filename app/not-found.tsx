export default function NotFound() {
  return (
    <section className="slip">
      <h2>No slip here</h2>
      <p className="sub">That payee or due link does not exist.</p>
      <a className="btn" href="/">
        Write a slip
      </a>
    </section>
  );
}
