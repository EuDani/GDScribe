import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { InventoryField, InventoryItem, InventoryType, InventoryValue } from '@/lib/types'

export function useInventoryTypes(projectId: string | undefined) {
  return useQuery({
    queryKey: ['inventory_types', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_types')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as InventoryType[]
    },
    enabled: Boolean(projectId),
  })
}

export function useCreateInventoryType(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      name,
      icon,
      fields,
    }: {
      name: string
      icon: string
      fields: InventoryField[]
    }) => {
      const existing =
        queryClient.getQueryData<InventoryType[]>(['inventory_types', projectId]) ?? []
      const { data, error } = await supabase
        .from('inventory_types')
        .insert({
          project_id: projectId,
          name,
          icon,
          fields_schema: fields,
          sort_order: existing.length,
        })
        .select('*')
        .single()
      if (error) throw error
      return data as InventoryType
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_types', projectId] })
    },
  })
}

export function useReorderInventoryTypes(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (types: { id: string; sort_order: number }[]) => {
      await Promise.all(
        types.map((t) => supabase.from('inventory_types').update({ sort_order: t.sort_order }).eq('id', t.id)),
      )
    },
    onMutate: async (types) => {
      await queryClient.cancelQueries({ queryKey: ['inventory_types', projectId] })
      const previous = queryClient.getQueryData<InventoryType[]>(['inventory_types', projectId])
      queryClient.setQueryData<InventoryType[]>(['inventory_types', projectId], (old) =>
        old
          ?.map((t) => {
            const update = types.find((u) => u.id === t.id)
            return update ? { ...t, sort_order: update.sort_order } : t
          })
          .sort((a, b) => a.sort_order - b.sort_order),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['inventory_types', projectId], context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['inventory_types', projectId] }),
  })
}

export function useUpdateInventoryType(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...changes }: Partial<InventoryType> & { id: string }) => {
      const { error } = await supabase.from('inventory_types').update(changes).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_types', projectId] })
    },
  })
}

export function useDeleteInventoryType(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('inventory_types').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_types', projectId] })
      queryClient.invalidateQueries({ queryKey: ['inventory_items', projectId] })
    },
  })
}

export function useAllInventoryItems(projectId: string | undefined) {
  return useQuery({
    queryKey: ['inventory_items', projectId, 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('project_id', projectId)
      if (error) throw error
      return data as InventoryItem[]
    },
    enabled: Boolean(projectId),
  })
}

export function useInventoryItems(projectId: string | undefined, typeId: string | undefined) {
  return useQuery({
    queryKey: ['inventory_items', projectId, typeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('type_id', typeId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as InventoryItem[]
    },
    enabled: Boolean(projectId) && Boolean(typeId),
  })
}

export function useUpsertInventoryItem(projectId: string, typeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      data,
      status,
      tags,
      sectors,
    }: {
      id?: string
      data: Record<string, InventoryValue>
      status?: string | null
      tags?: string[]
      sectors?: string[]
    }) => {
      if (id) {
        const { error } = await supabase
          .from('inventory_items')
          .update({ data, status, tags: tags ?? [], sectors: sectors ?? [] })
          .eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('inventory_items')
          .insert({ project_id: projectId, type_id: typeId, data, status, tags: tags ?? [], sectors: sectors ?? [] })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_items', projectId, typeId] })
    },
  })
}

export function useDeleteInventoryItem(projectId: string, typeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('inventory_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_items', projectId, typeId] })
    },
  })
}
