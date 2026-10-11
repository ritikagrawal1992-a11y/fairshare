import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { once } from "node:events";
import { createApp } from "../server/app";
async function fixture(t: TestContext) {
  const { app, db } = createApp(":memory:", false),
    server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    db.close();
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing port");
  return async (
    path: string,
    method = "GET",
    body?: unknown,
    headers?: Record<string, string>,
  ) => {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api${path}`,
      {
        method,
        headers: {
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
    );
    return {
      status: response.status,
      data: response.status === 204 ? null : await response.json(),
    };
  };
}
test("expense splits preserve cents with deterministic remainder and zero-sum balances", async (t) => {
  const call = await fixture(t);
  assert.equal(
    (
      await call("/expenses", "POST", {
        label: "Lunch",
        payer: "Alex",
        cents: 100,
        participants: ["Sam", "Jordan", "Alex", "Sam"],
      })
    ).status,
    201,
  );
  const { balances, settlements } = (await call("/balances")).data;
  assert.equal(
    balances.reduce((n: number, b: { cents: number }) => n + b.cents, 0),
    0,
  );
  assert.deepEqual(balances, [
    { person: "Alex", cents: 66 },
    { person: "Jordan", cents: -33 },
    { person: "Sam", cents: -33 },
  ]);
  assert.equal(
    settlements.reduce((n: number, s: { cents: number }) => n + s.cents, 0),
    66,
  );
});

test("expense rejects invalid payer, fractional cents, and empty participants", async (t) => {
  const call = await fixture(t),
    p = {
      label: "Lunch",
      payer: "Alex",
      cents: 100,
      participants: ["Alex", "Sam"],
    };
  assert.equal(
    (await call("/expenses", "POST", { ...p, payer: "Jordan" })).status,
    400,
  );
  assert.equal(
    (await call("/expenses", "POST", { ...p, cents: 1.5 })).status,
    400,
  );
  assert.equal(
    (await call("/expenses", "POST", { ...p, participants: [] })).status,
    400,
  );
});
