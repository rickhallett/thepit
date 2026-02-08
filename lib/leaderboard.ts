import { gte } from 'drizzle-orm';

import { requireDb } from '@/db';
import { agents, bouts, referrals, users, winnerVotes } from '@/db/schema';
import { ALL_PRESETS } from '@/lib/presets';
import {
  buildPresetAgentId,
  getAgentSnapshots,
  parsePresetAgentId,
} from '@/lib/agent-registry';

export type PitLeaderboardEntry = {
  id: string;
  name: string;
  presetId?: string | null;
  presetName?: string | null;
  tier: 'free' | 'premium' | 'custom';
  color?: string;
  avatar?: string;
  systemPrompt: string;
  responseLength?: string | null;
  responseFormat?: string | null;
  createdAt?: string | null;
  ownerId?: string | null;
  parentId?: string | null;
  promptHash?: string | null;
  manifestHash?: string | null;
  attestationUid?: string | null;
  attestationTxHash?: string | null;
  bouts: number;
  wins: number;
  winRate: number;
  votes: number;
  bestBoutId?: string | null;
};

export type PlayerLeaderboardEntry = {
  id: string;
  name: string;
  boutsCreated: number;
  agentsCreated: number;
  votesCast: number;
  referrals: number;
};

export type LeaderboardRange = 'all' | 'week' | 'day';

export type LeaderboardData = Record<
  LeaderboardRange,
  { pit: PitLeaderboardEntry[]; players: PlayerLeaderboardEntry[] }
>;

const RANGE_MS: Record<Exclude<LeaderboardRange, 'all'>, number> = {
  week: 7 * 24 * 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
};

const buildPresetMap = () => {
  const map = new Map<string, string[]>();
  ALL_PRESETS.forEach((preset) => {
    map.set(
      preset.id,
      preset.agents.map((agent) => agent.id),
    );
  });
  return map;
};

const getRangeStart = (range: LeaderboardRange) => {
  if (range === 'all') return null;
  return new Date(Date.now() - RANGE_MS[range]);
};

export async function getLeaderboardData(): Promise<LeaderboardData> {
  const db = requireDb();
  const snapshots = await getAgentSnapshots();
  const agentMeta = new Map<string, (typeof snapshots)[number]>();
  snapshots.forEach((agent) => {
    agentMeta.set(agent.id, agent);
    const parsed = parsePresetAgentId(agent.id);
    if (parsed) {
      agentMeta.set(parsed.agentId, agent);
    }
  });
  const presetMap = buildPresetMap();

  const ranges: LeaderboardRange[] = ['all', 'week', 'day'];
  const result = {} as LeaderboardData;

  for (const range of ranges) {
    const since = getRangeStart(range);

    let boutsQuery = db.select().from(bouts);
    let votesQuery = db.select().from(winnerVotes);
    let referralsQuery = db.select().from(referrals);
    let agentsQuery = db.select().from(agents);
    let usersQuery = db.select().from(users);

    if (since) {
      boutsQuery = boutsQuery.where(gte(bouts.createdAt, since));
      votesQuery = votesQuery.where(gte(winnerVotes.createdAt, since));
      referralsQuery = referralsQuery.where(gte(referrals.createdAt, since));
      agentsQuery = agentsQuery.where(gte(agents.createdAt, since));
      usersQuery = usersQuery.where(gte(users.createdAt, since));
    }

    const [boutRows, voteRows, referralRows, agentRows, userRows] =
      await Promise.all([
        boutsQuery,
        votesQuery,
        referralsQuery,
        agentsQuery,
        usersQuery,
      ]);

    const boutMap = new Map(boutRows.map((bout) => [bout.id, bout]));
    const pitStats = new Map<
      string,
      { bouts: number; wins: number; votes: number }
    >();
    const votesByBout = new Map<string, Map<string, number>>();
    const bestBoutByAgent = new Map<
      string,
      { boutId: string; votes: number }
    >();

    for (const vote of voteRows) {
      const bout = boutMap.get(vote.boutId);
      const canonicalAgentId =
        bout && bout.presetId !== 'arena'
          ? buildPresetAgentId(bout.presetId, vote.agentId)
          : vote.agentId;
      const stats = pitStats.get(canonicalAgentId) ?? {
        bouts: 0,
        wins: 0,
        votes: 0,
      };
      stats.votes += 1;
      pitStats.set(canonicalAgentId, stats);

      const boutMap = votesByBout.get(vote.boutId) ?? new Map();
      boutMap.set(
        canonicalAgentId,
        (boutMap.get(canonicalAgentId) ?? 0) + 1,
      );
      votesByBout.set(vote.boutId, boutMap);
    }

    boutRows.forEach((bout) => {
      let agentIds: string[] = [];
      if (bout.presetId === 'arena' && bout.agentLineup) {
        agentIds = (bout.agentLineup as { id: string }[]).map((a) => a.id);
      } else {
        agentIds = (presetMap.get(bout.presetId) ?? []).map((agentId) =>
          buildPresetAgentId(bout.presetId, agentId),
        );
      }
      agentIds.forEach((agentId) => {
        const stats = pitStats.get(agentId) ?? {
          bouts: 0,
          wins: 0,
          votes: 0,
        };
        stats.bouts += 1;
        pitStats.set(agentId, stats);
      });
    });

    votesByBout.forEach((agentVotes) => {
      let maxVotes = 0;
      agentVotes.forEach((count) => {
        if (count > maxVotes) maxVotes = count;
      });
      if (maxVotes === 0) return;
      agentVotes.forEach((count, agentId) => {
        if (count === maxVotes) {
          const stats = pitStats.get(agentId) ?? {
            bouts: 0,
            wins: 0,
            votes: 0,
          };
          stats.wins += 1;
          pitStats.set(agentId, stats);
        }
      });
    });

    votesByBout.forEach((agentVotes, boutId) => {
      agentVotes.forEach((count, agentId) => {
        const current = bestBoutByAgent.get(agentId);
        if (!current || count > current.votes) {
          bestBoutByAgent.set(agentId, { boutId, votes: count });
        }
      });
    });

    const pitEntries: PitLeaderboardEntry[] = Array.from(pitStats.entries()).map(
      ([agentId, stats]) => {
        const meta = agentMeta.get(agentId);
        const boutsCount = stats.bouts || 1;
        return {
          id: agentId,
          name: meta?.name ?? agentId,
          presetId: meta?.presetId ?? null,
          presetName: meta?.presetName ?? null,
          tier: meta?.tier ?? 'custom',
          color: meta?.color,
          avatar: meta?.avatar,
          systemPrompt: meta?.systemPrompt ?? '',
          responseLength: meta?.responseLength ?? null,
          responseFormat: meta?.responseFormat ?? null,
          createdAt: meta?.createdAt ?? null,
          ownerId: meta?.ownerId ?? null,
          parentId: meta?.parentId ?? null,
          promptHash: meta?.promptHash ?? null,
          manifestHash: meta?.manifestHash ?? null,
          attestationUid: meta?.attestationUid ?? null,
          attestationTxHash: meta?.attestationTxHash ?? null,
          bouts: stats.bouts,
          wins: stats.wins,
          winRate: stats.wins / boutsCount,
          votes: stats.votes,
          bestBoutId: bestBoutByAgent.get(agentId)?.boutId ?? null,
        };
      },
    );

    pitEntries.sort((a, b) => b.votes - a.votes);

    const playerStats = new Map<
      string,
      { boutsCreated: number; agentsCreated: number; votesCast: number; referrals: number }
    >();

    boutRows.forEach((bout) => {
      if (!bout.ownerId) return;
      const stats = playerStats.get(bout.ownerId) ?? {
        boutsCreated: 0,
        agentsCreated: 0,
        votesCast: 0,
        referrals: 0,
      };
      stats.boutsCreated += 1;
      playerStats.set(bout.ownerId, stats);
    });

    agentRows.forEach((agent) => {
      if (!agent.ownerId) return;
      const stats = playerStats.get(agent.ownerId) ?? {
        boutsCreated: 0,
        agentsCreated: 0,
        votesCast: 0,
        referrals: 0,
      };
      stats.agentsCreated += 1;
      playerStats.set(agent.ownerId, stats);
    });

    voteRows.forEach((vote) => {
      const stats = playerStats.get(vote.userId) ?? {
        boutsCreated: 0,
        agentsCreated: 0,
        votesCast: 0,
        referrals: 0,
      };
      stats.votesCast += 1;
      playerStats.set(vote.userId, stats);
    });

    referralRows.forEach((referral) => {
      const stats = playerStats.get(referral.referrerId) ?? {
        boutsCreated: 0,
        agentsCreated: 0,
        votesCast: 0,
        referrals: 0,
      };
      stats.referrals += 1;
      playerStats.set(referral.referrerId, stats);
    });

    const userNameMap = new Map(
      userRows.map((user) => [user.id, user.displayName || user.email || user.id]),
    );

    const playerEntries: PlayerLeaderboardEntry[] = Array.from(
      playerStats.entries(),
    ).map(([userId, stats]) => ({
      id: userId,
      name: userNameMap.get(userId) ?? userId,
      boutsCreated: stats.boutsCreated,
      agentsCreated: stats.agentsCreated,
      votesCast: stats.votesCast,
      referrals: stats.referrals,
    }));

    playerEntries.sort((a, b) => b.boutsCreated - a.boutsCreated);

    result[range] = { pit: pitEntries, players: playerEntries };
  }

  return result;
}
