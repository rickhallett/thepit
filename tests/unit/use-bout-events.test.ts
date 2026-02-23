import { describe, expect, it } from 'vitest';
import { uiMessageChunkSchema } from 'ai';

// ---------------------------------------------------------------------------
// use-bout event contract tests
//
// The handleEvent function inside useBout() is an inner closure that cannot be
// imported directly (it's a React hook with useState/useRef). Instead, we test
// the EVENT CONTRACT: the Vercel AI SDK's uiMessageChunkSchema that parses the
// SSE stream, and the StreamEvent shape that handleEvent consumes.
//
// Why this matters:
// - The SDK schema is the gatekeeper. If an event shape doesn't pass the
//   schema, handleEvent never sees it. If the SDK changes field names or adds
//   required fields, these tests catch it before production.
// - The Pit uses custom `data-*` events (data-turn, data-share-line) which
//   the SDK routes through a generic "data-" prefix discriminator. These tests
//   verify those custom events validate correctly.
// ---------------------------------------------------------------------------

// The SDK exports uiMessageChunkSchema as a LazySchema (a function returning
// Schema<T>). Schema<T>.validate returns Promise<ValidationResult<T>>.
// We cast through `unknown` to bypass strict SDK type narrowing — the runtime
// shape is verified by the tests themselves.
type ValidateResult = { success: true; value: Record<string, unknown> }
  | { success: false; error: Error };

const schema = uiMessageChunkSchema();

async function validate(event: unknown): Promise<ValidateResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = schema as any;
  const result = await s.validate(event);
  return result as ValidateResult;
}

describe('uiMessageChunkSchema — error event contract', () => {
  it('accepts error events with errorText at the top level', async () => {
    const result = await validate({
      type: 'error',
      errorText: 'The arena short-circuited.',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value).toEqual({
      type: 'error',
      errorText: 'The arena short-circuited.',
    });
  });

  it('error event has errorText at top level, not nested under data', async () => {
    // This is the critical contract: use-bout.ts reads event.errorText directly
    // (line 228). If the SDK ever moves it to event.data.errorText, our error
    // handling silently breaks. This test locks the field location.
    const result = await validate({
      type: 'error',
      errorText: 'rate limited',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.errorText).toBe('rate limited');
    // Verify it's NOT nested under a data key
    expect(result.value.data).toBeUndefined();
  });

  it('rejects error event without errorText', async () => {
    const result = await validate({ type: 'error' });
    expect(result.success).toBe(false);
  });

  it('rejects error event with errorText as number', async () => {
    const result = await validate({ type: 'error', errorText: 42 });
    expect(result.success).toBe(false);
  });
});

describe('uiMessageChunkSchema — text streaming events', () => {
  it('accepts text-start with id', async () => {
    const result = await validate({ type: 'text-start', id: 'msg-1' });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value).toMatchObject({ type: 'text-start', id: 'msg-1' });
  });

  it('accepts text-delta with id and delta', async () => {
    const result = await validate({
      type: 'text-delta',
      id: 'msg-1',
      delta: 'Hello, world!',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.type).toBe('text-delta');
    expect(result.value.delta).toBe('Hello, world!');
  });

  it('accepts text-end with id', async () => {
    const result = await validate({ type: 'text-end', id: 'msg-1' });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value).toMatchObject({ type: 'text-end', id: 'msg-1' });
  });

  it('rejects text-delta without id', async () => {
    const result = await validate({ type: 'text-delta', delta: 'oops' });
    expect(result.success).toBe(false);
  });

  it('rejects text-delta without delta', async () => {
    const result = await validate({ type: 'text-delta', id: 'msg-1' });
    expect(result.success).toBe(false);
  });
});

describe('uiMessageChunkSchema — PIT custom data events', () => {
  it('accepts data-turn with arbitrary payload', async () => {
    const result = await validate({
      type: 'data-turn',
      data: {
        turn: 1,
        agentId: 'agent-socrates',
        agentName: 'Socrates',
        color: '#FFD700',
      },
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.type).toBe('data-turn');
    const data = result.value.data as Record<string, unknown>;
    expect(data.turn).toBe(1);
    expect(data.agentId).toBe('agent-socrates');
  });

  it('accepts data-share-line with text payload', async () => {
    const result = await validate({
      type: 'data-share-line',
      data: { text: 'Socrates just dismantled stoicism in 3 turns' },
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.type).toBe('data-share-line');
    const data = result.value.data as Record<string, unknown>;
    expect(data.text).toContain('Socrates');
  });

  it('rejects events without data- prefix as custom events', async () => {
    // A type like "custom-turn" does NOT match the data- prefix convention.
    // It should fail validation because it doesn't match any known variant.
    const result = await validate({ type: 'custom-turn', data: {} });
    expect(result.success).toBe(false);
  });
});

describe('uiMessageChunkSchema — SDK variant coverage', () => {
  // Verify the schema includes all expected stream event types.
  // If the SDK drops or renames a variant, these tests fail, alerting us to
  // update the StreamEvent type in use-bout.ts.

  const knownVariants = [
    'error',
    'text-start',
    'text-delta',
    'text-end',
    'tool-input-start',
    'tool-input-delta',
    'tool-input-available',
    'tool-input-error',
    'tool-approval-request',
    'tool-output-available',
    'tool-output-error',
    'tool-output-denied',
    'reasoning-start',
    'reasoning-delta',
    'reasoning-end',
    'source-url',
    'source-document',
    'file',
    'start-step',
    'finish-step',
    'start',
    'finish',
    'abort',
    'message-metadata',
  ] as const;

  // For each variant, validate a minimal well-formed event to prove the
  // schema recognises the type discriminator. We don't exhaustively test
  // every field — just that the type is a valid union member.
  const minimalEvents: Record<string, Record<string, unknown>> = {
    error: { type: 'error', errorText: 'e' },
    'text-start': { type: 'text-start', id: 'x' },
    'text-delta': { type: 'text-delta', id: 'x', delta: 'd' },
    'text-end': { type: 'text-end', id: 'x' },
    'tool-input-start': {
      type: 'tool-input-start',
      toolCallId: 't',
      toolName: 'n',
    },
    'tool-input-delta': {
      type: 'tool-input-delta',
      toolCallId: 't',
      inputTextDelta: 'd',
    },
    'tool-input-available': {
      type: 'tool-input-available',
      toolCallId: 't',
      toolName: 'n',
    },
    'tool-input-error': {
      type: 'tool-input-error',
      toolCallId: 't',
      toolName: 'n',
      errorText: 'e',
    },
    'tool-approval-request': {
      type: 'tool-approval-request',
      approvalId: 'a',
      toolCallId: 't',
    },
    'tool-output-available': {
      type: 'tool-output-available',
      toolCallId: 't',
    },
    'tool-output-error': {
      type: 'tool-output-error',
      toolCallId: 't',
      errorText: 'e',
    },
    'tool-output-denied': { type: 'tool-output-denied', toolCallId: 't' },
    'reasoning-start': { type: 'reasoning-start', id: 'x' },
    'reasoning-delta': { type: 'reasoning-delta', id: 'x', delta: 'd' },
    'reasoning-end': { type: 'reasoning-end', id: 'x' },
    'source-url': { type: 'source-url', sourceId: 's', url: 'https://x.com' },
    'source-document': {
      type: 'source-document',
      sourceId: 's',
      mediaType: 'text/plain',
      title: 't',
    },
    file: { type: 'file', url: 'https://x.com/f.png', mediaType: 'image/png' },
    'start-step': { type: 'start-step' },
    'finish-step': { type: 'finish-step' },
    start: { type: 'start' },
    finish: { type: 'finish' },
    abort: { type: 'abort' },
    'message-metadata': { type: 'message-metadata' },
  };

  for (const variant of knownVariants) {
    it(`recognises variant: ${variant}`, async () => {
      const event = minimalEvents[variant];
      expect(event).toBeDefined();
      const result = await validate(event);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.value.type).toBe(variant);
    });
  }

  it('rejects completely unknown type', async () => {
    const result = await validate({ type: 'does-not-exist-xyz' });
    expect(result.success).toBe(false);
  });
});

describe('StreamEvent type alignment with handleEvent', () => {
  // The StreamEvent type in use-bout.ts declares:
  //   { type: string; data?: {...}; delta?: string; errorText?: string }
  //
  // handleEvent reads:
  //   event.type          → string discriminator
  //   event.errorText     → on error events
  //   event.data?.text    → on data-share-line events
  //   event.data?.turn    → on data-turn events
  //   event.data?.agentId → on data-turn events
  //   event.delta         → on text-delta events
  //
  // These tests verify the SDK schema produces values with these exact fields.

  it('error event value has errorText accessible at top level', async () => {
    const result = await validate({
      type: 'error',
      errorText: 'connection lost',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    // handleEvent reads: event.errorText
    expect(typeof result.value.errorText).toBe('string');
    expect(result.value.errorText).toBe('connection lost');
  });

  it('text-delta event value has delta accessible at top level', async () => {
    const result = await validate({
      type: 'text-delta',
      id: 'msg-1',
      delta: 'streamed chunk',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    // handleEvent reads: event.delta
    expect(typeof result.value.delta).toBe('string');
    expect(result.value.delta).toBe('streamed chunk');
  });

  it('data-turn event value has data.turn and data.agentId', async () => {
    const result = await validate({
      type: 'data-turn',
      data: { turn: 3, agentId: 'nietzsche', agentName: 'Nietzsche', color: '#E63' },
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    const data = result.value.data as Record<string, unknown>;
    // handleEvent reads: event.data?.turn, event.data?.agentId
    expect(data.turn).toBe(3);
    expect(data.agentId).toBe('nietzsche');
    expect(data.agentName).toBe('Nietzsche');
    expect(data.color).toBe('#E63');
  });

  it('data-share-line event value has data.text', async () => {
    const result = await validate({
      type: 'data-share-line',
      data: { text: 'Epic takedown in the pit' },
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    const data = result.value.data as Record<string, unknown>;
    // handleEvent reads: event.data?.text
    expect(data.text).toBe('Epic takedown in the pit');
  });
});
