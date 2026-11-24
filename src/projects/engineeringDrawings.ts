export const engineeringDrawings = [
  { id: "siemens-dol-starter-panel", label: "Siemens 7.5 kW DOL starter and panel views" },
  { id: "siemens-six-lead-winding-connections", label: "SIMOTICS six-lead star and delta connections" },
  { id: "siemens-sm1223-input-wiring", label: "Siemens SM 1223 input wiring" },
  { id: "sitop-psu100c-pilot-panel", label: "SITOP 24 V pilot circuit" },
  { id: "sentron-4ac3716-pilot-panel", label: "SENTRON safety transformer pilot circuit" },
  { id: "finder-3851-changeover-panel", label: "Finder 38.51 changeover relay" },
  { id: "phoenix-pttb-two-level-pilot", label: "Phoenix Contact two-level terminal pilot" },
  { id: "phoenix-m12-housing-and-pinout", label: "Phoenix Contact M12 housing and pin routing" },
  { id: "omron-e6b2-engineering-drawing", label: "Omron E6B2 encoder and mounting views" },
  { id: "hbk-z6-mounting-comparison", label: "HBK Z6 load cell mounting comparison" },
  { id: "festo-vovg-coil-test", label: "Festo VOVG valve coil test" },
  { id: "rittal-ax-panel-hardware", label: "Rittal AX enclosure and panel hardware" },
] as const;

export type EngineeringDrawingId = (typeof engineeringDrawings)[number]["id"];
