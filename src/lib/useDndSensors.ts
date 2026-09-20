import { PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'

/**
 * Sensores padrão pra todo drag&drop do app. PointerSensor sozinho é instável
 * em touch (conflita com o scroll da página) — TouchSensor com delay exige um
 * toque-e-segure antes de iniciar o arrasto, distinguindo de um scroll normal.
 */
export function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )
}
