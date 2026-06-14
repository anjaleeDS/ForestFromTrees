import { ANIMALS } from '../config/animals'
import type { Resident } from '../engine/types'

interface Props { animalId: string; residents: Resident[]; onDismiss: () => void }

export function ArrivalCard({ animalId, residents, onDismiss }: Props) {
  const animal = ANIMALS.find(a => a.id === animalId)!
  const res = residents.find(r => r.animalId === animalId)
  const stars = res?.stars ?? 1
  return (
    <div className="arrival-card" role="dialog" aria-label={`${animal.name} arrived`}>
      <div className="arrival-emoji">{animal.emoji}</div>
      <div className="arrival-title">{animal.name} the {animal.species} moved in!</div>
      <div className="arrival-stars">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
      <div className="arrival-personality">{animal.personality}</div>
      <button className="arrival-dismiss" onClick={onDismiss}>Welcome them</button>
    </div>
  )
}
