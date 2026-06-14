import type { ProvisionType } from '../engine/types'

const PROVISION_TYPES: ProvisionType[] = [
  'water', 'nest_high', 'shelter_ground', 'berries', 'nuts',
  'nectar', 'insects', 'seeds', 'cover_low', 'bask',
]

interface Props {
  show: boolean
  provisionType: ProvisionType
  onToggle: () => void
  onProvision: (t: ProvisionType) => void
}

export function DebugOverlay({ show, provisionType, onToggle, onProvision }: Props) {
  return (
    <div className="debug-controls">
      <button onClick={onToggle}>{show ? 'Hide debug' : 'Show debug'}</button>
      {show && (
        <select value={provisionType} onChange={e => onProvision(e.target.value as ProvisionType)}>
          {PROVISION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      )}
    </div>
  )
}
