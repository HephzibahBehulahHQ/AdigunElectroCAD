import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { FunctionalSymbol } from "../src/components/functionalSymbols";

it.each([
  { symbolId: "hvac-thermostat", name: "Thermostat", properties: { temperatureC: 3, setpointC: 3, hysteresisC: 2 } },
  { symbolId: "hvac-humidistat", name: "Humidistat", properties: { humidityPercent: 60, setpointPercent: 60, hysteresisPercent: 4 } },
])("shows the retained $name contact state in the deadband", ({ symbolId, name, properties }) => {
  const render = (state: Record<string, string | number | boolean>) => renderToStaticMarkup(createElement(FunctionalSymbol, {
    symbolId, x: 100, y: 100, properties: { ...properties, ...state },
  }));
  expect(render({ runtimeClimateContact: false })).toContain('d="M 88 109 L 105 103');
  expect(render({ runtimeClimateContact: true })).toContain('d="M 88 109 L 112 109');
  expect(render({ runtimeClimateContact: true })).toContain(name + ": contact closed");
  expect(render({ runtimeClimateContact: true, enabled: false })).toContain(name + ": contact open");
  expect(render({ runtimeClimateContact: true, runtimeSignalError: "Signal fault" })).toContain(name + ": fault");
});
