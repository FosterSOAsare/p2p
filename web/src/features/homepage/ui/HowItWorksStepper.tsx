import { Lock, Truck, MessageSquare, CheckCircle } from 'lucide-react'

const steps = [
  {
    number: '01',
    title: 'Agree & Lock',
    description: 'Buyer places a marketplace order or creates a custom deal. Funds are pre-authorized & locked safely.',
    icon: Lock,
    accent: 'border-sky-500 text-sky-600 bg-sky-50 dark:bg-sky-950 dark:text-sky-400 dark:border-sky-700',
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&auto=format&fit=crop&q=80',
  },
  {
    number: '02',
    title: 'Fulfill & Ship',
    description: 'Vendor ships physical goods with carrier tracking, or freelancer completes contract deliverables.',
    icon: Truck,
    accent: 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-700',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
  },
  {
    number: '03',
    title: 'Inspect & Chat',
    description: 'Inspect delivery upon arrival. Per-order chat automatically persists all messaging as audit evidence.',
    icon: MessageSquare,
    accent: 'border-primary-500 text-primary-600 bg-primary-50 dark:bg-primary-950 dark:text-primary-400 dark:border-primary-700',
    image: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=600&auto=format&fit=crop&q=80',
  },
  {
    number: '04',
    title: 'Instant Release',
    description: 'Buyer confirms receipt to release funds. Disputes are handled swiftly by senior platform admins.',
    icon: CheckCircle,
    accent: 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-700',
    image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
  },
]

export function HowItWorksStepper() {
  return (
    <section className="relative overflow-hidden">
      <div className="text-center max-w-xl mx-auto space-y-2 mb-6 sm:mb-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">Simple & Secure</p>
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white">How Escrow Protection Works</h2>
        <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
          Four steps protecting buyers, vendors, and standalone contract counterparties from end to end.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => {
          const Icon = step.icon
          return (
            <div
              key={step.number}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              {/* Image Preview Header */}
              <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src={step.image}
                  alt={step.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                <span className="absolute left-3 top-3 font-display text-lg sm:text-xl font-bold text-white drop-shadow">
                  {step.number}
                </span>
                <div className={`absolute right-3 bottom-3 p-2 rounded-lg border backdrop-blur-md ${step.accent}`}>
                  <Icon size={18} />
                </div>
              </div>

              {/* Text Content */}
              <div className="p-4 sm:p-5 space-y-2">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">{step.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{step.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
