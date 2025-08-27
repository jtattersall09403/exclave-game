import { useState } from 'react';

interface MoveDialogProps {
  isVisible: boolean;
  fromCell: { id: number; units: number } | null | undefined;
  toCell: { id: number; units: number } | null | undefined;
  onMove: (unitCount: number) => void;
  onCancel: () => void;
}

export function MoveDialog({ isVisible, fromCell, toCell, onMove, onCancel }: MoveDialogProps) {
  const [unitCount, setUnitCount] = useState(1);

  if (!isVisible || !fromCell || !toCell) return null;

  const maxMove = fromCell.units - 1; // Must leave 1 unit behind
  const maxDestination = 8 - toCell.units; // Destination can't exceed 8
  const maxAllowed = Math.min(maxMove, maxDestination);

  const handleMove = () => {
    if (unitCount > 0 && unitCount <= maxAllowed) {
      onMove(unitCount);
    }
  };

  return (
    <div className="move-dialog-overlay">
      <div className="move-dialog">
        <div className="move-dialog-content">
          <h3>Move Units</h3>
          <p>Move from hex with {fromCell.units} units to hex with {toCell.units} units</p>
          
          <div className="unit-selector">
            <label htmlFor="unit-count">Units to move:</label>
            <input
              id="unit-count"
              type="range"
              min="1"
              max={maxAllowed}
              value={unitCount}
              onChange={(e) => setUnitCount(parseInt(e.target.value))}
            />
            <span className="unit-count-display">{unitCount}</span>
          </div>
          
          <div className="move-dialog-buttons">
            <button className="move-button" onClick={handleMove} disabled={unitCount <= 0 || unitCount > maxAllowed}>
              Move {unitCount}
            </button>
            <button className="cancel-button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}