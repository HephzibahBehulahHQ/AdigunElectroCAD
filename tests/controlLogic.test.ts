import { describe, expect, it } from "vitest";
import { compare, currentTransformerSecondaryAmp, dacMilliamp, edgeTrigger, encoderPulses, flowPulseHz, levelToMilliamp, loadCellMillivolt, logicGate, mathBlock, milliampToPlcRaw, normallyClosed, normallyOpen, outputCoil, plcRawToMilliamp, pt100ResistanceOhm, setResetLatch, thermocoupleMillivolt, vibrationRms } from "../src/simulation/controlLogic";

describe("PLC logic and analog signal models", () => {
  it("evaluates contact, coil, latch, edge and every logic gate", () => {
    expect(normallyOpen(true)).toBe(true);
    expect(normallyClosed(true)).toBe(false);
    expect(outputCoil(true)).toBe(true);
    expect(setResetLatch(false, true, false)).toBe(true);
    expect(setResetLatch(true, true, true)).toBe(false);
    expect(edgeTrigger(false, true)).toEqual({ positive: true, negative: false });
    expect(edgeTrigger(true, false)).toEqual({ positive: false, negative: true });
    expect(logicGate("and", [true, true])).toBe(true);
    expect(logicGate("or", [false, true])).toBe(true);
    expect(logicGate("not", [false])).toBe(true);
    expect(logicGate("nand", [true, true])).toBe(false);
    expect(logicGate("nor", [false, false])).toBe(true);
    expect(logicGate("xor", [true, false, true])).toBe(false);
  });

  it("evaluates comparisons and all math blocks with a safe divide failure", () => {
    expect(compare("greater-than", 3, 2)).toBe(true);
    expect(compare("less-than", 2, 3)).toBe(true);
    expect(compare("equal-to", 1, 1.0000005)).toBe(true);
    expect(mathBlock("add", 2, 3)).toEqual({ ok: true, value: 5 });
    expect(mathBlock("subtract", 2, 3)).toEqual({ ok: true, value: -1 });
    expect(mathBlock("multiply", 2, 3)).toEqual({ ok: true, value: 6 });
    expect(mathBlock("divide", 6, 3)).toEqual({ ok: true, value: 2 });
    expect(mathBlock("divide", 6, 0)).toMatchObject({ ok: false });
  });

  it("converts a 4–20 mA level sensor through a PLC raw value and back", () => {
    const milliamp = levelToMilliamp(50);
    const raw = milliampToPlcRaw(milliamp);
    expect(milliamp).toBe(12);
    expect(raw).toBe(13_824);
    expect(plcRawToMilliamp(raw)).toBe(12);
    expect(dacMilliamp(raw)).toBe(12);
  });

  it("calculates the implemented instrumentation signals", () => {
    expect(pt100ResistanceOhm(100)).toBeCloseTo(138.5);
    expect(thermocoupleMillivolt(100)).toBeCloseTo(4.1);
    expect(flowPulseHz(60, 10)).toBe(10);
    expect(vibrationRms([3, 4])).toBeCloseTo(Math.sqrt(12.5));
    expect(encoderPulses(2.5, 100)).toBe(250);
    expect(loadCellMillivolt(500, 1000)).toBe(5);
    expect(currentTransformerSecondaryAmp(50, 100)).toBe(2.5);
  });
});
