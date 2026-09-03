import { useState } from 'react';
import { HEX_NOTE, LOST_SHADES, type LostShade } from '../data/lostShades.ts';

interface Props {
  selected: LostShade | null;
  onSelect: (shade: LostShade) => void;
}

export function LostShadePicker({ selected, onSelect }: Props) {
  const [customName, setCustomName] = useState('');
  const [customHex, setCustomHex] = useState('#a96a73');

  const useCustom = () => {
    const name = customName.trim();
    if (!name) return;
    onSelect({
      id: 'custom',
      productName: name,
      shadeName: 'your shade',
      category: 'lip_color',
      finish: 'matte',
      hex: customHex,
      discontinuedNote: 'Entered by you — LastTube tests whether any observed lead is actionable.',
      defaultQuery: `${name} dupe`,
    });
  };

  return (
    <div className="card">
      <h3>Choose a remembered shade</h3>
      <p className="field-note">{HEX_NOTE}</p>
      <div className="shade-options">
        {LOST_SHADES.map((shade) => (
          <button
            key={shade.id}
            type="button"
            className="shade-option"
            aria-pressed={selected?.id === shade.id}
            onClick={() => onSelect(shade)}
          >
            <span className="shade-dot" style={{ background: shade.hex }} aria-hidden="true" />
            <span>
              <span className="name">
                {shade.productName} — {shade.shadeName}
                <span className="stamp">Discontinued</span>
              </span>
              <span className="meta">{shade.discontinuedNote}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="custom-shade">
        <input
          type="text"
          placeholder="Or name your own lost lipstick…"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          aria-label="Name your own discontinued product"
        />
        <input
          type="color"
          value={customHex}
          onChange={(e) => setCustomHex(e.target.value)}
          aria-label="Approximate shade color"
        />
        <p className="field-note">
          Pick the closest color you remember, then{' '}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={useCustom}
            disabled={customName.trim().length === 0}
            style={{ padding: '4px 10px', fontSize: 13 }}
          >
            use this shade
          </button>
        </p>
      </div>
    </div>
  );
}
