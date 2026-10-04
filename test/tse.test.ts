import { expect, test } from "bun:test";
import { verifiedJwsPayload } from "../src/tse";

test("rejects a result payload without a valid JWS envelope", async () => {
  await expect(verifiedJwsPayload("not-a-jws", "-----BEGIN PUBLIC KEY-----\ninvalid\n-----END PUBLIC KEY-----")).rejects.toThrow("JWS");
});
