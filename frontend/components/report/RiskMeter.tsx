import { MeterBar } from "./MeterBar";

export function RiskMeter({ score }: { score: number }) {
  return <MeterBar label="Risk Level" value={score} lowLabel="Low Risk" highLabel="High Risk" />;
}
