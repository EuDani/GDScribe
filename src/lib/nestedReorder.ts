export interface NestableItem {
  id: string
  parent_id: string | null
  sort_order: number
}

const NEST_THRESHOLD = 40

/**
 * Calcula as atualizações de parent_id/sort_order pra um drag-and-drop de
 * lista com no máximo 2 níveis (item de topo + sub-item). O sentido do
 * arraste decide a intenção:
 *  - arrastou bastante pra direita (delta.x) → aninha dentro do item alvo
 *    (ou, se o alvo já é um sub-item, vira irmão dele sob o mesmo pai)
 *  - arrastou bastante pra esquerda e o item era um sub-item → volta a ser
 *    item de topo
 *  - arraste "normal" (só vertical) → reordena dentro do mesmo grupo do
 *    item alvo (permite mover um sub-item pra debaixo de outro pai também)
 * Retorna null se o resultado seria um no-op ou inválido (cria ciclo, ou
 * aninharia um item que já tem sub-itens, o que criaria 3 níveis).
 */
export function computeNestedDragUpdate<T extends NestableItem>(
  items: T[],
  activeId: string,
  overId: string,
  deltaX: number,
): { id: string; parent_id: string | null; sort_order: number }[] | null {
  if (activeId === overId) return null
  const active = items.find((i) => i.id === activeId)
  const over = items.find((i) => i.id === overId)
  if (!active || !over) return null

  const activeHasChildren = items.some((i) => i.parent_id === active.id)

  let newParentId: string | null
  if (deltaX > NEST_THRESHOLD) {
    newParentId = over.parent_id === null ? over.id : over.parent_id
  } else if (deltaX < -NEST_THRESHOLD && active.parent_id !== null) {
    newParentId = null
  } else {
    newParentId = over.parent_id
  }

  if (newParentId === active.id) return null
  if (newParentId !== null && activeHasChildren) return null
  if (newParentId !== null) {
    const parentItem = items.find((i) => i.id === newParentId)
    if (!parentItem || parentItem.parent_id !== null) return null
  }

  if (newParentId === (active.parent_id ?? null)) {
    // Mesmo grupo — só reordenar se a posição realmente muda.
    const siblings = items
      .filter((i) => (i.parent_id ?? null) === newParentId)
      .sort((a, b) => a.sort_order - b.sort_order)
    const activeIndex = siblings.findIndex((i) => i.id === active.id)
    const overIndex = siblings.findIndex((i) => i.id === over.id)
    if (activeIndex === overIndex) return null
    const reordered = [...siblings]
    const [moved] = reordered.splice(activeIndex, 1)
    reordered.splice(overIndex, 0, moved)
    return reordered.map((item, i) => ({ id: item.id, parent_id: newParentId, sort_order: i }))
  }

  const siblings = items
    .filter((i) => (i.parent_id ?? null) === newParentId && i.id !== active.id)
    .sort((a, b) => a.sort_order - b.sort_order)

  let insertIndex = siblings.length
  if (over.parent_id === newParentId) {
    const idx = siblings.findIndex((i) => i.id === over.id)
    if (idx >= 0) insertIndex = idx
  }

  const reordered = [...siblings]
  reordered.splice(insertIndex, 0, active)

  return reordered.map((item) => ({
    id: item.id,
    parent_id: item.id === active.id ? newParentId : (item.parent_id ?? null),
    sort_order: reordered.indexOf(item),
  }))
}
