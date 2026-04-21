"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  DEFAULT_FORMATION,
  FORMATION_NAMES,
  getFormationPositions,
  STARTING_SIZE,
} from "@/lib/formations";
import { saveLineup } from "@/lib/lineup-actions";
import type { LineupPlayer, MatchLineup, Player, Team } from "@/lib/types";

type Slot = LineupPlayer;
type PickerTarget = { kind: "slot"; index: number } | null;

function initialSlots(formation: string, existing: LineupPlayer[]): Slot[] {
  const positions = getFormationPositions(formation);
  const byIndex: Slot[] = positions.map((pos) => ({
    playerId: "",
    shirtNumber: null,
    position: pos.position,
    x: pos.x,
    y: pos.y,
    isCaptain: false,
  }));
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
  const [formation, setFormation] = useState<string>(
    initialLineup?.formation ?? DEFAULT_FORMATION,
  );
  const [slots, setSlots] = useState<Slot[]>(() =>
    initialSlots(formation, initialLineup?.startingXI ?? []),
  );
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerTarget>(null);
  const [pending, startTransition] = useTransition();

  const playersById = useMemo(
    () => new Map(squad.map((p) => [p.id, p])),
    [squad],
  );

  const subs = useMemo<LineupPlayer[]>(() => {
    const inSlots = new Set(
      slots.map((s) => s.playerId).filter((id): id is string => !!id),
    );
    return squad
      .filter((p) => !inSlots.has(p.id))
      .map((p) => ({
        playerId: p.id,
        shirtNumber: p.number,
        position: guessPosition(p.position),
        x: 0,
        y: 0,
        isCaptain: false,
      }));
  }, [slots, squad]);

  function changeFormation(name: string) {
    setFormation(name);
    const positions = getFormationPositions(name);
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

  function placeInSlot(slotIdx: number, playerId: string) {
    const p = playersById.get(playerId);
    if (!p) return;
    setSlots((curr) =>
      curr.map((s, i) => {
        if (i === slotIdx) {
          return { ...s, playerId: p.id, shirtNumber: p.number };
        }
        if (s.playerId === p.id) {
          return { ...s, playerId: "", shirtNumber: null, isCaptain: false };
        }
        return s;
      }),
    );
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

  function moveSlotToBench(idx: number) {
    // Ławka jest teraz zawsze "reszta kadry" - wystarczy zwolnić pozycję.
    clearSlot(idx);
  }

  function pickFor(target: PickerTarget) {
    setPicker(target);
  }

  function handlePick(playerId: string) {
    if (!picker) return;
    if (picker.kind === "slot") {
      placeInSlot(picker.index, playerId);
    }
    setPicker(null);
  }

  function onDropToSlot(e: React.DragEvent, slotIdx: number) {
    e.preventDefault();
    const playerId = e.dataTransfer.getData("text/plain");
    if (playerId) placeInSlot(slotIdx, playerId);
  }

  function onSave() {
    setError(null);
    const filled = slots.filter((s) => s.playerId);
    if (filled.length !== STARTING_SIZE) {
      setError(`Uzupełnij wszystkie ${STARTING_SIZE} pozycji na boisku.`);
      return;
    }
    startTransition(async () => {
      try {
        const res = await saveLineup({
          matchId,
          teamId: team.id,
          formation,
          startingXI: filled,
          substitutes: subs,
          coach: null,
        });
        if (res.ok) {
          window.location.assign(backHref);
        } else {
          setError(res.error);
        }
      } catch (e) {
        setError(
          `Błąd zapisu: ${e instanceof Error ? e.message : "nieznany błąd"}`,
        );
      }
    });
  }

  const filledCount = slots.filter((s) => s.playerId).length;

  return (
    <div className="space-y-5 pb-24">
      {/* Pasek: formacja + licznik */}
      <div className="card p-0 overflow-hidden">
        <div
          className="flex items-center gap-3 p-3 sm:p-4"
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
              Tryb kapitana · {filledCount}/{STARTING_SIZE} na boisku ·{" "}
              {subs.length} rezerwowych
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 p-3 sm:p-4 border-t-2 border-ink/10 bg-cream-soft">
          <label className="flex items-center gap-2">
            <span className="mono text-[11px] uppercase tracking-[0.25em] text-ink-soft">
              Formacja
            </span>
            <select
              value={formation}
              onChange={(e) => changeFormation(e.target.value)}
              className="field !py-1.5"
            >
              {FORMATION_NAMES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <div className="flex-1" />
          <div className="mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
            Dotknij pozycji, by wybrać zawodnika
          </div>
        </div>
      </div>

      {error && (
        <div className="border-2 border-rust bg-rust/10 text-rust px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Boisko poziome - Flashscore style */}
      <div className="card p-0 overflow-hidden">
        <div className="relative pitch-stripes w-full aspect-[4/3] sm:aspect-[16/9] overflow-hidden">
          <EditorPitchLines />
          {/* Ławka przeciwnika - przyciemnione pole */}
          <div className="absolute inset-y-0 right-0 w-1/2 bg-ink/20 pointer-events-none flex items-center justify-center">
            <div className="mono text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-chalk/50 rotate-90 sm:rotate-0 whitespace-nowrap">
              · połowa przeciwnika ·
            </div>
          </div>
          {slots.map((s, i) => (
            <SlotMarker
              key={`${formation}-${s.position}-${s.x}-${s.y}`}
              slot={s}
              color={team.color}
              cx={s.y * 0.5}
              cy={s.x}
              playerName={
                s.playerId ? playersById.get(s.playerId)?.name ?? "?" : null
              }
              onClick={() => pickFor({ kind: "slot", index: i })}
              onDrop={(e) => onDropToSlot(e, i)}
              onClear={() => clearSlot(i)}
              onMoveToBench={() => moveSlotToBench(i)}
            />
          ))}
        </div>
      </div>

      {/* Rezerwowi automatyczni */}
      <BenchPanel
        teamColor={team.color}
        subs={subs}
        playersById={playersById}
      />

      {/* Sticky pasek akcji */}
      <div className="flex items-center gap-3 flex-wrap fixed bottom-0 left-0 right-0 z-30 bg-cream/95 backdrop-blur px-4 py-3 border-t-2 border-ink shadow-lg">
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="btn-primary disabled:opacity-50 flex-1 sm:flex-none"
        >
          {pending ? "Zapisywanie…" : "Zapisz skład"}
        </button>
        <button
          type="button"
          onClick={() => window.location.assign(backHref)}
          className="btn-ghost"
          disabled={pending}
        >
          Anuluj
        </button>
      </div>

      {picker && (
        <PlayerPicker
          target={picker}
          squad={squad}
          slots={slots}
          subs={subs}
          teamColor={team.color}
          onPick={handlePick}
          onClose={() => setPicker(null)}
          onMoveToBench={moveSlotToBench}
          onClear={clearSlot}
        />
      )}
    </div>
  );
}

function EditorPitchLines() {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    >
      <g stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" fill="none">
        <rect x="1" y="1" width="98" height="98" />
        <line x1="50" y1="1" x2="50" y2="99" />
        <circle cx="50" cy="50" r="10" />
        <circle cx="50" cy="50" r="0.8" fill="rgba(255,255,255,0.4)" />
        <rect x="1" y="30" width="18" height="40" />
        <rect x="1" y="40" width="7" height="20" />
        <rect x="81" y="30" width="18" height="40" />
        <rect x="92" y="40" width="7" height="20" />
        <path d="M 19 40 A 10 10 0 0 1 19 60" />
        <path d="M 81 40 A 10 10 0 0 0 81 60" />
      </g>
    </svg>
  );
}

function SlotMarker({
  slot,
  color,
  cx,
  cy,
  playerName,
  onClick,
  onDrop,
}: {
  slot: Slot;
  color: string;
  cx: number;
  cy: number;
  playerName: string | null;
  onClick: () => void;
  onDrop: (e: React.DragEvent) => void;
  onClear: () => void;
  onMoveToBench: () => void;
}) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
      style={{ left: `${cx}%`, top: `${cy}%` }}
    >
      <button
        type="button"
        onClick={onClick}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={onDrop}
        title={
          slot.playerId
            ? `${playerName} — kliknij, aby zmienić`
            : `Kliknij, aby wybrać zawodnika (${slot.position})`
        }
        className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full border-2 flex items-center justify-center display text-base sm:text-lg shadow relative transition-transform active:scale-95 sm:hover:scale-105 ${
          slot.playerId
            ? "border-ink"
            : "border-dashed border-chalk/80 bg-black/25"
        }`}
        style={slot.playerId ? { backgroundColor: color } : undefined}
      >
        {slot.playerId ? (
          <span className="text-chalk mix-blend-difference">
            {slot.shirtNumber ?? "—"}
          </span>
        ) : (
          <span className="text-chalk/90 text-xs">{slot.position}</span>
        )}
      </button>

      {slot.playerId ? (
        <>
          <div className="mt-1 px-1.5 py-0.5 bg-ink text-chalk mono text-[9px] sm:text-[10px] uppercase tracking-[0.1em] max-w-[72px] sm:max-w-[100px] truncate leading-none">
            {playerName?.split(" ").slice(-1)[0] ?? "?"}
          </div>
        </>
      ) : (
        <div className="mt-1 mono text-[10px] uppercase tracking-[0.2em] text-chalk/80 bg-ink/50 px-1.5 py-0.5">
          wybierz
        </div>
      )}
    </div>
  );
}

function BenchPanel({
  teamColor,
  subs,
  playersById,
}: {
  teamColor: string;
  subs: LineupPlayer[];
  playersById: Map<string, Player>;
}) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-2 bg-lime text-ink mono text-[11px] uppercase tracking-[0.3em] flex items-center justify-between">
        <span>Rezerwowi ({subs.length})</span>
        <span className="text-[10px] opacity-70">automatycznie</span>
      </div>
      {subs.length === 0 ? (
        <div className="p-4 italic text-ink-soft text-sm">
          Wszyscy zawodnicy są w składzie wyjściowym.
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
                  style={{ backgroundColor: teamColor }}
                >
                  <span className="text-chalk mix-blend-difference">
                    {s.shirtNumber ?? "—"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    {p?.name ?? "?"}
                  </div>
                  <div className="mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
                    {s.position}
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

function PlayerPicker({
  target,
  squad,
  slots,
  subs,
  teamColor,
  onPick,
  onClose,
  onMoveToBench,
  onClear,
}: {
  target: PickerTarget;
  squad: Player[];
  slots: Slot[];
  subs: LineupPlayer[];
  teamColor: string;
  onPick: (playerId: string) => void;
  onClose: () => void;
  onMoveToBench: (index: number) => void;
  onClear: (index: number) => void;
}) {
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    searchRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!target) return null;

  const placement = (id: string): "slot" | "sub" | "free" => {
    if (slots.some((s) => s.playerId === id)) return "slot";
    if (subs.some((s) => s.playerId === id)) return "sub";
    return "free";
  };

  const currentPlayerId =
    target.kind === "slot" ? slots[target.index]?.playerId : "";
  const activeSlot =
    target.kind === "slot" && currentPlayerId ? slots[target.index] : null;
  const activeSlotIndex = target.kind === "slot" ? target.index : -1;
  const activeSlotPlayer = activeSlot
    ? squad.find((p) => p.id === activeSlot.playerId) ?? null
    : null;

  const filtered = squad.filter((p) =>
    q.trim()
      ? p.name.toLowerCase().includes(q.trim().toLowerCase()) ||
        String(p.number ?? "").includes(q.trim())
      : true,
  );

  const title =
    target.kind === "slot"
      ? `Wybierz zawodnika na pozycję ${slots[target.index]?.position ?? ""}`
      : "Dodaj rezerwowego";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Zamknij okno wyboru"
        onClick={onClose}
        className="absolute inset-0 bg-ink/60 cursor-default"
      />
      <div className="relative bg-cream border-2 border-ink w-full sm:max-w-md max-h-[90vh] flex flex-col">
        <div className="p-4 border-b-2 border-ink flex items-center justify-between gap-3">
          <div className="display text-lg">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 border-2 border-ink bg-chalk hover:bg-rust hover:text-chalk flex items-center justify-center"
            aria-label="Zamknij"
          >
            ×
          </button>
        </div>
        {activeSlot && activeSlotPlayer && (
          <div className="px-3 py-3 border-b-2 border-ink/10 bg-cream-soft space-y-2">
            <div className="mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
              Aktualnie na pozycji
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 flex items-center justify-center display text-base shrink-0 border-2 border-ink"
                style={{ backgroundColor: teamColor }}
              >
                <span className="text-chalk mix-blend-difference">
                  {activeSlotPlayer.number ?? "—"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">
                  {activeSlotPlayer.name}
                </div>
                <div className="mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
                  {activeSlot.position}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  onMoveToBench(activeSlotIndex);
                  onClose();
                }}
                className="display text-xs px-2.5 py-1.5 border-2 border-ink bg-chalk hover:bg-ink hover:text-lime"
              >
                ↓ Na ławkę
              </button>
              <button
                type="button"
                onClick={() => {
                  onClear(activeSlotIndex);
                  onClose();
                }}
                className="display text-xs px-2.5 py-1.5 border-2 border-rust text-rust hover:bg-rust hover:text-chalk"
              >
                × Usuń z pozycji
              </button>
            </div>
          </div>
        )}
        <div className="p-3 border-b-2 border-ink/10">
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Szukaj po nazwisku lub numerze…"
            className="field w-full"
          />
        </div>
        <ul className="flex-1 overflow-y-auto divide-y-2 divide-ink/10">
          {filtered.length === 0 ? (
            <li className="p-4 italic text-ink-soft text-sm">
              Brak pasujących zawodników.
            </li>
          ) : (
            filtered.map((p) => {
              const place = placement(p.id);
              const isCurrent = p.id === currentPlayerId;
              const disabled = false;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onPick(p.id)}
                    className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                      isCurrent
                        ? "bg-lime/30"
                        : disabled
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-cream-soft"
                    }`}
                  >
                    <div
                      className="w-9 h-9 flex items-center justify-center display text-sm shrink-0 border-2 border-ink"
                      style={{ backgroundColor: teamColor }}
                    >
                      <span className="text-chalk mix-blend-difference">
                        {p.number ?? "—"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{p.name}</div>
                      <div className="mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
                        {p.position}
                      </div>
                    </div>
                    <span
                      className={`mono text-[10px] uppercase tracking-[0.15em] px-1.5 py-0.5 border ${
                        isCurrent
                          ? "bg-lime text-ink border-ink"
                          : place === "slot"
                            ? "bg-pitch text-chalk border-pitch"
                            : place === "sub"
                              ? "bg-lime text-ink border-ink"
                              : "bg-chalk text-ink-soft border-ink/30"
                      }`}
                    >
                      {isCurrent
                        ? "tu"
                        : place === "slot"
                          ? "skład"
                          : place === "sub"
                            ? "ławka"
                            : "wolny"}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <div className="p-3 border-t-2 border-ink/10 mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
          Tap zawodnika — jeśli jest już gdzie indziej, zostanie automatycznie
          przeniesiony.
        </div>
      </div>
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
