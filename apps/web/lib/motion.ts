export const curve = {
  standard: [0.2, 0, 0, 1],
  standardAccelerate: [0.3, 0, 1, 1],
  standardDecelerate: [0, 0, 0, 1],
  emphasized: [0.2, 0, 0, 1],
  emphasizedAccelerate: [0.3, 0, 0.8, 0.15],
  emphasizedDecelerate: [0.05, 0.7, 0.1, 1],
  spring: [0.34, 1.56, 0.64, 1],
  sheet: [0.32, 0.72, 0, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

const bezier = (c: readonly number[]) => `cubic-bezier(${c.join(", ")})`;

export const ease = {
  standard: bezier(curve.standard),
  standardAccelerate: bezier(curve.standardAccelerate),
  standardDecelerate: bezier(curve.standardDecelerate),
  emphasized: bezier(curve.emphasized),
  emphasizedAccelerate: bezier(curve.emphasizedAccelerate),
  emphasizedDecelerate: bezier(curve.emphasizedDecelerate),
  spring: bezier(curve.spring),
  sheet: bezier(curve.sheet),
} as const;

export const dur = {
  short1: 50,
  short2: 100,
  short3: 150,
  short4: 200,
  medium1: 250,
  medium2: 300,
  medium3: 350,
  medium4: 400,
  long1: 450,
  long2: 500,
  long3: 550,
  long4: 600,
  extraLong1: 700,
  extraLong2: 800,
} as const;

export const spring = {
  morph: { type: "spring", visualDuration: dur.medium3 / 1000, bounce: 0 },
  sheet: { type: "spring", visualDuration: dur.medium4 / 1000, bounce: 0 },
  press: { type: "spring", visualDuration: dur.short3 / 1000, bounce: 0 },
  success: { type: "spring", visualDuration: dur.long1 / 1000, bounce: 0.25 },
} as const;

export const tween = {
  enter: { duration: dur.medium2 / 1000, ease: curve.emphasizedDecelerate },
  exit: { duration: dur.short4 / 1000, ease: curve.emphasizedAccelerate },
  state: { duration: dur.short4 / 1000, ease: curve.standard },
} as const;
