import { ANIMALS } from '../config/animals'
import type { Resident } from '../engine/types'

function Stars({ n }: { n: number }) {
  return <span className="stars">{'★'.repeat(n)}{'☆'.repeat(3 - n)}</span>
}

interface Props { residents: Resident[] }

export function Journal({ residents }: Props) {
  const byId = new Map(residents.map(r => [r.animalId, r]))
  return (
    <div className="journal">
      <h2>Species Journal</h2>
      <div className="journal-list">
        {ANIMALS.map(a => {
          const res = byId.get(a.id)
          if (res) {
            return (
              <div className="journal-entry discovered" key={a.id}>
                <div className="journal-emoji">{a.emoji}</div>
                <div className="journal-name">{a.name} <span className="journal-species">{a.species}</span></div>
                <Stars n={res.stars} />
                <div className="journal-personality">{a.personality}</div>
              </div>
            )
          }
          return (
            <div className="journal-entry locked" key={a.id}>
              <div className="journal-emoji silhouette">{a.emoji}</div>
              <div className="journal-name">???</div>
              <div className="journal-hint">{a.hint}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
