import { useReducer, useState } from 'react'
import { gameReducer, initialState } from './state/gameReducer'
import { buildPlaceableIndex } from './engine/placeableIndex'
import { PLACEABLES } from './config/placeables'
import { computeProvisionField } from './engine/provisionField'
import type { Tile } from './engine/types'
import { Grid } from './components/Grid'
import { Palette } from './components/Palette'
import { Journal } from './components/Journal'
import { ArrivalCard } from './components/ArrivalCard'
import { SeasonControl } from './components/SeasonControl'
import { DebugOverlay } from './components/DebugOverlay'
import './styles.css'

const IDX = buildPlaceableIndex(PLACEABLES)

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialState)
  const [selected, setSelected] = useState('oak')
  const [tool, setTool] = useState<'place' | 'erase'>('place')

  const onTileClick = (tile: Tile) => {
    if (tool === 'erase') dispatch({ type: 'ERASE', tile })
    else dispatch({ type: 'PLACE', placeableId: selected, anchor: tile })
  }

  const field = state.debug.show
    ? computeProvisionField(state.placements, IDX, state.debug.provisionType, state.season)
    : undefined
  const currentArrival = state.lastArrivals[0]

  return (
    <div className="app">
      <header>
        <h1>Forest Habitat</h1>
        <p className="tagline">Place habitat. Animals move in when it feels like home.</p>
      </header>

      <div className="top-controls">
        <SeasonControl season={state.season} onChange={s => dispatch({ type: 'SET_SEASON', season: s })} />
        {state.placements.length > 0 && (
          <button
            className="clear-btn"
            onClick={() => { if (confirm('Clear the whole forest and empty the journal? This starts over from a blank grid.')) dispatch({ type: 'RESET' }) }}
          >
            Clear forest
          </button>
        )}
      </div>
      <Palette
        selected={selected}
        tool={tool}
        onSelect={id => { setSelected(id); setTool('place') }}
        onErase={() => setTool('erase')}
      />
      <DebugOverlay
        show={state.debug.show}
        provisionType={state.debug.provisionType}
        onToggle={() => dispatch({ type: 'TOGGLE_DEBUG' })}
        onProvision={t => dispatch({ type: 'SET_DEBUG_PROVISION', provisionType: t })}
      />

      <Grid
        placements={state.placements}
        residents={state.residents}
        season={state.season}
        onTileClick={onTileClick}
        lightDebug={state.debug.show}
        provisionField={field}
      />

      <Journal residents={state.residents} />

      {currentArrival && (
        <ArrivalCard
          animalId={currentArrival}
          residents={state.residents}
          onDismiss={() => dispatch({ type: 'DISMISS_ARRIVAL', animalId: currentArrival })}
        />
      )}
    </div>
  )
}
