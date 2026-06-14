import { COLS, ROWS } from '../engine/grid'
import { computeLightMap } from '../engine/lightMap'
import { occupiedCells } from '../engine/distance'
import { buildPlaceableIndex } from '../engine/placeableIndex'
import { PLACEABLES } from '../config/placeables'
import { ANIMALS } from '../config/animals'
import type { Placement, Resident, Season, Tile as TileT } from '../engine/types'
import { Tile } from './Tile'

const IDX = buildPlaceableIndex(PLACEABLES)
const ANIMAL_EMOJI: Record<string, string> = Object.fromEntries(ANIMALS.map(a => [a.id, a.emoji]))

const SEASON_TINT: Record<Season, string> = {
  spring: 'rgba(120,200,120,0.10)',
  summer: 'rgba(255,210,80,0.10)',
  autumn: 'rgba(210,120,40,0.14)',
  winter: 'rgba(150,180,220,0.18)',
}

interface Props {
  placements: Placement[]
  residents: Resident[]
  season: Season
  onTileClick: (tile: TileT) => void
  lightDebug?: boolean
  provisionField?: boolean[][]
}

export function Grid({ placements, residents, season, onTileClick, lightDebug, provisionField }: Props) {
  const light = computeLightMap(placements, IDX)

  const cellMap = new Map<string, { placeableId: string; isAnchor: boolean }>()
  for (const p of placements) {
    const cells = occupiedCells(p, IDX[p.placeableId].footprint)
    cells.forEach((c, i) => cellMap.set(`${c.col},${c.row}`, { placeableId: p.placeableId, isAnchor: i === 0 }))
  }
  const residentMap = new Map(residents.map(r => [`${r.homeTile.col},${r.homeTile.row}`, r]))

  const rows = []
  for (let row = 0; row < ROWS; row++) {
    const cells = []
    for (let col = 0; col < COLS; col++) {
      const key = `${col},${row}`
      const occ = cellMap.get(key)
      const res = residentMap.get(key)
      cells.push(
        <Tile
          key={key}
          col={col}
          row={row}
          light={light[row][col]}
          placeable={occ ? IDX[occ.placeableId] : undefined}
          isAnchor={occ?.isAnchor ?? false}
          resident={res}
          residentEmoji={res ? ANIMAL_EMOJI[res.animalId] : undefined}
          seasonTint={SEASON_TINT[season]}
          onClick={() => onTileClick({ col, row })}
          debugShade={lightDebug ? light[row][col] === 'shade' : false}
          debugField={provisionField?.[row][col] ?? false}
        />,
      )
    }
    rows.push(<div className="grid-row" key={row}>{cells}</div>)
  }
  return <div className="grid">{rows}</div>
}
