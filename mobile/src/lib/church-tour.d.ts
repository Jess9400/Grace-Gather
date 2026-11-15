import type { ChurchPlace } from "./church-scene";
export function startChurchTour(order: ChurchPlace[], options: {
  onStep: (place: ChurchPlace) => void;
  onFadeOut: () => void;
  onDone: () => void;
  fadeMs: number;
}): () => void;
