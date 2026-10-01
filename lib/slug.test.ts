import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { slugBaseFromName } from "./slug";

describe("payee slugs", () => {
  it("uses the name before an em dash", () => {
    assert.equal(slugBaseFromName("Maya — contractor"), "maya");
  });

  it("keeps a single name", () => {
    assert.equal(slugBaseFromName("Maya"), "maya");
  });

  it("slugifies a shop name without a dash", () => {
    assert.equal(slugBaseFromName("North Gate Studio"), "north-gate-studio");
  });

  it("uses the name before a comma", () => {
    assert.equal(slugBaseFromName("Maya, design"), "maya");
  });
});
