import { ANIMALS } from '../config/animals'
import type { Resident } from '../engine/types'

function Stars({ n }: { n: number }) {
  return <span className="stars">{'★'.repeat(n)}{'☆'.repeat(3 - n)}</span>
}

interface Props {
  residents: Resident[]
  stirring: string[]
}

export function Journal({ residents, stirring }: Props) {
  const byId = new Map(residents.map(r => [r.animalId, r]))
  const stirringSet = new Set(stirring)
  return (
    <div className="journal">
      <h2>Species Journal <span className="journal-count">{residents.length} of {ANIMALS.length} discovered</span></h2>
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
          const isStirring = stirringSet.has(a.id)
          if (isStirring) {
            return (
              <div className="journal-entry locked stirring" key={a.id}>
                <span className="journal-nearby-badge">👀 nearby</span>
                <div className="journal-emoji stirring-emoji">{a.emoji}</div>
                <div className="journal-name">???</div>
                <div className="journal-hint stirring">Something stirs nearby…</div>
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
