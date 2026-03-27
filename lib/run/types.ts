// Shared types and enums for the run model.
//
// This module defines types used across run domain modules.
// Schema-derived types (from Drizzle InferSelect) are preferred
// over manual type definitions where possible.

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { tasks, runs } from '@/db/schema';

/** A task as stored in the database. */
export type Task = InferSelectModel<typeof tasks>;

/** Input shape for creating a task (Drizzle insert). */
export type NewTask = InferInsertModel<typeof tasks>;

/** Options for listing tasks with filtering and pagination. */
export type ListTasksOptions = {
  domain?: string;
  limit?: number;
  offset?: number;
};

/** A run as stored in the database. */
export type Run = InferSelectModel<typeof runs>;

/** Input shape for creating a run (Drizzle insert). */
export type NewRun = InferInsertModel<typeof runs>;

/** Run status enum values. */
export type RunStatus = 'pending' | 'running' | 'completed' | 'failed';

/** Options for listing runs with filtering and pagination. */
export type ListRunsOptions = {
  taskId?: string;
  status?: RunStatus;
  ownerId?: string;
  limit?: number;
  offset?: number;
};
