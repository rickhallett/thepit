// Branded nominal types — prevent mixing IDs and amounts at the type level.
// Runtime cost: zero. Compile-time safety: prevents boutId where userId expected.

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { [__brand]: B };

export type BoutId = Brand<string, "BoutId">;
export type AgentId = Brand<string, "AgentId">;
export type UserId = Brand<string, "UserId">;
export type MicroCredits = Brand<number, "MicroCredits">;

export function boutId(id: string): BoutId {
  return id as BoutId;
}

export function agentId(id: string): AgentId {
  return id as AgentId;
}

export function userId(id: string): UserId {
  return id as UserId;
}

export function microCredits(n: number): MicroCredits {
  return n as MicroCredits;
}
