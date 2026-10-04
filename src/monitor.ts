import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type CandidateReading = {
  tseId: string;
  name: string;
  number: string;
  party: string;
  votes: number;
  status: "eleito" | "nao_eleito" | "sub_judice" | "anulado";
};

export type VerifiedReading = {
  electionCode: string;
  turn: number;
  office: string;
  uf: string;
  collectedAt: string;
  sourceUrl: string;
  signatureValid: boolean;
  totals: { sectionsTotal: number; sectionsCounted: number; validVotes: number };
  candidates: CandidateReading[];
};

type Panorama = {
  collectedAt: string;
  stale: boolean;
  sourceError?: string;
  totals: { sectionsTotal: number; sectionsCounted: number; validVotes: number };
  candidates: Array<CandidateReading & { percentage: number }>;
};

export type Monitor = {
  recordVerifiedReading(reading: VerifiedReading): void;
  latestPanorama(electionCode: string, turn: number, office: string, uf: string): Panorama | null;
  includeCandidacy(candidacy: MonitoredCandidacy): void;
  deactivateCandidacy(tseId: string): void;
  monitoredCandidacies(): Array<MonitoredCandidacy & { active: boolean }>;
  recordSourceFailure(electionCode: string, turn: number, office: string, uf: string, reason: string): void;
  replaceComposition(moment: "antes" | "depois", chamber: "senado" | "camara", seats: PartySeats[]): void;
  beforeAfter(chamber: "senado" | "camara"): { before: SpectrumSeats[]; after: SpectrumSeats[] };
  close(): void;
};

export type MonitoredCandidacy = {
  tseId: string;
  uf: string;
  office: string;
  name: string;
  number: string;
};

export type PoliticalSpectrum = "extrema_direita" | "direita" | "progressista" | "centro" | "esquerda" | "extrema_esquerda";
export type PartySeats = { party: string; spectrum: PoliticalSpectrum; seats: number };
export type SpectrumSeats = { spectrum: PoliticalSpectrum; seats: number };

const percentage = (votes: number, validVotes: number) =>
  validVotes === 0 ? 0 : Math.round((votes / validVotes) * 10_000) / 100;

export const createMonitor = (filename: string): Monitor => {
  if (filename !== ":memory:") mkdirSync(dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS readings (
      id INTEGER PRIMARY KEY,
      election_code TEXT NOT NULL,
      turn INTEGER NOT NULL,
      office TEXT NOT NULL,
      uf TEXT NOT NULL,
      collected_at TEXT NOT NULL,
      source_url TEXT NOT NULL,
      sections_total INTEGER NOT NULL,
      sections_counted INTEGER NOT NULL,
      valid_votes INTEGER NOT NULL,
      UNIQUE(election_code, turn, office, uf, collected_at)
    );
    CREATE TABLE IF NOT EXISTS candidate_readings (
      reading_id INTEGER NOT NULL REFERENCES readings(id) ON DELETE CASCADE,
      tse_id TEXT NOT NULL,
      name TEXT NOT NULL,
      number TEXT NOT NULL,
      party TEXT NOT NULL,
      votes INTEGER NOT NULL,
      status TEXT NOT NULL,
      PRIMARY KEY(reading_id, tse_id)
    );
    CREATE TABLE IF NOT EXISTS monitored_candidacies (
      tse_id TEXT PRIMARY KEY,
      uf TEXT NOT NULL,
      office TEXT NOT NULL,
      name TEXT NOT NULL,
      number TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS source_failures (
      election_code TEXT NOT NULL,
      turn INTEGER NOT NULL,
      office TEXT NOT NULL,
      uf TEXT NOT NULL,
      reason TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      PRIMARY KEY(election_code, turn, office, uf)
    );
    CREATE TABLE IF NOT EXISTS composition_seats (
      moment TEXT NOT NULL CHECK(moment IN ('antes', 'depois')),
      chamber TEXT NOT NULL CHECK(chamber IN ('senado', 'camara')),
      party TEXT NOT NULL,
      spectrum TEXT NOT NULL,
      seats INTEGER NOT NULL CHECK(seats >= 0),
      PRIMARY KEY(moment, chamber, party)
    );
  `);

  const insertReading = db.prepare(`INSERT INTO readings
    (election_code, turn, office, uf, collected_at, source_url, sections_total, sections_counted, valid_votes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertCandidate = db.prepare(`INSERT INTO candidate_readings
    (reading_id, tse_id, name, number, party, votes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);

  return {
    recordVerifiedReading(reading) {
      if (!reading.signatureValid) throw new Error("A leitura oficial não possui assinatura JWS válida.");
      if (reading.totals.validVotes < 0 || reading.candidates.some((candidate) => candidate.votes < 0)) {
        throw new Error("Votos não podem ser negativos.");
      }
      const save = db.transaction(() => {
        const result = insertReading.run(reading.electionCode, reading.turn, reading.office, reading.uf, reading.collectedAt,
          reading.sourceUrl, reading.totals.sectionsTotal, reading.totals.sectionsCounted, reading.totals.validVotes);
        for (const candidate of reading.candidates) {
          insertCandidate.run(result.lastInsertRowid, candidate.tseId, candidate.name, candidate.number, candidate.party, candidate.votes, candidate.status);
        }
        db.prepare("DELETE FROM source_failures WHERE election_code = ? AND turn = ? AND office = ? AND uf = ?")
          .run(reading.electionCode, reading.turn, reading.office, reading.uf);
      });
      save();
    },
    latestPanorama(electionCode, turn, office, uf) {
      const reading = db.query(`SELECT * FROM readings WHERE election_code = ? AND turn = ? AND office = ? AND uf = ?
        ORDER BY collected_at DESC LIMIT 1`).get(electionCode, turn, office, uf) as
        | { id: number; collected_at: string; sections_total: number; sections_counted: number; valid_votes: number }
        | null;
      if (!reading) return null;
      const candidates = db.query(`SELECT tse_id AS tseId, name, number, party, votes, status FROM candidate_readings
        WHERE reading_id = ? ORDER BY votes DESC, name ASC`).all(reading.id) as CandidateReading[];
      const failure = db.query(`SELECT reason FROM source_failures WHERE election_code = ? AND turn = ? AND office = ? AND uf = ?`)
        .get(electionCode, turn, office, uf) as { reason: string } | null;
      return {
        collectedAt: reading.collected_at,
        stale: Boolean(failure),
        ...(failure ? { sourceError: failure.reason } : {}),
        totals: { sectionsTotal: reading.sections_total, sectionsCounted: reading.sections_counted, validVotes: reading.valid_votes },
        candidates: candidates.map((candidate) => ({ ...candidate, percentage: percentage(candidate.votes, reading.valid_votes) }))
      };
    },
    includeCandidacy(candidacy) {
      db.prepare(`INSERT INTO monitored_candidacies (tse_id, uf, office, name, number, active) VALUES (?, ?, ?, ?, ?, 1)
        ON CONFLICT(tse_id) DO UPDATE SET uf = excluded.uf, office = excluded.office, name = excluded.name,
        number = excluded.number, active = 1`).run(candidacy.tseId, candidacy.uf, candidacy.office, candidacy.name, candidacy.number);
    },
    deactivateCandidacy(tseId) {
      db.prepare("UPDATE monitored_candidacies SET active = 0 WHERE tse_id = ?").run(tseId);
    },
    monitoredCandidacies() {
      return db.query(`SELECT tse_id AS tseId, uf, office, name, number, active FROM monitored_candidacies ORDER BY name ASC`).all()
        .map((row) => ({ ...(row as MonitoredCandidacy), active: Boolean((row as { active: number }).active) }));
    },
    recordSourceFailure(electionCode, turn, office, uf, reason) {
      db.prepare(`INSERT INTO source_failures (election_code, turn, office, uf, reason, occurred_at) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(election_code, turn, office, uf) DO UPDATE SET reason = excluded.reason, occurred_at = excluded.occurred_at`)
        .run(electionCode, turn, office, uf, reason, new Date().toISOString());
    },
    replaceComposition(moment, chamber, seats) {
      const replace = db.transaction(() => {
        db.prepare("DELETE FROM composition_seats WHERE moment = ? AND chamber = ?").run(moment, chamber);
        const insert = db.prepare("INSERT INTO composition_seats (moment, chamber, party, spectrum, seats) VALUES (?, ?, ?, ?, ?)");
        for (const seat of seats) insert.run(moment, chamber, seat.party, seat.spectrum, seat.seats);
      });
      replace();
    },
    beforeAfter(chamber) {
      const grouped = (moment: "antes" | "depois") => db.query(`SELECT spectrum, SUM(seats) AS seats FROM composition_seats
        WHERE moment = ? AND chamber = ? GROUP BY spectrum ORDER BY spectrum ASC`).all(moment, chamber) as SpectrumSeats[];
      return { before: grouped("antes"), after: grouped("depois") };
    },
    close() { db.close(); }
  };
};
