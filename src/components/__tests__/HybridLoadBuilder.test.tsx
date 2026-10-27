import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HybridLoadBuilder } from "@/components/HybridLoadBuilder";
import type { LoadConfig } from "@/lib/beamAnalysis";

const imperialDisplayUnits = {
  force: { factor: 1 / 4448.22, unit: "kip" },
  distForce: { factor: 1 / 14593.9, unit: "kip/ft" },
  moment: { factor: 1 / 1355.82, unit: "kip·ft" },
  length: { factor: 1 / 0.3048, unit: "ft" },
};

describe("HybridLoadBuilder display units and direction", () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    globalThis.ResizeObserver = class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    if (root) act(() => root?.unmount());
    root = undefined;
    container?.remove();
    container = undefined;
  });

  it("shows imperial force and position values while keeping SI load state", async () => {
    const loads: LoadConfig[] = [
      { type: "concentrated", intensity: 4448.22, position: 0.5, inverted: false },
      { type: "udl", intensity: 14593.9, inverted: false },
      { type: "moment", intensity: 1355.82, position: 0.5, inverted: false },
    ];
    const onLoadsChange = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(
        <HybridLoadBuilder
          loads={loads}
          onLoadsChange={onLoadsChange}
          beamLength={6.096}
          displayUnits={imperialDisplayUnits}
        />,
      );
    });

    const inputs = [...container.querySelectorAll<HTMLInputElement>('input[type="number"]')];
    expect(container.textContent).toContain("Intensity (kip)");
    expect(container.textContent).toContain("Position along beam (ft)");
    expect(container.textContent).toContain("1.0 kip/ft");
    expect(container.textContent).toContain("1.0 kip·ft");
    expect(Number(inputs[0].value)).toBeCloseTo(1, 5);
    expect(Number(inputs[1].value)).toBeCloseTo(10, 5);

    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    expect(valueSetter).toBeDefined();
    await act(async () => {
      valueSetter!.call(inputs[0], "2");
      inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onLoadsChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ type: "concentrated", intensity: 8896.44 }),
      expect.objectContaining({ type: "udl", intensity: 14593.9 }),
      expect.objectContaining({ type: "moment", intensity: 1355.82 }),
    ]);

    const directionButton = container.querySelector<HTMLButtonElement>('button[aria-label="Set upward force direction"]');
    expect(directionButton).not.toBeNull();
    await act(async () => directionButton!.click());
    expect(onLoadsChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ type: "concentrated", inverted: true }),
      expect.objectContaining({ type: "udl", intensity: 14593.9 }),
      expect.objectContaining({ type: "moment", intensity: 1355.82 }),
    ]);
  });
});
