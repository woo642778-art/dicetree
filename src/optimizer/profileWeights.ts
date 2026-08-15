import type { SpendingProfile } from "../domain/types";

export interface ProfileWeights {
  costSensitivity: number;
  coverageWeight: number;
  specializationWeight: number;
}

export const profileWeights: Record<SpendingProfile, ProfileWeights> = {
  f2p: { costSensitivity: 1.35, coverageWeight: 1.35, specializationWeight: 0.85 },
  light: { costSensitivity: 1.0, coverageWeight: 1.1, specializationWeight: 1.0 },
  spender: { costSensitivity: 0.55, coverageWeight: 0.9, specializationWeight: 1.35 },
};
