import Link from "next/link";
import { DEFAULT_FORMATION, STARTING_SIZE } from "@/lib/formations";
import type { LineupPlayer, MatchLineup, Player, Team } from "@/lib/types";

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
            {side === "home" ? "Gospodarze" : "Goście"}
            {!resolved.synthetic && ` · ${resolved.formation}`}
          </div>
        </div>
        {canEdit && (
          <Link
            href={`/mecze/${matchId}/sklady/edytuj?team=${team.id}`}
            className="btn-primary text-xs"
          >
            Edytuj skład
          </Link>
        )}
      </div>

      {resolved.synthetic ? (
        <EmptyPitch
          side={side}
          canEdit={canEdit}
          matchId={matchId}
          teamId={team.id}
        />
      ) : (
        <FieldHalf
          side={side}
          color={team.color}
          starting={resolved.starting}
          playersById={playersById}
        />
      )}

      {lineup?.lockedAt && (
        <div className="px-4 py-2 bg-ink text-lime mono text-[11px] uppercase tracking-[0.2em]">
          Skład zablokowany (snapshot)
        </div>
      )}

      {!resolved.synthetic && (
        <>
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
        </>
      )}
    </div>
  );
}

function EmptyPitch({
  side,
  canEdit,
  matchId,
  teamId,
}: {
  side: PitchSide;
  canEdit: boolean;
  matchId: string;
  teamId: string;
}) {
  return (
    <div className="relative pitch-stripes aspect-[3/4] w-full border-b-2 border-ink flex items-center justify-center">
      <PitchLines side={side} />
      <div className="relative z-10 mx-4 text-center bg-ink/70 backdrop-blur-sm border-2 border-chalk/30 p-5 sm:p-6 max-w-[260px]">
        <div className="mono text-[10px] uppercase tracking-[0.3em] text-lime">
          Skład jeszcze nieustawiony
        </div>
        <div className="display text-xl sm:text-2xl text-chalk mt-2 leading-tight">
          Czekamy na kapitana
        </div>
        <p className="text-chalk/80 text-xs sm:text-sm mt-2">
          Formacja i zawodnicy pojawią się tutaj, gdy tylko skład zostanie
          zapisany.
        </p>
        {canEdit && (
          <Link
            href={`/mecze/${matchId}/sklady/edytuj?team=${teamId}`}
            className="inline-block mt-4 btn-primary text-xs"
          >
            Ustaw skład →
          </Link>
        )}
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
              className={`relative w-9 h-9 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center display text-sm sm:text-lg shrink-0 shadow ${
                p.isCaptain ? "border-lime ring-2 ring-lime/50" : "border-ink"
              }`}
              style={{ backgroundColor: color }}
              title={player?.name ?? "?"}
            >
              <span className="text-chalk mix-blend-difference">
                {p.shirtNumber ?? "—"}
              </span>
              {p.isCaptain && (
                <span className="absolute -top-1 -right-1 bg-lime text-ink text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-ink">
                  C
                </span>
              )}
            </div>
            <div className="mt-1 px-1.5 py-0.5 bg-ink text-chalk mono text-[9px] sm:text-[10px] uppercase tracking-[0.1em] max-w-[70px] sm:max-w-[90px] truncate leading-none">
              {player?.name.split(" ").slice(-1)[0] ?? "?"}
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
