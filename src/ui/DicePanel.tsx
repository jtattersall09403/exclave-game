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
        <div className="dice-total" style={{ color: attackerColor }}>Total: {roll.attackerTotal}</div>
      </div>

      <div className="vs-divider">VS</div>

      <div className="dice-section defender">
        <div className="dice-label" style={{ color: defenderColor }}>Defender</div>
        <div className="dice-container">
          {roll.defender.map((value, index) => (
            <Dice key={index} value={value} isAnimating={isAnimating} />
          ))}
        </div>
        <div className="dice-total" style={{ color: defenderColor }}>Total: {roll.defenderTotal}</div>
      </div>
    </div>
  );
}

export function DicePanel() {
  const { lastDiceRoll } = useGame();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentRoll, setCurrentRoll] = useState<DiceRoll | null>(null);

  useEffect(() => {
    if (lastDiceRoll && lastDiceRoll.attacker.length > 0) {
      setCurrentRoll(lastDiceRoll);
      setIsVisible(true);
      setIsAnimating(true);

      const animationTimeout = setTimeout(() => {
        setIsAnimating(false);
      }, 700);

      const hideTimeout = setTimeout(() => {
        setIsVisible(false);
      }, 3000);

      return () => {
        clearTimeout(animationTimeout);
        clearTimeout(hideTimeout);
      };
    }
  }, [lastDiceRoll]);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isVisible || !currentRoll) {
    return null;
  }

  const outcome = currentRoll.attackerWins ? 'Attacker Wins!' : 'Defender Wins!';
  const outcomeClass = currentRoll.attackerWins ? 'attacker-wins' : 'defender-wins';

  return (
    <div 
      className={`dice-panel ${isVisible ? 'visible' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className="dice-panel-content">
        <button className="close-button" onClick={handleClose}>
          ×
        </button>
        
        <DiceRollDisplay roll={currentRoll} isAnimating={isAnimating} />
        
        <div className={`outcome ${outcomeClass}`}>
          {outcome}
        </div>

        <div className="dice-explanation">
          {currentRoll.attackerWins 
            ? 'All units move to target. Origin left empty!'
            : 'Origin flips to defender. Sacrificial rule applied!'
          }
        </div>
      </div>
    </div>
  );
}