import { MeterBar } from "./MeterBar";

export function ComplexityMeter({ score }: { score: number }) {
  return <MeterBar label="Operational Complexity" value={score} lowLabel="Simple" highLabel="Complex" />;
}
