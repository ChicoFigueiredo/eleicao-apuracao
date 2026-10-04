import { expect, test } from "bun:test";
import { createMonitor } from "../src/monitor";
import { serveMonitor } from "../src/server";

test("serves a public API panorama and the dashboard shell", async () => {
  const monitor = createMonitor(":memory:");
  monitor.recordVerifiedReading({
    electionCode: "6257", turn: 1, office: "presidente", uf: "BR", collectedAt: "2026-10-04T20:00:00.000Z",
    sourceUrl: "https://resultados.tse.jus.br/oficial.json", signatureValid: true,
    totals: { sectionsTotal: 10, sectionsCounted: 5, validVotes: 100 },
    candidates: [{ tseId: "1", name: "Candidata", number: "10", party: "PA", votes: 100, status: "eleito" }]
  });
  monitor.replaceComposition("antes", "senado", [{ party: "PA", spectrum: "direita", seats: 10 }]);
  monitor.replaceComposition("depois", "senado", [{ party: "PA", spectrum: "direita", seats: 12 }]);
  const server = serveMonitor(monitor, 0);
  try {
    const panorama = await fetch(`${server.url}api/panorama?electionCode=6257&turn=1&office=presidente&uf=BR`);
    expect(await panorama.json()).toMatchObject({ totals: { validVotes: 100 }, candidates: [{ percentage: 100 }] });
    const page = await fetch(server.url);
    expect(await page.text()).toContain("Monitor Eleitoral 2026");
    const composition = await fetch(`${server.url}api/composicao?chamber=senado`);
    expect(await composition.json()).toEqual({ before: [{ spectrum: "direita", seats: 10 }], after: [{ spectrum: "direita", seats: 12 }] });
  } finally {
    server.stop(true);
    monitor.close();
  }
});
