import {
  syncMembership,
  reserveJournal,
} from "../functions/_shared/pro-membership.ts";
function assert(value: unknown, message: string) {
  if (!value) throw Error(message);
}
const user = "10000000-0000-4000-8000-000000000001";
function store(entitlement: unknown, subscription: unknown) {
  return {
    request_date: new Date().toISOString(),
    subscriber: {
      entitlements: { grace_gather_pro: entitlement },
      subscriptions: { gracegather_pro_monthly: subscription },
    },
  };
}
for (const [label, expires, sub, sandbox, active] of [
  [
    "valid paid subscription",
    Date.now() + 86400000,
    { is_sandbox: false },
    false,
    true,
  ],
  ["expired", Date.now() - 86400000, { is_sandbox: false }, false, false],
  [
    "refunded",
    Date.now() + 86400000,
    { is_sandbox: false, refunded_at: new Date().toISOString() },
    false,
    false,
  ],
  [
    "sandbox rejected in production",
    Date.now() + 86400000,
    { is_sandbox: true },
    false,
    false,
  ],
  [
    "sandbox allowed only explicitly",
    Date.now() + 86400000,
    { is_sandbox: true },
    true,
    true,
  ],
  [
    "verified grace period",
    Date.now() - 86400000,
    {
      is_sandbox: false,
      grace_period_expires_date: new Date(Date.now() + 86400000).toISOString(),
    },
    false,
    true,
  ],
] as const) {
  Deno.test(label, async () => {
    const original = globalThis.fetch;
    Deno.env.set("REVENUECAT_SECRET_KEY", "test-server-key");
    Deno.env.set("PRO_ALLOW_SANDBOX", String(sandbox));
    let written: Record<string, unknown> | undefined;
    const service = {
      rpc: async (_name: string, data: Record<string, unknown>) => {
        written = data;
        return { error: null };
      },
    } as unknown as Parameters<typeof syncMembership>[0];
    globalThis.fetch = async (input, options) => {
      assert(
        String(input).endsWith("/subscribers/" + user),
        "must query the signed-in account",
      );
      assert(
        (options?.headers as Record<string, string>).Authorization ===
          "Bearer test-server-key",
        "server authentication",
      );
      return new Response(
        JSON.stringify(
          store(
            {
              product_identifier: "gracegather_pro_monthly",
              expires_date: new Date(expires).toISOString(),
            },
            sub,
          ),
        ),
      );
    };
    try {
      assert(
        (await syncMembership(service, user)) === active,
        "wrong entitlement",
      );
      assert(written?.p_active === active, "wrong stored status");
    } finally {
      globalThis.fetch = original;
      Deno.env.delete("REVENUECAT_SECRET_KEY");
      Deno.env.delete("PRO_ALLOW_SANDBOX");
    }
  });
}
Deno.test(
  "a failed store lookup never grants or revokes a member using fabricated data",
  async () => {
    const original = globalThis.fetch;
    let wrote = false;
    Deno.env.set("REVENUECAT_SECRET_KEY", "test-server-key");
    globalThis.fetch = async () => new Response("", { status: 503 });
    const service = {
      rpc: () => {
        wrote = true;
      },
    } as unknown as Parameters<typeof syncMembership>[0];
    try {
      let failed = false;
      try {
        await syncMembership(service, user);
      } catch {
        failed = true;
      }
      assert(failed && !wrote, "failed verification must not change access");
    } finally {
      globalThis.fetch = original;
      Deno.env.delete("REVENUECAT_SECRET_KEY");
    }
  },
);
Deno.test(
  "quota limit and replay are returned without accepting a client plan",
  async () => {
    let captured: Record<string, unknown> | undefined;
    const service = {
      rpc: async (_name: string, data: Record<string, unknown>) => {
        captured = data;
        return {
          data: { allowed: true, replay: true, result: { answer: "cached" } },
          error: null,
        };
      },
    } as unknown as Parameters<typeof reserveJournal>[0];
    const result = await reserveJournal(service, user, "study", {
      requestId: "stable-id",
      messages: [{ content: "test" }],
    });
    assert(result.replay, "retry should reuse the result");
    assert(
      /^[a-f0-9]{64}$/.test(String(captured?.p_key)),
      "server-generated request digest",
    );
  },
);
