import { SEASONS } from '../engine/seasons'
import type { Season } from '../engine/types'

const LABEL: Record<Season, string> = {
  spring: '🌱 Spring', summer: '☀️ Summer', autumn: '🍂 Autumn', winter: '❄️ Winter',
}

interface Props { season: Season; onChange: (s: Season) => void }

export function SeasonControl({ season, onChange }: Props) {
  return (
    <div className="season-control">
      {SEASONS.map(s => (
        <button
          key={s}
          className={s === season ? 'season-btn active' : 'season-btn'}
          onClick={() => onChange(s)}
        >
          {LABEL[s]}
        </button>
      ))}
    </div>
  )
}
