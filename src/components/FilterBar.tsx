import { getData } from '../lib/data'
import { TIER_FILTER_LABEL } from '../lib/priority'
import type { DomainCode, Filters, TierFilter } from '../lib/types'

const TIER_OPTIONS: TierFilter[] = ['', 'core', 'S', 'A', 'T']

const ROUND_OPTIONS = [
  { v: 0, label: '전체 회차' },
  { v: 110, label: '110회 이후' },
  { v: 120, label: '120회 이후' },
  { v: 130, label: '130회 이후' },
]

export default function FilterBar({ value, onChange }: { value: Filters; onChange: (f: Filters) => void }) {
  const { domains } = getData()
  const toggleDomain = (c: DomainCode) =>
    onChange({
      ...value,
      domains: value.domains.includes(c) ? value.domains.filter((d) => d !== c) : [...value.domains, c],
    })
  const toggleSession = (s: 1 | 2) =>
    onChange({
      ...value,
      sessions: value.sessions.includes(s) ? value.sessions.filter((x) => x !== s) : [...value.sessions, s],
    })
  const chip = (active: boolean) =>
    `px-2.5 py-1 rounded-full text-sm border ${
      active ? 'bg-ink text-paper border-ink' : 'bg-sheet text-ink-2 border-rule'
    }`

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-ink-3 mr-0.5">범위</span>
        {TIER_OPTIONS.map((t) => (
          <button key={t || 'all'} type="button" className={chip((value.tier ?? '') === t)} onClick={() => onChange({ ...value, tier: t })}>
            {t ? TIER_FILTER_LABEL[t] : '전체 토픽'}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {domains.map((d) => (
          <button key={d.code} type="button" className={chip(value.domains.includes(d.code))} onClick={() => toggleDomain(d.code)}>
            {d.name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className={chip(value.sessions.includes(1))} onClick={() => toggleSession(1)}>
          1교시 (10점)
        </button>
        <button type="button" className={chip(value.sessions.includes(2))} onClick={() => toggleSession(2)}>
          2~4교시 (25점)
        </button>
        <select
          aria-label="회차 범위"
          className="ml-auto text-sm bg-sheet border border-rule rounded-md px-2 py-1 text-ink-2"
          value={value.round_min}
          onChange={(e) => onChange({ ...value, round_min: Number(e.target.value) })}
        >
          {ROUND_OPTIONS.map((o) => (
            <option key={o.v} value={o.v}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
