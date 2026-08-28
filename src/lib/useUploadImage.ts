import { useState } from 'react'
import { ASSETS_BUCKET, isSupabaseConfigured, supabase } from '@/lib/supabase'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'

export function useUploadImage(projectId: string) {
  const toast = useToast()
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)

  async function upload(file: File, folder = 'assets'): Promise<string | null> {
    if (!isSupabaseConfigured) {
      toast.error('Supabase não configurado — upload de imagem indisponível. Veja SUPABASE_SETUP.md.')
      return null
    }
    if (!user) {
      toast.error('Você precisa estar logado para enviar imagens.')
      return null
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'png'
      // O primeiro segmento do caminho precisa ser o id do usuário logado —
      // é o que a policy de storage usa pra liberar o upload (auth.uid()).
      const path = `${user.id}/${projectId}/${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
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
