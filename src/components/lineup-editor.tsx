"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  DEFAULT_FORMATION,
  FORMATION_NAMES,
  getFormationPositions,
  MAX_SUBS,
  STARTING_SIZE,
} from "@/lib/formations";
import { saveLineup } from "@/lib/lineup-actions";
import type { LineupPlayer, MatchLineup, Player, Team } from "@/lib/types";

type Slot = LineupPlayer;

const POSITIONS: LineupPlayer["position"][] = ["GK", "DF", "MF", "FW"];

function initialSlots(
  formation: string,
  existing: LineupPlayer[],
): Slot[] {
  const positions = getFormationPositions(formation);
  const byIndex: Slot[] = positions.map((pos) => ({
    playerId: "",
    shirtNumber: null,
    position: pos.position,
    x: pos.x,
    y: pos.y,
    isCaptain: false,
  }));
  // Spróbuj dopasować istniejących po kolejności
  existing.slice(0, byIndex.length).forEach((p, i) => {
    byIndex[i] = {
      playerId: p.playerId,
      shirtNumber: p.shirtNumber,
      position: byIndex[i].position,
      x: byIndex[i].x,
      y: byIndex[i].y,
      isCaptain: p.isCaptain,
    };
  });
  return byIndex;
}

export function LineupEditor({
  matchId,
  team,
  squad,
  initialLineup,
  backHref,
}: {
  matchId: string;
  team: Team;
  squad: Player[];
  initialLineup: MatchLineup | null;
  backHref: string;
}) {
  const router = useRouter();
  const [formation, setFormation] = useState<string>(
    initialLineup?.formation ?? DEFAULT_FORMATION,
  );
  const [slots, setSlots] = useState<Slot[]>(() =>
    initialSlots(formation, initialLineup?.startingXI ?? []),
  );
  const [subs, setSubs] = useState<LineupPlayer[]>(
    initialLineup?.substitutes ?? [],
  );
  const [coach, setCoach] = useState<string>(initialLineup?.coach ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const usedIds = useMemo(() => {
    const s = new Set<string>();
    for (const slot of slots) if (slot.playerId) s.add(slot.playerId);
    for (const sub of subs) s.add(sub.playerId);
    return s;
  }, [slots, subs]);

  const available = useMemo(
    () => squad.filter((p) => !usedIds.has(p.id)),
    [squad, usedIds],
  );

  function changeFormation(name: string) {
    setFormation(name);
    const positions = getFormationPositions(name);
    // Zachowaj obsadzonych graczy w tej samej kolejności
    const existing = slots.filter((s) => s.playerId);
    const next: Slot[] = positions.map((pos, i) => {
      const keep = existing[i];
      return keep
        ? {
            playerId: keep.playerId,
            shirtNumber: keep.shirtNumber,
            position: pos.position,
            x: pos.x,
            y: pos.y,
            isCaptain: keep.isCaptain,
          }
        : {
            playerId: "",
            shirtNumber: null,
            position: pos.position,
            x: pos.x,
            y: pos.y,
            isCaptain: false,
          };
    });
    setSlots(next);
  }

  function assignToSlot(slotIdx: number, playerId: string) {
    const p = squad.find((q) => q.id === playerId);
    if (!p) return;
    setSlots((curr) =>
      curr.map((s, i) => {
        if (i === slotIdx) {
          return {
            ...s,
            playerId: p.id,
            shirtNumber: p.number,
          };
        }
        // Jeśli gracz był gdzie indziej - wyczyść tamto miejsce
        if (s.playerId === p.id) {
          return {
            ...s,
            playerId: "",
            shirtNumber: null,
            isCaptain: false,
          };
        }
        return s;
      }),
    );
    setSubs((curr) => curr.filter((s) => s.playerId !== p.id));
  }

  function clearSlot(idx: number) {
    setSlots((curr) =>
      curr.map((s, i) =>
        i === idx
          ? { ...s, playerId: "", shirtNumber: null, isCaptain: false }
          : s,
      ),
    );
  }

  function toggleCaptain(idx: number) {
    setSlots((curr) =>
      curr.map((s, i) =>
        i === idx
          ? { ...s, isCaptain: !s.isCaptain }
          : { ...s, isCaptain: false },
      ),
    );
  }

  function addSub(playerId: string) {
    const p = squad.find((q) => q.id === playerId);
    if (!p) return;
    if (subs.length >= MAX_SUBS) return;
    // zdjęcie ze składu wyjściowego jeśli tam jest
    setSlots((curr) =>
      curr.map((s) =>
        s.playerId === p.id
          ? { ...s, playerId: "", shirtNumber: null, isCaptain: false }
          : s,
      ),
    );
    setSubs((curr) => [
      ...curr,
      {
        playerId: p.id,
        shirtNumber: p.number,
        position: guessPosition(p.position),
        x: 0,
        y: 0,
        isCaptain: false,
      },
    ]);
  }

  function removeSub(playerId: string) {
    setSubs((curr) => curr.filter((s) => s.playerId !== playerId));
  }

  function onDropToSlot(e: React.DragEvent, slotIdx: number) {
    e.preventDefault();
    const playerId = e.dataTransfer.getData("text/plain");
    if (playerId) assignToSlot(slotIdx, playerId);
  }

  function onSave() {
    setError(null);
    const filled = slots.filter((s) => s.playerId);
    if (filled.length !== STARTING_SIZE) {
      setError(`Uzupełnij wszystkie ${STARTING_SIZE} pozycji.`);
      return;
    }
    const captains = filled.filter((s) => s.isCaptain).length;
    if (captains === 0) {
      setError("Zaznacz kapitana (C).");
      return;
    }
    startTransition(async () => {
      const res = await saveLineup({
        matchId,
        teamId: team.id,
        formation,
        startingXI: filled,
        substitutes: subs,
        coach: coach.trim() || null,
      });
      if (res.ok) {
        router.push(backHref);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  const playersById = new Map(squad.map((p) => [p.id, p]));
  const filledCount = slots.filter((s) => s.playerId).length;

  return (
    <div className="space-y-6">
      <div className="card p-4 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[180px]">
          <div className="mono text-[11px] uppercase tracking-[0.25em] text-ink-soft mb-1.5">
            Formacja
          </div>
          <select
            value={formation}
            onChange={(e) => changeFormation(e.target.value)}
            className="field w-full"
          >
            {FORMATION_NAMES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-[2] min-w-[220px]">
          <div className="mono text-[11px] uppercase tracking-[0.25em] text-ink-soft mb-1.5">
            Trener
          </div>
          <input
            value={coach}
            onChange={(e) => setCoach(e.target.value)}
            className="field w-full"
            placeholder="np. Jan Kowalski"
          />
        </div>
        <div className="mono text-[11px] uppercase tracking-[0.25em] text-ink-soft">
          {filledCount}/{STARTING_SIZE} na boisku · {subs.length}/{MAX_SUBS}{" "}
          rezerwowych
        </div>
      </div>

      {error && (
        <div className="border-2 border-rust bg-rust/10 text-rust px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card p-0 overflow-hidden">
          <div
            className="p-3 border-b-2 border-ink"
            style={{ backgroundColor: team.color }}
          >
            <div className="display text-lg text-chalk mix-blend-difference">
              {team.name} — Twoje ustawienie
            </div>
          </div>
          <div className="relative pitch-stripes aspect-[3/4] w-full">
            {slots.map((s, i) => (
              <SlotMarker
                key={i}
                slot={s}
                index={i}
                color={team.color}
                playerName={
                  s.playerId
                    ? playersById.get(s.playerId)?.name ?? "?"
                    : null
                }
                onDrop={(e) => onDropToSlot(e, i)}
                onClear={() => clearSlot(i)}
                onToggleCaptain={() => toggleCaptain(i)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-2 bg-ink text-lime mono text-[11px] uppercase tracking-[0.3em]">
              Kadra (przeciągnij na pozycję)
            </div>
            {available.length === 0 ? (
              <div className="p-4 italic text-ink-soft text-sm">
                Wszyscy gracze rozstawieni.
              </div>
            ) : (
              <ul className="divide-y-2 divide-ink/10 max-h-[360px] overflow-y-auto">
                {available.map((p) => (
                  <li
                    key={p.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", p.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="flex items-center gap-3 p-2.5 cursor-grab active:cursor-grabbing hover:bg-cream-soft"
                  >
                    <div
                      className="w-8 h-8 flex items-center justify-center display text-sm shrink-0 border-2 border-ink"
                      style={{ backgroundColor: team.color }}
                    >
                      <span className="text-chalk mix-blend-difference">
                        {p.number ?? "—"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{p.name}</div>
                      {p.position && (
                        <div className="mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
                          {p.position}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => addSub(p.id)}
                      disabled={subs.length >= MAX_SUBS}
                      className="btn-ghost text-[11px] disabled:opacity-40"
                    >
                      + rez.
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-2 bg-lime text-ink mono text-[11px] uppercase tracking-[0.3em]">
              Rezerwowi ({subs.length}/{MAX_SUBS})
            </div>
            {subs.length === 0 ? (
              <div className="p-4 italic text-ink-soft text-sm">
                Brak rezerwowych.
              </div>
            ) : (
              <ul className="divide-y-2 divide-ink/10">
                {subs.map((s) => {
                  const p = playersById.get(s.playerId);
                  return (
                    <li
                      key={s.playerId}
                      className="flex items-center gap-3 p-2.5"
                    >
                      <div
                        className="w-8 h-8 flex items-center justify-center display text-sm shrink-0 border-2 border-ink"
                        style={{ backgroundColor: team.color }}
                      >
                        <span className="text-chalk mix-blend-difference">
                          {s.shirtNumber ?? "—"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">
                          {p?.name ?? "?"}
                        </div>
                        <select
                          value={s.position}
                          onChange={(e) =>
                            setSubs((curr) =>
                              curr.map((x) =>
                                x.playerId === s.playerId
                                  ? {
                                      ...x,
                                      position: e.target
                                        .value as LineupPlayer["position"],
                                    }
                                  : x,
                              ),
                            )
                          }
                          className="field !py-1 !px-2 text-xs"
                        >
                          {POSITIONS.map((pos) => (
                            <option key={pos} value={pos}>
                              {pos}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSub(s.playerId)}
                        className="text-rust mono text-[11px] tracking-[0.2em] hover:underline"
                      >
                        usuń
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="btn-primary disabled:opacity-50"
        >
          {pending ? "Zapisywanie…" : "Zapisz skład"}
        </button>
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="btn-ghost"
        >
          Anuluj
        </button>
      </div>
    </div>
  );
}

function SlotMarker({
  slot,
  index,
  color,
  playerName,
  onDrop,
  onClear,
  onToggleCaptain,
}: {
  slot: Slot;
  index: number;
  color: string;
  playerName: string | null;
  onDrop: (e: React.DragEvent) => void;
  onClear: () => void;
  onToggleCaptain: () => void;
}) {
  // Edytor ZAWSZE renderuje jak dla strony domowej (y=0 dół).
  const y = 100 - slot.y;
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
      style={{ left: `${slot.x}%`, top: `${y}%` }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={onDrop}
    >
      {slot.playerId ? (
        <>
          <button
            type="button"
            onClick={onToggleCaptain}
            title={`${playerName} — kliknij, aby ${
              slot.isCaptain ? "zdjąć" : "nadać"
            } opaskę kapitana`}
            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center display text-lg shadow relative ${
              slot.isCaptain ? "border-lime" : "border-ink"
            }`}
            style={{ backgroundColor: color }}
          >
            <span className="text-chalk mix-blend-difference">
              {slot.shirtNumber ?? "—"}
            </span>
            {slot.isCaptain && (
              <span className="absolute -top-1 -right-1 bg-lime text-ink text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-ink">
                C
              </span>
            )}
          </button>
          <div className="mt-1 px-1.5 py-0.5 bg-ink text-chalk mono text-[10px] uppercase tracking-[0.1em] max-w-[90px] truncate leading-none">
            {playerName}
          </div>
          <button
            type="button"
            onClick={onClear}
            className="mt-0.5 text-[10px] text-chalk/80 hover:text-rust mono uppercase tracking-[0.2em]"
          >
            usuń
          </button>
        </>
      ) : (
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-chalk/70 flex items-center justify-center display text-xs text-chalk/80 bg-black/20">
          {slot.position}
          <span className="sr-only"> pozycja {index + 1}</span>
        </div>
      )}
    </div>
  );
}

function guessPosition(raw: string): LineupPlayer["position"] {
  const s = raw.toUpperCase();
  if (s.includes("BR") || s.includes("GK")) return "GK";
  if (s.includes("OB") || s.includes("DEF") || s.includes("DF")) return "DF";
  if (s.includes("POM") || s.includes("MID") || s.includes("MF")) return "MF";
  if (s.includes("NAP") || s.includes("FW") || s.includes("ATK")) return "FW";
  return "MF";
}
