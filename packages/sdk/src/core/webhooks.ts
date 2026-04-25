/**
 * Webhook helpers — signature verification and payload parsing.
 *
 * When KeeperHub fires a webhook to your server it signs the raw request body
 * with HMAC-SHA256. Always verify before processing to prevent spoofed deliveries.
 *
 * **Recommended:** use the single `handleWebhook()` function — it verifies the
 * signature and parses the payload in the correct order:
 *
 * @example
 * // Express
 * import { handleWebhook } from "keeperhub-sdk";
 *
 * app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
 *   try {
 *     const payload = await handleWebhook(
 *       req.body,
 *       req.headers["x-keeperhub-signature"],
 *       process.env.WEBHOOK_SECRET!
 *     );
 *     console.log(payload.event, payload.executionId);
 *     res.sendStatus(200);
 *   } catch {
 *     res.status(401).send("Invalid signature");
 *   }
 * });
 */

export interface WebhookPayload {
  id: string;
  event: "execution.completed" | "execution.failed" | "execution.updated";
  workflowId: string;
  executionId: string;
  status: string;
  transactionHash?: string;
  gasUsedWei?: string;
  network?: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

/**
 * Verify that an incoming webhook request came from KeeperHub.
 *
 * @param body - Raw request body (Buffer or string). Do NOT parse JSON first —
 *               the signature is computed over the raw bytes.
 * @param signature - Value of the `x-keeperhub-signature` header (format: "sha256=<hex>")
 * @param secret - Your webhook secret from the KeeperHub dashboard
 * @returns true if the signature is valid, false otherwise
 *
 * @example
 * const isValid = await verifyWebhookSignature(rawBody, req.headers["x-keeperhub-signature"], secret);
 */
export async function verifyWebhookSignature(
  body: Buffer | string | Uint8Array,
  signature: string | string[] | undefined,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) return false;

  const sigHeader = Array.isArray(signature) ? signature[0] : signature;

  // Format: "sha256=<hex_digest>"
  const prefix = "sha256=";
  if (!sigHeader.startsWith(prefix)) return false;

  const expectedHex = sigHeader.slice(prefix.length);

  try {
    const enc = new TextEncoder();
    const keyData = enc.encode(secret);
    // Copy to a plain ArrayBuffer to satisfy SubtleCrypto's strict typing
    const toArrayBuffer = (u8: Uint8Array): ArrayBuffer => {
      const buf = new ArrayBuffer(u8.byteLength);
      new Uint8Array(buf).set(u8);
      return buf;
    };
    let rawBytes: Uint8Array;
    if (typeof body === "string") {
      rawBytes = enc.encode(body);
    } else if (body instanceof Uint8Array) {
      rawBytes = body;
    } else {
      // Node.js Buffer — treat it as a Uint8Array
      rawBytes = new Uint8Array(body as unknown as ArrayBuffer);
    }
    const rawBody: ArrayBuffer = toArrayBuffer(rawBytes);
    const keyBuf: ArrayBuffer = toArrayBuffer(keyData);

    const key = await crypto.subtle.importKey(
      "raw",
      keyBuf,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const mac = await crypto.subtle.sign("HMAC", key, rawBody);
    const actualHex = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison to prevent timing attacks
    return constantTimeEqual(actualHex, expectedHex);
  } catch {
    return false;
  }
}

/**
 * Constant-time string comparison — prevents timing-based attacks
 * where an attacker can determine how many characters match by measuring
 * response time. Length mismatch is encoded as a bit difference, not an
 * early return, so both branches take the same time.
 */
function constantTimeEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  // Pad both to the same length so the loop always runs the full course
  const aPad = a.padEnd(maxLen, "\0");
  const bPad = b.padEnd(maxLen, "\0");
  // Start with 1 if lengths differ — guarantees result !== 0 without early exit
  let result = a.length === b.length ? 0 : 1;
  for (let i = 0; i < maxLen; i++) {
    result |= aPad.charCodeAt(i) ^ bPad.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verify and parse a webhook in a single call — the recommended entry point.
 * Throws `Error` if the signature is invalid so you can return a 401 immediately.
 *
 * Pass the **raw** request body (Buffer or string) — do NOT call JSON.parse first.
 *
 * @example
 * const payload = await handleWebhook(req.body, req.headers["x-keeperhub-signature"], secret);
 */
export async function handleWebhook(
  body: Buffer | string | Uint8Array,
  signature: string | string[] | undefined,
  secret: string
): Promise<WebhookPayload> {
  const valid = await verifyWebhookSignature(body, signature, secret);
  if (!valid) {
    throw new Error(
      "Invalid webhook signature. Ensure you are using the correct webhook secret and passing the raw request body."
    );
  }
  const raw = typeof body === "string" ? body : new TextDecoder().decode(body);
  return JSON.parse(raw) as WebhookPayload;
}

/**
 * @deprecated Use `handleWebhook()` instead — it verifies and parses in a single call.
 */
export async function parseWebhookPayload(
  body: Buffer | string | Uint8Array,
  signature: string | string[] | undefined,
  secret: string
): Promise<WebhookPayload> {
  return handleWebhook(body, signature, secret);
}
