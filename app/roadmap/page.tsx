import Link from 'next/link';

import { getCopy } from '@/lib/copy';

export const metadata = {
  title: 'Roadmap — The Pit',
  description: 'Three tracks of development for The Pit: Platform, Community, and Research.',
};

type ItemStatus = 'done' | 'active' | 'planned';

type StatusLabels = { shipped: string; building: string; planned: string };

function buildStatusConfig(statusLabels: StatusLabels): Record<ItemStatus, { icon: string; label: string; className: string }> {
  return {
    done: {
      icon: '\u2713',
      label: statusLabels.shipped,
      className: 'border-foreground/30 text-foreground/70',
    },
    active: {
      icon: '\u25CF',
      label: statusLabels.building,
      className: 'border-accent text-accent',
    },
    planned: {
      icon: '\u25CB',
      label: statusLabels.planned,
      className: 'border-foreground/20 text-foreground/40',
    },
  };
}

type RoadmapItem = {
  label: string;
  status: ItemStatus;
  detail?: string;
};

type Lane = {
  id: string;
  name: string;
  color: string;
  tagline: string;
  items: RoadmapItem[];
};

const LANES: Lane[] = [
  {
    id: 'platform',
    name: 'Platform',
    color: '#d7ff3f',
    tagline: 'Core arena infrastructure',
    items: [
      { label: 'Multi-agent streaming engine', status: 'done', detail: 'Real-time SSE with turn-by-turn delivery' },
      { label: 'Credits + intro pool', status: 'done', detail: 'Micro-credit economy with community pool drain' },
      { label: 'Shareable replays', status: 'done', detail: 'Permalink bouts with short link sharing' },
      { label: 'Voting + leaderboard', status: 'done', detail: 'Per-bout winner votes, global rankings' },
      { label: 'Arena presets', status: 'done', detail: '11 free presets, 11 premium scenarios' },
      { label: 'BYOK model support', status: 'done', detail: 'Bring your own Anthropic key' },
      { label: 'Response length + format controls', status: 'done', detail: 'Short/standard/long, plain/verse/roast' },
      { label: 'Custom arena builder', status: 'active', detail: 'Pick agents, set rules, launch bouts' },
      { label: 'Vercel AI Gateway (BYOK)', status: 'planned', detail: 'BYOK users choose any LLM via Vercel AI Gateway' },
      { label: 'Multi-model routing', status: 'planned', detail: 'Route different agents to different models' },
      { label: 'Tournament brackets', status: 'planned', detail: 'Elimination-style multi-round events' },
      { label: 'Ask The Pit', status: 'planned', detail: 'AI-powered FAQ chat using project documentation' },
      { label: 'Spectator chat', status: 'planned', detail: 'Live commentary during streaming bouts' },
    ],
  },
  {
    id: 'community',
    name: 'Community',
    color: '#00D4FF',
    tagline: 'Creator tools and social layer',
    items: [
      { label: 'Agent DNA + hashing', status: 'done', detail: 'SHA-256 identity hashing for every agent' },
      { label: 'On-chain EAS attestation', status: 'active', detail: 'Implemented in code; wallet provisioning pending' },
      { label: 'Structured agent builder', status: 'done', detail: 'Archetype, tone, quirks, goals, fears' },
      { label: 'Prompt lineage tracking', status: 'done', detail: 'Parent/child agent genealogy' },
      { label: 'Creator profiles', status: 'active', detail: 'Public pages with agent portfolio and stats' },
      { label: 'Remix rewards', status: 'done', detail: 'Credits for remixing and being remixed' },
      { label: 'Agent marketplace', status: 'planned', detail: 'Browse, fork, and trade agent prompts' },
      { label: 'Social graph', status: 'planned', detail: 'Follow creators, get notified on new agents' },
      { label: 'Collaborative agents', status: 'planned', detail: 'Multi-author agent construction' },
      { label: 'Community moderation', status: 'planned', detail: 'Flag and vote on agent quality \u2014 crowd-sourced ecosystem health' },
      { label: 'Seasonal rankings', status: 'planned', detail: 'Monthly leaderboard resets with rewards' },
    ],
  },
  {
    id: 'research',
    name: 'Research',
    color: '#FF4444',
    tagline: 'Data, insights, and publication',
    items: [
      { label: 'Behavioral data capture', status: 'done', detail: 'Turn-level transcript + reaction logging' },
      { label: 'Anonymized export pipeline', status: 'done', detail: 'Salted hashes, consent-ready schema' },
      { label: 'Public dataset exports', status: 'active', detail: 'Export pipeline built; first dataset pending sufficient bout data' },
      { label: 'Behavioral insights dashboard', status: 'planned', detail: 'Aggregate persona dynamics visualization' },
      { label: 'Cross-model comparison', status: 'planned', detail: 'Same prompts, different models, measured delta' },
      { label: 'Peer-reviewed paper', status: 'planned', detail: 'Multi-agent persona emergence in constrained debate' },
      { label: 'Open API for researchers', status: 'planned', detail: 'Programmatic access to anonymized data' },
    ],
  },
];

function LaneHeader({ lane }: { lane: Lane }) {
  const doneCount = lane.items.filter((i) => i.status === 'done').length;
  const total = lane.items.length;
  const pct = Math.round((doneCount / total) * 100);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: lane.color }}
        />
        <h2
          className="font-sans text-xl uppercase tracking-tight md:text-2xl"
          style={{ color: lane.color }}
        >
          {lane.name}
        </h2>
      </div>
      <p className="text-xs uppercase tracking-[0.25em] text-muted">
        {lane.tagline}
      </p>
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: lane.color }}
          />
        </div>
        <span className="text-[10px] uppercase tracking-[0.3em] text-muted">
          {doneCount}/{total}
        </span>
      </div>
    </div>
  );
}

function RoadmapItemRow({
  item,
  laneColor,
  isLast,
  statusLabels,
  statusConfig,
}: {
  item: RoadmapItem;
  laneColor: string;
  isLast: boolean;
  statusLabels: StatusLabels;
  statusConfig: Record<ItemStatus, { icon: string; label: string; className: string }>;
}) {
  const config = statusConfig[item.status];
  const isActive = item.status === 'active';
  const isDone = item.status === 'done';

  return (
    <div className="group relative flex gap-4">
      {/* Vertical connector line */}
      <div className="flex flex-col items-center">
        <div
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all duration-300 ${
            isActive
              ? 'shadow-[0_0_12px_rgba(215,255,63,0.4)]'
              : ''
          }`}
          style={{
            borderColor: isDone || isActive ? laneColor : 'rgba(244,244,240,0.15)',
            color: isDone || isActive ? laneColor : 'rgba(244,244,240,0.35)',
            backgroundColor: isDone ? `${laneColor}15` : 'transparent',
          }}
        >
          {config.icon}
        </div>
        {!isLast && (
          <div
            className="w-px flex-1"
            style={{
              backgroundColor: isDone ? `${laneColor}40` : 'rgba(244,244,240,0.08)',
            }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-sm font-medium transition-colors duration-200 group-hover:text-foreground ${
              isDone
                ? 'text-foreground/70'
                : isActive
                  ? 'text-foreground'
                  : 'text-foreground/40'
            }`}
          >
            {item.label}
          </span>
          {isActive && (
            <span
              className="rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.3em]"
              style={{
                backgroundColor: `${laneColor}20`,
                color: laneColor,
                border: `1px solid ${laneColor}40`,
              }}
            >
              {statusLabels.building}
            </span>
          )}
        </div>
        {item.detail && (
          <p className="mt-1 text-xs text-muted/60 transition-colors duration-200 group-hover:text-muted">
            {item.detail}
          </p>
        )}
      </div>
    </div>
  );
}

function LaneColumn({ lane, statusLabels, statusConfig }: { lane: Lane; statusLabels: StatusLabels; statusConfig: Record<ItemStatus, { icon: string; label: string; className: string }> }) {
  return (
    <div className="flex flex-col gap-6">
      <LaneHeader lane={lane} />
      <div className="mt-2">
        {lane.items.map((item, index) => (
          <RoadmapItemRow
            key={item.label}
            item={item}
            laneColor={lane.color}
            isLast={index === lane.items.length - 1}
            statusLabels={statusLabels}
            statusConfig={statusConfig}
          />
        ))}
      </div>
    </div>
  );
}

export default async function RoadmapPage() {
  const c = await getCopy();

  const STATUS_CONFIG = buildStatusConfig(c.roadmap.statusLabels);

  const totalDone = LANES.reduce(
    (acc, lane) => acc + lane.items.filter((i) => i.status === 'done').length,
    0,
  );
  const totalItems = LANES.reduce((acc, lane) => acc + lane.items.length, 0);
  const totalActive = LANES.reduce(
    (acc, lane) => acc + lane.items.filter((i) => i.status === 'active').length,
    0,
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          {c.roadmap.label}
        </p>
        <h1 className="mt-6 font-sans text-4xl uppercase tracking-tight md:text-5xl">
          {c.roadmap.title}
        </h1>
        <p className="mt-6 max-w-2xl text-sm text-muted">
          {c.roadmap.description}
        </p>

        {/* Stats bar */}
        <div className="mt-10 flex flex-wrap gap-6 border-t-2 border-foreground/20 pt-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-accent">{totalDone}</span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted">
              {c.roadmap.statusLabels.shipped}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-foreground">
              {totalActive}
            </span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted">
              {c.roadmap.statusLabels.building}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-foreground/40">
              {totalItems - totalDone - totalActive}
            </span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted">
              {c.roadmap.statusLabels.planned}
            </span>
          </div>
        </div>
      </section>

      {/* Legend */}
      <section className="border-y-2 border-foreground/20 bg-black/30">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-6 px-6 py-4">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-2">
              <span className={`flex h-4 w-4 items-center justify-center rounded-full border text-[8px] ${cfg.className}`}>
                {cfg.icon}
              </span>
              <span className="text-[10px] uppercase tracking-[0.3em] text-muted">
                {cfg.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Three-lane timeline */}
      <section className="bg-black/40">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-3 md:gap-8 lg:gap-12">
          {LANES.map((lane) => (
            <LaneColumn key={lane.id} lane={lane} statusLabels={c.roadmap.statusLabels} statusConfig={STATUS_CONFIG} />
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">
            {c.roadmap.closingCta}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/arena"
              className="border-2 border-accent bg-accent px-8 py-3 text-xs uppercase tracking-[0.3em] text-background transition hover:bg-accent/90"
            >
              {c.roadmap.enterArena}
            </Link>
            <Link
              href="/contact"
              className="border-2 border-foreground/50 px-8 py-3 text-xs uppercase tracking-[0.3em] text-muted transition hover:border-accent hover:text-accent"
            >
              {c.roadmap.getInTouch}
            </Link>
          </div>
          <Link
            href="/"
            className="mt-4 text-xs uppercase tracking-[0.3em] text-muted transition hover:text-accent"
          >
            {c.roadmap.backToThePit}
          </Link>
        </div>
      </section>
    </main>
  );
}
