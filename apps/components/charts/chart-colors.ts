export const CHART_PALETTE = [
  "#A7F3D0",
  "#93C5FD",
  "#F9A8D4",
  "#FDE68A",
  "#C4B5FD",
  "#FDBA74",
  "#99F6E4",
  "#FCA5A5",
];

export function colorByIndex(index: number) {
  return CHART_PALETTE[index % CHART_PALETTE.length] ?? CHART_PALETTE[0];
}
