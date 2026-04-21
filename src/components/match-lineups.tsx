import Link from "next/link";
import { DEFAULT_FORMATION, STARTING_SIZE } from "@/lib/formations";
import type { LineupPlayer, MatchLineup, Player, Team } from "@/lib/types";

export type LineupResolved = {
  lineup: MatchLineup | null;
  resolved: {
    formation: string;
    starting: LineupPlayer[];
    subs: LineupPlayer[];
    coach: string | null;
    synthetic: boolean;
  };
};

export function resolveLineup(
  lineup: MatchLineup | null,
  _players: Player[],
): LineupResolved {
  if (lineup && lineup.startingXI.length === STARTING_SIZE) {
    return {
      lineup,
      resolved: {
        formation: lineup.formation,
        starting: lineup.startingXI,
        subs: lineup.substitutes,
        coach: lineup.coach,
        synthetic: false,
      },
    };
  }
  return {
    lineup,
    resolved: {
      formation: lineup?.formation ?? DEFAULT_FORMATION,
      starting: [],
      subs: [],
      coach: lineup?.coach ?? null,
      synthetic: true,
    },
  };
}

export function MatchLineupsBoard({
  home,
  away,
  homePlayers,
  awayPlayers,
  homeLineup,
  awayLineup,
  matchId,
  canEditHome,
  canEditAway,
}: {
  home: Team;
  away: Team;
  homePlayers: Player[];
  awayPlayers: Player[];
  homeLineup: MatchLineup | null;
  awayLineup: MatchLineup | null;
  matchId: string;
  canEditHome: boolean;
  canEditAway: boolean;
}) {
  const homeRes = resolveLineup(homeLineup, homePlayers);
  const awayRes = resolveLineup(awayLineup, awayPlayers);
  const homeById = new Map(homePlayers.map((p) => [p.id, p]));
  const awayById = new Map(awayPlayers.map((p) => [p.id, p]));

  const locked = !!(homeLineup?.lockedAt || awayLineup?.lockedAt);

  return (
    <div className="card p-0 overflow-hidden">
      {/* Pasek nagłówkowy z logotypami i formacjami */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch bg-ink text-chalk">
        <TeamHeader
          team={home}
          align="left"
          formation={homeRes.resolved.synthetic ? null : homeRes.resolved.formation}
          canEdit={canEditHome}
          matchId={matchId}
        />
        <div className="flex items-center justify-center px-3 mono text-[10px] uppercase tracking-[0.3em] text-lime">
          vs
        </div>
        <TeamHeader
          team={away}
          align="right"
          formation={awayRes.resolved.synthetic ? null : awayRes.resolved.formation}
          canEdit={canEditAway}
          matchId={matchId}
        />
      </div>

      {/* Połączone boisko */}
      <CombinedPitch
        home={home}
        away={away}
        homeResolved={homeRes.resolved}
        awayResolved={awayRes.resolved}
        homeById={homeById}
        awayById={awayById}
        matchId={matchId}
        canEditHome={canEditHome}
        canEditAway={canEditAway}
      />

      {locked && (
        <div className="px-4 py-2 bg-ink text-lime mono text-[11px] uppercase tracking-[0.2em] text-center">
          Skład zablokowany · snapshot
        </div>
      )}

      {/* Rezerwowi pod boiskiem */}
      <div className="grid sm:grid-cols-2 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-ink/10 border-t-2 border-ink">
        <SubsColumn
          title="Rezerwowi"
          team={home}
          players={homeRes.resolved.subs}
          playersById={homeById}
          align="left"
        />
        <SubsColumn
          title="Rezerwowi"
          team={away}
          players={awayRes.resolved.subs}
          playersById={awayById}
          align="right"
        />
      </div>
    </div>
  );
}

function TeamHeader({
  team,
  align,
  formation,
  canEdit,
  matchId,
}: {
  team: Team;
  align: "left" | "right";
  formation: string | null;
  canEdit: boolean;
  matchId: string;
}) {
  const isLeft = align === "left";
  return (
    <div
      className={`flex items-center gap-3 p-3 sm:p-4 ${
        isLeft ? "" : "flex-row-reverse text-right"
      }`}
      style={{ backgroundColor: team.color }}
    >
      <div className="w-10 h-10 border-2 border-ink flex items-center justify-center display text-sm shrink-0 bg-chalk/20">
        <span className="text-chalk mix-blend-difference">
          {team.shortName.slice(0, 3).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="display text-lg sm:text-xl text-chalk mix-blend-difference truncate">
          {team.name}
        </div>
        <div className="mono text-[10px] uppercase tracking-[0.25em] text-chalk mix-blend-difference opacity-80">
          {formation ?? "skład nieustawiony"}
        </div>
      </div>
      {canEdit && (
        <Link
          href={`/mecze/${matchId}/sklady/edytuj?team=${team.id}`}
          className="btn-primary text-[10px] sm:text-xs whitespace-nowrap"
        >
          Edytuj
        </Link>
      )}
    </div>
  );
}

function CombinedPitch({
  home,
  away,
  homeResolved,
  awayResolved,
  homeById,
  awayById,
  matchId,
  canEditHome,
  canEditAway,
}: {
  home: Team;
  away: Team;
  homeResolved: LineupResolved["resolved"];
  awayResolved: LineupResolved["resolved"];
  homeById: Map<string, Player>;
  awayById: Map<string, Player>;
  matchId: string;
  canEditHome: boolean;
  canEditAway: boolean;
}) {
  // Boisko poziome, dom po lewej, goście po prawej.
  // Oryginalne współrzędne gracza: x (0-100 horyzontalnie na własnej połowie),
  // y (0 = linia bramkowa własna, 100 = linia środkowa).
  // Mapowanie na jedno boisko (cx, cy w %):
  //   dom:   cx = p.y * 0.5                     (0 = bramka domu, 50 = środek)
  //          cy = p.x                           (ta sama oś)
  //   gość:  cx = 100 - p.y * 0.5               (100 = bramka gości, 50 = środek)
  //          cy = 100 - p.x                     (lustro w pionie, żeby nie nakładali się)
  return (
    <div className="relative pitch-stripes w-full border-b-2 border-ink overflow-hidden">
      <div className="relative w-full max-w-3xl mx-auto aspect-[5/3] sm:aspect-[16/9]">
        <PitchLinesH />

      {homeResolved.synthetic ? (
        <HalfPlaceholder
          side="left"
          canEdit={canEditHome}
          matchId={matchId}
          teamId={home.id}
        />
      ) : (
        homeResolved.starting.map((p) => (
          <PlayerDot
            key={`h-${p.playerId}`}
            player={homeById.get(p.playerId) ?? null}
            lp={p}
            color={home.color}
            cx={p.y * 0.5}
            cy={p.x}
          />
        ))
      )}

      {awayResolved.synthetic ? (
        <HalfPlaceholder
          side="right"
          canEdit={canEditAway}
          matchId={matchId}
          teamId={away.id}
        />
      ) : (
        awayResolved.starting.map((p) => (
          <PlayerDot
            key={`a-${p.playerId}`}
            player={awayById.get(p.playerId) ?? null}
            lp={p}
            color={away.color}
            cx={100 - p.y * 0.5}
            cy={100 - p.x}
          />
        ))
      )}
      </div>
    </div>
  );
}

function PlayerDot({
  player,
  lp,
  color,
  cx,
  cy,
}: {
  player: Player | null;
  lp: LineupPlayer;
  color: string;
  cx: number;
  cy: number;
}) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
      style={{ left: `${cx}%`, top: `${cy}%` }}
    >
      <div
        className="relative w-8 h-8 sm:w-11 sm:h-11 rounded-full border-2 border-ink flex items-center justify-center display text-xs sm:text-base shadow"
        style={{ backgroundColor: color }}
        title={player?.name ?? "?"}
      >
        <span className="text-chalk mix-blend-difference">
          {lp.shirtNumber ?? "—"}
        </span>
      </div>
      <div className="mt-1 px-1.5 py-0.5 bg-ink text-chalk mono text-[9px] sm:text-[10px] uppercase tracking-[0.1em] max-w-[68px] sm:max-w-[90px] truncate leading-none">
        {player?.name.split(" ").slice(-1)[0] ?? "?"}
      </div>
    </div>
  );
}

function HalfPlaceholder({
  side,
  canEdit,
  matchId,
  teamId,
}: {
  side: "left" | "right";
  canEdit: boolean;
  matchId: string;
  teamId: string;
}) {
  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 ${
        side === "left" ? "left-3" : "right-3"
      } max-w-[45%] text-center`}
    >
      <div className="bg-ink/75 backdrop-blur-sm border-2 border-chalk/30 px-3 py-3 sm:px-4 sm:py-4">
        <div className="mono text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-lime">
          Brak składu
        </div>
        <div className="display text-sm sm:text-lg text-chalk mt-1 leading-tight">
          Czekamy na kapitana
        </div>
        {canEdit && (
          <Link
            href={`/mecze/${matchId}/sklady/edytuj?team=${teamId}`}
            className="inline-block mt-2 btn-primary text-[10px] sm:text-xs"
          >
            Ustaw →
          </Link>
        )}
      </div>
    </div>
  );
}

function PitchLinesH() {
  // Boisko poziome. Linie: obwódka, linia środkowa, koło środkowe,
  // pola karne po obu stronach.
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    >
      <g stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" fill="none">
        {/* obwódka */}
        <rect x="1" y="1" width="98" height="98" />
        {/* linia środkowa */}
        <line x1="50" y1="1" x2="50" y2="99" />
        {/* koło środkowe */}
        <circle cx="50" cy="50" r="10" />
        <circle cx="50" cy="50" r="0.8" fill="rgba(255,255,255,0.4)" />
        {/* pole karne lewe */}
        <rect x="1" y="30" width="18" height="40" />
        <rect x="1" y="40" width="7" height="20" />
        {/* pole karne prawe */}
        <rect x="81" y="30" width="18" height="40" />
        <rect x="92" y="40" width="7" height="20" />
        {/* łuki */}
        <path d="M 19 40 A 10 10 0 0 1 19 60" />
        <path d="M 81 40 A 10 10 0 0 0 81 60" />
      </g>
    </svg>
  );
}

function SubsColumn({
  title,
  team,
  players,
  playersById,
  align,
}: {
  title: string;
  team: Team;
  players: LineupPlayer[];
  playersById: Map<string, Player>;
  align: "left" | "right";
}) {
  const isLeft = align === "left";
  return (
    <div className="p-0">
      <div
        className={`px-4 py-2 mono text-[11px] uppercase tracking-[0.3em] flex items-center gap-2 ${
          isLeft ? "" : "flex-row-reverse text-right"
        }`}
        style={{ backgroundColor: team.color }}
      >
        <span className="text-chalk mix-blend-difference">{title}</span>
        <span className="text-chalk mix-blend-difference opacity-70">
          · {team.shortName}
        </span>
      </div>
      {players.length === 0 ? (
        <div className="p-3 italic text-ink-soft text-sm">Brak.</div>
      ) : (
        <ul className="divide-y-2 divide-ink/10">
          {players.map((p) => {
            const player = playersById.get(p.playerId);
            return (
              <li
                key={p.playerId}
                className={`flex items-center gap-3 px-4 py-2 ${
                  isLeft ? "" : "flex-row-reverse text-right"
                }`}
              >
                <div
                  className="w-8 h-8 flex items-center justify-center display text-sm shrink-0 border-2 border-ink"
                  style={{ backgroundColor: team.color }}
                >
                  <span className="text-chalk mix-blend-difference">
                    {p.shirtNumber ?? "—"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    {player?.name ?? "?"}
                  </div>
                  <div className="mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
                    {p.position}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
