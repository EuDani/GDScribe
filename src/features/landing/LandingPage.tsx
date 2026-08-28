import { motion } from 'motion/react'
import {
  ArrowRight,
  BookText,
  Boxes,
  Download,
  KanbanSquare,
  Lightbulb,
  Palette,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

const FEATURES = [
  {
    icon: BookText,
    accent: 'bg-accent-red',
    title: 'GDD por fase',
    description:
      'Módulos organizados por pré-produção, produção e pós-produção. Escreva em Markdown, sempre versionado.',
  },
  {
    icon: Boxes,
    accent: 'bg-accent-green',
    title: 'Inventário modular',
    description:
      'Crie tipos de objeto com campos customizados — NPCs, armas, itens — e liste quantas entradas quiser.',
  },
  {
    icon: KanbanSquare,
    accent: 'bg-accent-yellow',
    title: 'Kanban de ações',
    description: 'Quadro de tarefas por projeto, colunas customizáveis, arraste e solte.',
  },
  {
    icon: Lightbulb,
    accent: 'bg-accent-purple',
    title: 'Hub de ideias',
    description: 'Um lugar para despejar, marcar e priorizar ideias antes de virarem escopo.',
  },
  {
    icon: Palette,
    accent: 'bg-accent-blue',
    title: 'Tema por projeto',
    description: 'Cores, logo e capa próprios para cada jogo — sem mexer em código.',
  },
  {
    icon: Download,
    accent: 'bg-accent-red',
    title: 'Exportação viva',
    description: 'Gere o documento completo do GDD a qualquer momento, sempre atualizado.',
  },
]

const STEPS = [
  { n: '01', title: 'Crie o projeto', description: 'Nome, descrição e um tema já vêm prontos para editar.' },
  { n: '02', title: 'Preencha os módulos', description: 'Escreva a GDD por fase, monte o inventário, jogue ideias no hub.' },
  { n: '03', title: 'Exporte quando quiser', description: 'Baixe o Markdown ou gere um PDF sempre atualizado do estado atual.' },
]

const STACK = ['React', 'Vite', 'TypeScript', 'Tailwind', 'Supabase']

export function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-canvas-fg">
      <header className="flex items-center justify-between border-b-2 border-line px-6 py-4 sm:px-10">
        <div className="text-display flex items-center gap-2 text-lg">
          <span className="flex h-7 w-7 items-center justify-center border-2 border-line bg-accent-yellow text-ink">
            G
          </span>
          GDScribe
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Entrar
            </Button>
          </Link>
          <Link to="/signup">
            <Button variant="accent" size="sm">
              Criar conta
            </Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 pt-20 pb-14 text-center sm:px-10">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-display text-4xl leading-[1.05] sm:text-6xl"
        >
          O GDD do seu jogo,{' '}
          <span className="text-accent-yellow">vivo</span> e sempre{' '}
          <span className="text-accent-red">atualizado</span>
        </motion.h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-canvas-fg/70 sm:text-lg">
          GDScribe organiza a documentação de design do seu jogo em módulos, com inventário,
          kanban e hub de ideias — e gera o documento final com um clique.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/signup">
            <Button size="lg" icon={<ArrowRight size={18} />}>
              Começar agora
            </Button>
          </Link>
          <a href="#features">
            <Button variant="ghost" size="lg">
              Ver módulos
            </Button>
          </a>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['3', 'Fases de projeto'],
            ['8+', 'Módulos padrão de GDD'],
            ['∞', 'Tipos de inventário'],
            ['MIT', 'Licença open source'],
          ].map(([value, label]) => (
            <div key={label} className="border-2 border-line bg-surface px-3 py-4 shadow-brutal-sm">
              <div className="text-display text-2xl text-accent-yellow">{value}</div>
              <div className="text-label mt-1 text-[10px] text-canvas-fg/60">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y-2 border-line bg-surface py-4">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-6">
          <span className="text-label text-xs text-canvas-fg/50">Construído com</span>
          {STACK.map((s) => (
            <span key={s} className="text-label text-xs text-canvas-fg/80">
              {s}
            </span>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
        <div className="mb-10 text-center">
          <span className="text-label border-2 border-line bg-accent-blue px-2 py-1 text-[11px] text-ink">
            Módulos
          </span>
          <h2 className="text-display mt-4 text-3xl sm:text-4xl">
            Tudo que a documentação do seu jogo precisa
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, accent, title, description }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card className="h-full">
                <div className={`mb-3 inline-flex border-2 border-line p-2 text-ink ${accent}`}>
                  <Icon size={20} />
                </div>
                <h3 className="text-display mb-1.5 text-base">{title}</h3>
                <p className="text-sm text-canvas-fg/65">{description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16 sm:px-10">
        <div className="mb-10 text-center">
          <span className="text-label border-2 border-line bg-accent-green px-2 py-1 text-[11px] text-ink">
            Como funciona
          </span>
          <h2 className="text-display mt-4 text-3xl sm:text-4xl">Do zero ao GDD publicado</h2>
        </div>
        <div className="space-y-4">
          {STEPS.map((step) => (
            <div key={step.n} className="flex items-start gap-4 border-2 border-line bg-surface p-5 shadow-brutal-sm">
              <span className="text-display shrink-0 text-3xl text-canvas-fg/25">{step.n}</span>
              <div>
                <h3 className="text-display text-base">{step.title}</h3>
                <p className="mt-1 text-sm text-canvas-fg/65">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t-2 border-line px-6 py-20 text-center sm:px-10">
        <h2 className="text-display text-3xl sm:text-4xl">Pronto para documentar seu jogo?</h2>
        <p className="mx-auto mt-3 max-w-md text-canvas-fg/65">
          Crie sua conta e comece o GDD do seu próximo projeto agora mesmo.
        </p>
        <div className="mt-7">
          <Link to="/signup">
            <Button size="lg" icon={<ArrowRight size={18} />}>
              Criar conta grátis
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t-2 border-line px-6 py-8 text-center sm:px-10">
        <p className="text-label text-xs text-canvas-fg/40">GDScribe — MIT License</p>
      </footer>
    </div>
  )
}
