import type { Light, Placeable, Resident } from '../engine/types'

interface Props {
  col: number
  row: number
  light: Light
  placeable?: Placeable
  isAnchor: boolean
  resident?: Resident
  residentEmoji?: string
  seasonTint: string
  onClick: () => void
  debugShade?: boolean
  debugField?: boolean
}

export function Tile({ light, placeable, isAnchor, residentEmoji, seasonTint, onClick, debugShade, debugField }: Props) {
  const bg = placeable ? placeable.color : light === 'shade' ? '#cfd8c5' : '#e7eddc'
  return (
    <button className="tile" style={{ backgroundColor: bg }} onClick={onClick}>
      <span className="tile-season" style={{ backgroundColor: seasonTint }} />
      {debugShade && <span className="tile-debug-shade" />}
      {debugField && <span className="tile-debug-field" />}
      {placeable && isAnchor && <span className="tile-placeable">{placeable.emoji}</span>}
      {residentEmoji && <span className="tile-resident">{residentEmoji}</span>}
    </button>
  )
}
