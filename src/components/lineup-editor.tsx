"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
type PickerTarget =
  | { kind: "slot"; index: number }
  | { kind: "sub" }
  | null;

const POSITIONS: LineupPlayer["position"][] = ["GK", "DF", "MF", "FW"];

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
  const [picker, setPicker] = useState<PickerTarget>(null);
  const [pending, startTransition] = useTransition();

  const playersById = useMemo(
    () => new Map(squad.map((p) => [p.id, p])),
    [squad],
  );

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

  function moveSlotToBench(idx: number) {
    const s = slots[idx];
    if (!s?.playerId) return;
    const p = playersById.get(s.playerId);
    if (!p) return;
    if (subs.length >= MAX_SUBS) {
      setError(`Ławka pełna (max ${MAX_SUBS}).`);
      return;
    }
    setSlots((curr) =>
      curr.map((x, i) =>
        i === idx
          ? { ...x, playerId: "", shirtNumber: null, isCaptain: false }
          : x,
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

  function toggleCaptain(idx: number) {
    setSlots((curr) =>
      curr.map((s, i) =>
        i === idx
          ? { ...s, isCaptain: !s.isCaptain }
          : { ...s, isCaptain: false },
      ),
    );
    setSubs((curr) => curr.map((s) => ({ ...s, isCaptain: false })));
  }

  function addSub(playerId: string) {
    const p = playersById.get(playerId);
    if (!p) return;
    if (subs.some((s) => s.playerId === p.id)) return;
    if (subs.length >= MAX_SUBS) return;
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

  function pickFor(target: PickerTarget) {
    setPicker(target);
  }

  function handlePick(playerId: string) {
    if (!picker) return;
    if (picker.kind === "slot") {
      placeInSlot(picker.index, playerId);
    } else {
      addSub(playerId);
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
    const captains = filled.filter((s) => s.isCaptain).length;
    if (captains === 0) {
      setError("Zaznacz kapitana (C) na jednym z zawodników.");
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
          coach: coach.trim() || null,
        });
        if (res.ok) {
          router.push(backHref);
          router.refresh();
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

      <div className="card p-3 bg-cream-soft border-dashed text-sm text-ink-soft">
        <strong className="text-ink">Jak edytować:</strong> kliknij pozycję na
        boisku, aby wybrać zawodnika. Aby zmienić gracza na pozycji — po prostu
        kliknij jego kółko i wybierz kogoś innego. Gwiazdka (★) nadaje opaskę
        kapitana.
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
                key={`${formation}-${s.position}-${s.x}-${s.y}`}
                slot={s}
                color={team.color}
                playerName={
                  s.playerId ? playersById.get(s.playerId)?.name ?? "?" : null
                }
                onClick={() => pickFor({ kind: "slot", index: i })}
                onDrop={(e) => onDropToSlot(e, i)}
                onClear={() => clearSlot(i)}
                onToggleCaptain={() => toggleCaptain(i)}
                onMoveToBench={() => moveSlotToBench(i)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <BenchPanel
            teamColor={team.color}
            subs={subs}
            playersById={playersById}
            onAdd={() => pickFor({ kind: "sub" })}
            onRemove={removeSub}
            onChangePos={(playerId, pos) =>
              setSubs((curr) =>
                curr.map((x) =>
                  x.playerId === playerId ? { ...x, position: pos } : x,
                ),
              )
            }
          />

          <SquadOverview
            squad={squad}
            slots={slots}
            subs={subs}
            teamColor={team.color}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap sticky bottom-0 bg-cream/95 backdrop-blur py-3 border-t-2 border-ink/10">
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
        />
      )}
    </div>
  );
}

function SlotMarker({
  slot,
  color,
  playerName,
  onClick,
  onDrop,
  onClear,
  onToggleCaptain,
  onMoveToBench,
}: {
  slot: Slot;
  color: string;
  playerName: string | null;
  onClick: () => void;
  onDrop: (e: React.DragEvent) => void;
  onClear: () => void;
  onToggleCaptain: () => void;
  onMoveToBench: () => void;
}) {
  const y = 100 - slot.y;
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
      style={{ left: `${slot.x}%`, top: `${y}%` }}
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
        className={`w-14 h-14 rounded-full border-2 flex items-center justify-center display text-lg shadow relative transition-transform hover:scale-105 ${
          slot.playerId
            ? slot.isCaptain
              ? "border-lime"
              : "border-ink"
            : "border-dashed border-chalk/80 bg-black/25"
        }`}
        style={slot.playerId ? { backgroundColor: color } : undefined}
      >
        {slot.playerId ? (
          <>
            <span className="text-chalk mix-blend-difference">
              {slot.shirtNumber ?? "—"}
            </span>
            {slot.isCaptain && (
              <span className="absolute -top-1 -right-1 bg-lime text-ink text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-ink">
                C
              </span>
            )}
          </>
        ) : (
          <span className="text-chalk/90 text-xs">{slot.position}</span>
        )}
      </button>

      {slot.playerId ? (
        <>
          <div className="mt-1 px-1.5 py-0.5 bg-ink text-chalk mono text-[10px] uppercase tracking-[0.1em] max-w-[100px] truncate leading-none">
            {playerName}
          </div>
          <div className="mt-1 flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleCaptain}
              title="Kapitan"
              className={`w-6 h-6 rounded-full border border-ink text-[11px] flex items-center justify-center ${
                slot.isCaptain
                  ? "bg-lime text-ink"
                  : "bg-chalk text-ink-soft hover:text-ink"
              }`}
            >
              ★
            </button>
            <button
              type="button"
              onClick={onMoveToBench}
              title="Na ławkę"
              className="w-6 h-6 rounded-full border border-ink bg-chalk text-ink-soft hover:text-ink text-[11px] flex items-center justify-center"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={onClear}
              title="Usuń z pozycji"
              className="w-6 h-6 rounded-full border border-ink bg-chalk text-rust hover:bg-rust hover:text-chalk text-[11px] flex items-center justify-center"
            >
              ×
            </button>
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
  onAdd,
  onRemove,
  onChangePos,
}: {
  teamColor: string;
  subs: LineupPlayer[];
  playersById: Map<string, Player>;
  onAdd: () => void;
  onRemove: (playerId: string) => void;
  onChangePos: (playerId: string, pos: LineupPlayer["position"]) => void;
}) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-2 bg-lime text-ink mono text-[11px] uppercase tracking-[0.3em] flex items-center justify-between">
        <span>
          Rezerwowi ({subs.length}/{MAX_SUBS})
        </span>
        <button
          type="button"
          onClick={onAdd}
          disabled={subs.length >= MAX_SUBS}
          className="px-2 py-0.5 bg-ink text-lime text-[11px] disabled:opacity-40"
        >
          + dodaj
        </button>
      </div>
      {subs.length === 0 ? (
        <div className="p-4 italic text-ink-soft text-sm">
          Brak rezerwowych. Kliknij „+ dodaj".
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
                  <select
                    value={s.position}
                    onChange={(e) =>
                      onChangePos(
                        s.playerId,
                        e.target.value as LineupPlayer["position"],
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
                  onClick={() => onRemove(s.playerId)}
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
  );
}

function SquadOverview({
  squad,
  slots,
  subs,
  teamColor,
}: {
  squad: Player[];
  slots: Slot[];
  subs: LineupPlayer[];
  teamColor: string;
}) {
  const placementOf = (id: string): "slot" | "sub" | "free" => {
    if (slots.some((s) => s.playerId === id)) return "slot";
    if (subs.some((s) => s.playerId === id)) return "sub";
    return "free";
  };

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-2 bg-ink text-lime mono text-[11px] uppercase tracking-[0.3em]">
        Kadra ({squad.length})
      </div>
      {squad.length === 0 ? (
        <div className="p-4 italic text-ink-soft text-sm">Brak zawodników.</div>
      ) : (
        <ul className="divide-y-2 divide-ink/10 max-h-[320px] overflow-y-auto">
          {squad.map((p) => {
            const place = placementOf(p.id);
            return (
              <li
                key={p.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", p.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                className="flex items-center gap-3 p-2 cursor-grab active:cursor-grabbing hover:bg-cream-soft"
              >
                <div
                  className="w-7 h-7 flex items-center justify-center display text-xs shrink-0 border-2 border-ink"
                  style={{ backgroundColor: teamColor }}
                >
                  <span className="text-chalk mix-blend-difference">
                    {p.number ?? "—"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate text-sm">
                    {p.name}
                  </div>
                  <div className="mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
                    {p.position}
                  </div>
                </div>
                <span
                  className={`mono text-[10px] uppercase tracking-[0.15em] px-1.5 py-0.5 border ${
                    place === "slot"
                      ? "bg-pitch text-chalk border-pitch"
                      : place === "sub"
                        ? "bg-lime text-ink border-ink"
                        : "bg-chalk text-ink-soft border-ink/30"
                  }`}
                >
                  {place === "slot"
                    ? "skład"
                    : place === "sub"
                      ? "ławka"
                      : "wolny"}
                </span>
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
}: {
  target: PickerTarget;
  squad: Player[];
  slots: Slot[];
  subs: LineupPlayer[];
  teamColor: string;
  onPick: (playerId: string) => void;
  onClose: () => void;
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
              const disabled =
                target.kind === "sub" &&
                (place === "sub" || subs.length >= MAX_SUBS);
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
