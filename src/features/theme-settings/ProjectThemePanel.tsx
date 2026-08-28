import { useRef } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, TextInput } from '@/components/ui/Input'
import { MiniBarChart } from '@/components/MiniBarChart'
import { useProject } from '@/features/dashboard/useProjects'
import { useUploadImage } from '@/lib/useUploadImage'
import { useProjectThemeQuery, useUpdateProjectTheme } from '@/features/theme-settings/useProjectTheme'

export function ProjectThemePanel({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId)
  const { data: theme } = useProjectThemeQuery(projectId)
  const updateTheme = useUpdateProjectTheme(projectId)
  const { upload, uploading } = useUploadImage(projectId)

  if (!theme || !project) return <p className="text-label text-sm text-canvas-fg/50">Carregando…</p>

  async function handleUpload(file: File, kind: 'logo' | 'cover') {
    const url = await upload(file, kind)
    if (url) updateTheme.mutate(kind === 'logo' ? { logo_url: url } : { cover_image_url: url })
  }

  function setChartColor(index: number, value: string) {
    const next = [...theme!.chart_colors]
    next[index] = value
    updateTheme.mutate({ chart_colors: next })
  }

  return (
    <div>
      <div className="mb-5">
        <h3 className="text-display mb-3 text-sm text-canvas-fg/80">Cores</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Primária" hint="Título e destaques">
            <ColorPicker value={theme.primary_color} onChange={(v) => updateTheme.mutate({ primary_color: v })} />
          </Field>
          <Field label="Destaque" hint="Chips e badges">
            <ColorPicker value={theme.accent_color} onChange={(v) => updateTheme.mutate({ accent_color: v })} />
          </Field>
          <Field label="Fundo" hint="Preview e capa">
            <ColorPicker
              value={theme.background_color}
              onChange={(v) => updateTheme.mutate({ background_color: v })}
            />
          </Field>
          <Field label="Superfície" hint="Cards do projeto">
            <ColorPicker value={theme.surface_color} onChange={(v) => updateTheme.mutate({ surface_color: v })} />
          </Field>
          <Field label="Texto" hint="Texto sobre o fundo">
            <ColorPicker value={theme.text_color} onChange={(v) => updateTheme.mutate({ text_color: v })} />
          </Field>
        </div>
      </div>

      <div className="mb-5">
        <h3 className="text-display mb-3 text-sm text-canvas-fg/80">Cores dos gráficos</h3>
        <div className="flex flex-wrap gap-3">
          {theme.chart_colors.map((color, i) => (
            <ColorPicker key={i} value={color} onChange={(v) => setChartColor(i, v)} />
          ))}
        </div>
        <div className="mt-3">
          <MiniBarChart
            points={[
              { label: 'A', value: 8 },
              { label: 'B', value: 5 },
              { label: 'C', value: 9 },
              { label: 'D', value: 4 },
              { label: 'E', value: 6 },
            ]}
            colors={theme.chart_colors}
          />
        </div>
      </div>

      <div className="mb-5">
        <h3 className="text-display mb-3 text-sm text-canvas-fg/80">Imagens</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <span className="text-label mb-2 block text-xs text-canvas-fg/70">Logo</span>
            {theme.logo_url && (
              <img
                src={theme.logo_url}
                alt="Logo do projeto"
                className="mb-2 h-16 w-16 border-2 border-line object-cover"
              />
            )}
            <UploadButton uploading={uploading} onSelect={(file) => handleUpload(file, 'logo')} />
          </div>
          <div>
            <span className="text-label mb-2 block text-xs text-canvas-fg/70">Capa</span>
            {theme.cover_image_url && (
              <img
                src={theme.cover_image_url}
                alt="Capa do projeto"
                className="mb-2 h-16 w-28 border-2 border-line object-cover"
              />
            )}
            <UploadButton uploading={uploading} onSelect={(file) => handleUpload(file, 'cover')} />
          </div>
        </div>
      </div>

      <div className="border-2 border-line p-4" style={{ backgroundColor: theme.background_color }}>
        <h3 className="text-label mb-2 text-xs text-canvas-fg/50">Preview</h3>
        <div className="flex items-center gap-3">
          {theme.logo_url && (
            <img src={theme.logo_url} alt="" className="h-10 w-10 border-2 border-line object-cover" />
          )}
          <h3 className="text-display text-xl" style={{ color: theme.primary_color }}>
            {project.name}
          </h3>
          <span
            className="text-label border-2 border-line px-2 py-0.5 text-[10px] text-ink"
            style={{ backgroundColor: theme.accent_color }}
          >
            Preview
          </span>
        </div>
        <div
          className="mt-3 border-2 border-line p-3"
          style={{ backgroundColor: theme.surface_color, color: theme.text_color }}
        >
          Card de exemplo com a superfície e o texto do projeto.
        </div>
      </div>
    </div>
  )
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-9 cursor-pointer border-2 border-line bg-transparent p-0.5"
      />
      <TextInput value={value} onChange={(e) => onChange(e.target.value)} className="w-24" />
    </div>
  )
}

function UploadButton({ uploading, onSelect }: { uploading: boolean; onSelect: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onSelect(file)
          e.target.value = ''
        }}
      />
      <Button
        variant="ghost"
        size="sm"
        icon={<Upload size={14} />}
        disabled={uploading}
        type="button"
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? 'Enviando…' : 'Enviar imagem'}
      </Button>
    </>
  )
}
