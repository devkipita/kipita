export const PROBLEM_KINDS = [
  { value: "never_picked_up", label: "Never picked up" },
  { value: "not_dropped_off", label: "Not taken to my stop" },
  { value: "unsafe_driving", label: "Unsafe driving" },
  { value: "asked_for_cash", label: "Asked for extra money" },
  { value: "other", label: "Something else" },
] as const;

export type ProblemKind = (typeof PROBLEM_KINDS)[number]["value"];
