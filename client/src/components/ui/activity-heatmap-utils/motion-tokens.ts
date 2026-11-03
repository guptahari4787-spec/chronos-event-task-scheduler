export const motionTokens = {
  ease: {
    enter: [0.16, 1, 0.3, 1] as const,
    standard: [0.22, 1, 0.36, 1] as const,
  },
  blur: {
    soft: 4,
    subtle: 2,
  },
  spring: {
    morph: {
      type: "spring" as const,
      stiffness: 350,
      damping: 30,
    },
    snappy: {
      type: "spring" as const,
      stiffness: 420,
      damping: 32,
    },
  },
  duration: {
    fast: 0.16,
    spring: 0.58,
  },
};
