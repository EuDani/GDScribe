import { useState } from 'react'
import { ASSETS_BUCKET, isSupabaseConfigured, supabase } from '@/lib/supabase'
import { useToast } from '@/contexts/ToastContext'

export function useUploadImage(projectId: string) {
  const toast = useToast()
  const [uploading, setUploading] = useState(false)

  async function upload(file: File, folder = 'assets'): Promise<string | null> {
    if (!isSupabaseConfigured) {
      toast.error('Supabase não configurado — upload de imagem indisponível. Veja SUPABASE_SETUP.md.')
      return null
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'png'
      const path = `${projectId}/${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
      const { error } = await supabase.storage.from(ASSETS_BUCKET).upload(path, file)
      if (error) throw error

      const { data } = supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path)
      return data.publicUrl
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      toast.error(`Falha ao enviar imagem: ${message}`)
      return null
    } finally {
      setUploading(false)
    }
  }

  return { upload, uploading }
}
