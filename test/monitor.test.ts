import { expect, test } from "bun:test";
import { createMonitor } from "../src/monitor";

test("persists a verified official reading and exposes the latest panorama", () => {
  const monitor = createMonitor(":memory:");

  monitor.recordVerifiedReading({
    electionCode: "6257",
    turn: 1,
    office: "presidente",
    uf: "BR",
    collectedAt: "2026-10-04T20:00:00.000Z",
    sourceUrl: "https://resultados.tse.jus.br/oficial.json",
    signatureValid: true,
    totals: { sectionsTotal: 100, sectionsCounted: 76, validVotes: 9000 },
    candidates: [
      { tseId: "1", name: "Candidata A", number: "10", party: "PA", votes: 5000, status: "eleito" },
      { tseId: "2", name: "Candidato B", number: "20", party: "PB", votes: 4000, status: "nao_eleito" }
    ]
  });

  expect(monitor.latestPanorama("6257", 1, "presidente", "BR")).toEqual({
    collectedAt: "2026-10-04T20:00:00.000Z",
    stale: false,
    totals: { sectionsTotal: 100, sectionsCounted: 76, validVotes: 9000 },
    candidates: [
      { tseId: "1", name: "Candidata A", number: "10", party: "PA", votes: 5000, percentage: 55.56, status: "eleito" },
      { tseId: "2", name: "Candidato B", number: "20", party: "PB", votes: 4000, percentage: 44.44, status: "nao_eleito" }
    ]
  });
});

test("keeps an included candidacy searchable and deactivation preserves its history", () => {
  const monitor = createMonitor(":memory:");
  monitor.includeCandidacy({ tseId: "42", uf: "DF", office: "deputado_distrital", name: "Nome Oficial", number: "12345" });

  expect(monitor.monitoredCandidacies()).toEqual([
    { tseId: "42", uf: "DF", office: "deputado_distrital", name: "Nome Oficial", number: "12345", active: true }
  ]);

  monitor.deactivateCandidacy("42");

  expect(monitor.monitoredCandidacies()).toEqual([
    { tseId: "42", uf: "DF", office: "deputado_distrital", name: "Nome Oficial", number: "12345", active: false }
  ]);
});

test("marks the last official result as stale when the source fails", () => {
  const monitor = createMonitor(":memory:");
  monitor.recordVerifiedReading({
    electionCode: "6257", turn: 1, office: "presidente", uf: "BR", collectedAt: "2026-10-04T20:00:00.000Z",
    sourceUrl: "https://resultados.tse.jus.br/oficial.json", signatureValid: true,
    totals: { sectionsTotal: 1, sectionsCounted: 1, validVotes: 1 },
    candidates: []
  });

  monitor.recordSourceFailure("6257", 1, "presidente", "BR", "timeout");

  expect(monitor.latestPanorama("6257", 1, "presidente", "BR")).toMatchObject({ stale: true, sourceError: "timeout" });
});
