import { useState, useEffect } from 'react';
import { useGame } from '../state';
import type { DiceRoll, PlayerId } from '../types';

function getPlayerColor(playerId: PlayerId): string {
  switch (playerId) {
    case 0: return '#66FF57';
    case 1: return '#FF4BD1';
    case 2: return '#2EE7FF';
    default: return '#666666';
  }
}

interface DiceProps {
  value: number;
  isAnimating?: boolean;
}

function Dice({ value, isAnimating = false }: DiceProps) {
  const [animValue, setAnimValue] = useState(value);

  useEffect(() => {
    if (isAnimating) {
      const interval = setInterval(() => {
        setAnimValue(Math.floor(Math.random() * 6) + 1);
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        setAnimValue(value);
      }, 600);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    } else {
      setAnimValue(value);
    }
  }, [value, isAnimating]);

  return (
    <div className={`dice ${isAnimating ? 'rolling' : ''}`}>
      <div className="dice-face">
        {renderDots(animValue)}
      </div>
    </div>
  );
}

function renderDots(value: number) {
  const dots = [];
  const positions = [
    [], // 0 (not used)
    [4], // 1 - center
    [0, 8], // 2 - top-left, bottom-right
    [0, 4, 8], // 3 - top-left, center, bottom-right
    [0, 2, 6, 8], // 4 - corners
    [0, 2, 4, 6, 8], // 5 - corners + center
    [0, 1, 2, 6, 7, 8] // 6 - two columns
  ];

  const dotPositions = positions[value] || [];

  for (let i = 0; i < 9; i++) {
    dots.push(
      <div
        key={i}
        className={`dot ${dotPositions.includes(i) ? 'active' : ''}`}
      />
    );
  }

  return dots;
}

interface DiceRollDisplayProps {
  roll: DiceRoll;
  isAnimating: boolean;
}

function DiceRollDisplay({ roll, isAnimating }: DiceRollDisplayProps) {
  const attackerColor = getPlayerColor(roll.attackerId);
  const defenderColor = getPlayerColor(roll.defenderId);

  return (
    <div className="dice-roll-display">
      <div className="dice-section attacker">
        <div className="dice-label" style={{ color: attackerColor }}>Attacker</div>
        <div className="dice-container">
          {roll.attacker.map((value, index) => (
            <Dice key={index} value={value} isAnimating={isAnimating} />
          ))}
        </div>
        {!isAnimating && <div className="dice-total" style={{ color: attackerColor }}>Total: {roll.attackerTotal}</div>}
      </div>

      <div className="vs-divider">VS</div>

      <div className="dice-section defender">
        <div className="dice-label" style={{ color: defenderColor }}>Defender</div>
        <div className="dice-container">
          {roll.defender.map((value, index) => (
            <Dice key={index} value={value} isAnimating={isAnimating} />
          ))}
        </div>
        {!isAnimating && <div className="dice-total" style={{ color: defenderColor }}>Total: {roll.defenderTotal}</div>}
      </div>
    </div>
  );
}

export function DicePanel() {
  const { state, dispatch } = useGame();
  const lastDiceRoll = state.lastDiceRoll;
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showOutcome, setShowOutcome] = useState(false);
  const [currentRoll, setCurrentRoll] = useState<DiceRoll | null>(null);

  useEffect(() => {
    if (lastDiceRoll && lastDiceRoll.attacker.length > 0) {
      setCurrentRoll(lastDiceRoll);
      setIsVisible(true);
      setIsAnimating(true);
      setShowOutcome(false); // Hide outcome initially

      const animationTimeout = setTimeout(() => {
        setIsAnimating(false);
        setShowOutcome(true); // Show outcome after animation completes
      }, 700);

      // Removed auto-hide - user must manually close

      return () => {
        clearTimeout(animationTimeout);
      };
    }
  }, [lastDiceRoll]);

  const handleClose = () => {
    setIsVisible(false);
    // Apply combat result when popup is closed
    dispatch({ type: 'APPLY_COMBAT_RESULT' });
  };

  const handleBackdropClick = () => {
    handleClose();
  };

  if (!isVisible || !currentRoll) {
    return null;
  }

  const outcome = currentRoll.attackerWins ? 'Attacker Wins!' : 'Defender Wins!';
  const outcomeClass = currentRoll.attackerWins ? 'attacker-wins' : 'defender-wins';
  const winnerColor = currentRoll.attackerWins 
    ? getPlayerColor(currentRoll.attackerId) 
    : getPlayerColor(currentRoll.defenderId);

  return (
    <div className="turn-transition-overlay" onClick={handleBackdropClick}>
      <div 
        className={`dice-panel ${isVisible ? 'visible' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dice-panel-content">
          <button className="close-button" onClick={handleClose}>
            ×
          </button>
          
          <DiceRollDisplay roll={currentRoll} isAnimating={isAnimating} />
          
          {showOutcome && (
            <>
              <div className={`outcome ${outcomeClass}`} style={{ color: winnerColor }}>
                {outcome}
              </div>

              <div className="dice-explanation">
                {currentRoll.attackerWins 
                  ? 'All but one units move to target.'
                  : 'Origin flips to defender.'
                }
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}