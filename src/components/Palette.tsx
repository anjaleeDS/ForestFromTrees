import { PLACEABLES } from '../config/placeables'

interface Props {
  selected: string
  tool: 'place' | 'erase'
  onSelect: (placeableId: string) => void
  onErase: () => void
}

export function Palette({ selected, tool, onSelect, onErase }: Props) {
  return (
    <div className="palette">
      {PLACEABLES.map(p => (
        <button
          key={p.id}
          className={tool === 'place' && selected === p.id ? 'palette-item selected' : 'palette-item'}
          onClick={() => onSelect(p.id)}
          title={p.name}
        >
          <span className="palette-emoji">{p.emoji}</span>
          <span className="palette-label">{p.name}</span>
        </button>
      ))}
      <button
        className={tool === 'erase' ? 'palette-item erase selected' : 'palette-item erase'}
        onClick={onErase}
        title="Erase"
      >
        <span className="palette-emoji">🧹</span>
        <span className="palette-label">Erase</span>
      </button>
    </div>
  )
}
