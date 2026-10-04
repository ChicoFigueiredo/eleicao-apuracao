import { expect, test } from "bun:test";
import { createMonitor } from "../src/monitor";

test("compares seat composition before and after by political spectrum", () => {
  const monitor = createMonitor(":memory:");
  monitor.replaceComposition("antes", "senado", [
    { party: "PA", spectrum: "direita", seats: 20 },
    { party: "PB", spectrum: "centro", seats: 10 }
  ]);
  monitor.replaceComposition("depois", "senado", [
    { party: "PA", spectrum: "direita", seats: 25 },
    { party: "PB", spectrum: "centro", seats: 5 }
  ]);

  expect(monitor.beforeAfter("senado")).toEqual({
    before: [{ spectrum: "centro", seats: 10 }, { spectrum: "direita", seats: 20 }],
    after: [{ spectrum: "centro", seats: 5 }, { spectrum: "direita", seats: 25 }]
  });
});
