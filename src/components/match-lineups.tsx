import Link from "next/link";
import {
  DEFAULT_FORMATION,
  randomLineup,
  STARTING_SIZE,
} from "@/lib/formations";
import type {
  LineupPlayer,
  MatchLineup,
  Player,
  Team,
} from "@/lib/types";

type PitchSide = "home" | "away";

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
  players: Player[],
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
  const { starting, subs } = randomLineup(
    players.map((p) => ({
      id: p.id,
      number: p.number,
      position: p.position,
    })),
    lineup?.formation ?? DEFAULT_FORMATION,
  );
  return {
    lineup,
    resolved: {
      formation: lineup?.formation ?? DEFAULT_FORMATION,
      starting,
      subs,
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

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <TeamBoardSide
          team={home}
          side="home"
          players={homePlayers}
          playersById={homeById}
          resolved={homeRes.resolved}
          lineup={homeLineup}
          canEdit={canEditHome}
          matchId={matchId}
        />
        <TeamBoardSide
          team={away}
          side="away"
          players={awayPlayers}
          playersById={awayById}
          resolved={awayRes.resolved}
          lineup={awayLineup}
          canEdit={canEditAway}
          matchId={matchId}
        />
      </div>
    </div>
  );
}

function TeamBoardSide({
  team,
  side,
  playersById,
  resolved,
  lineup,
  canEdit,
  matchId,
}: {
  team: Team;
  side: PitchSide;
  players: Player[];
  playersById: Map<string, Player>;
  resolved: LineupResolved["resolved"];
  lineup: MatchLineup | null;
  canEdit: boolean;
  matchId: string;
}) {
  return (
    <div className="card p-0 overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 border-b-2 border-ink"
        style={{ backgroundColor: team.color }}
      >
        <div className="w-10 h-10 border-2 border-ink flex items-center justify-center display text-lg shrink-0 bg-chalk/20">
          <span className="text-chalk mix-blend-difference">
            {team.shortName.slice(0, 3).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="display text-xl text-chalk mix-blend-difference truncate">
            {team.name}
          </div>
          <div className="mono text-[10px] uppercase tracking-[0.25em] text-chalk mix-blend-difference opacity-80">
            {side === "home" ? "Gospodarze" : "Goście"} · {resolved.formation}
          </div>
        </div>
        {canEdit && (
          <Link
            href={`/mecze/${matchId}/skladu/edytuj?team=${team.id}`}
            className="btn-primary text-xs"
          >
            Edytuj skład
          </Link>
        )}
      </div>

      <FieldHalf
        side={side}
        color={team.color}
        starting={resolved.starting}
        playersById={playersById}
      />

      {resolved.synthetic && (
        <div className="px-4 py-2 bg-amber/20 border-t-2 border-amber/40 mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
          Skład losowy — kapitan jeszcze nie ustawił
        </div>
      )}
      {lineup?.lockedAt && (
        <div className="px-4 py-2 bg-ink text-lime mono text-[11px] uppercase tracking-[0.2em]">
          Skład zablokowany (snapshot)
        </div>
      )}

      <PlayerListBlock
        title="Skład wyjściowy"
        players={resolved.starting}
        playersById={playersById}
        color={team.color}
      />
      <PlayerListBlock
        title="Rezerwowi"
        players={resolved.subs}
        playersById={playersById}
        color={team.color}
      />
      <div className="px-4 py-3 border-t-2 border-ink/10">
        <div className="mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
          Trener
        </div>
        <div className="font-semibold">
          {resolved.coach ?? <span className="italic text-ink-soft">—</span>}
        </div>
      </div>
    </div>
  );
}

function FieldHalf({
  side,
  color,
  starting,
  playersById,
}: {
  side: PitchSide;
  color: string;
  starting: LineupPlayer[];
  playersById: Map<string, Player>;
}) {
  // Koordynaty trzymamy jak dla strony domowej (y: 0 dół=bramka, 100 góra=środek).
  // Dla gości odwracamy y, żeby rysować w lustrze.
  return (
    <div className="relative pitch-stripes aspect-[3/4] w-full border-b-2 border-ink">
      <PitchLines side={side} />
      {starting.map((p) => {
        const y = side === "home" ? 100 - p.y : p.y;
        const x = p.x;
        const player = playersById.get(p.playerId);
        return (
          <div
            key={p.playerId}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-ink flex items-center justify-center display text-base sm:text-lg shrink-0 shadow"
              style={{ backgroundColor: color }}
              title={player?.name ?? "?"}
            >
              <span className="text-chalk mix-blend-difference">
                {p.shirtNumber ?? "—"}
              </span>
            </div>
            <div className="mt-1 px-1.5 py-0.5 bg-ink text-chalk mono text-[10px] uppercase tracking-[0.1em] max-w-[80px] truncate leading-none">
              {player?.name.split(" ").slice(-1)[0] ?? "?"}
              {p.isCaptain && <span className="ml-1 text-lime">(C)</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PitchLines({ side }: { side: PitchSide }) {
  // Linie: linia środkowa, koło środkowe, pole karne własne.
  const isHome = side === "home";
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    >
      <g stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" fill="none">
        {/* obwódka */}
        <rect x="1" y="1" width="98" height="98" />
        {/* linia środkowa (u góry dla home, u dołu dla away) */}
        {isHome ? (
          <line x1="0" y1="1" x2="100" y2="1" />
        ) : (
          <line x1="0" y1="99" x2="100" y2="99" />
        )}
        {/* pole karne */}
        {isHome ? (
          <>
            <rect x="30" y="80" width="40" height="19" />
            <rect x="40" y="92" width="20" height="7" />
          </>
        ) : (
          <>
            <rect x="30" y="1" width="40" height="19" />
            <rect x="40" y="1" width="20" height="7" />
          </>
        )}
        {/* półkole środkowe */}
        {isHome ? (
          <path d="M 40 1 A 10 10 0 0 0 60 1" />
        ) : (
          <path d="M 40 99 A 10 10 0 0 1 60 99" />
        )}
      </g>
    </svg>
  );
}

function PlayerListBlock({
  title,
  players,
  playersById,
  color,
}: {
  title: string;
  players: LineupPlayer[];
  playersById: Map<string, Player>;
  color: string;
}) {
  return (
    <div className="border-t-2 border-ink/10">
      <div className="px-4 py-2 bg-cream-soft mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
        {title}
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
                className="flex items-center gap-3 px-4 py-2"
              >
                <div
                  className="w-8 h-8 flex items-center justify-center display text-sm shrink-0 border-2 border-ink"
                  style={{ backgroundColor: color }}
                >
                  <span className="text-chalk mix-blend-difference">
                    {p.shirtNumber ?? "—"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    {player?.name ?? "?"}
                    {p.isCaptain && (
                      <span className="ml-2 tag bg-lime text-ink border-ink">
                        Kapitan (C)
                      </span>
                    )}
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
