import { useState } from 'react';
import { useGameActions } from '../state';

interface WelcomeProps {
  onGameStart: () => void;
}

export function Welcome({ onGameStart }: WelcomeProps) {
  const { newGame } = useGameActions();
  const [winGoal, setWinGoal] = useState(5);

  const handleStart2P = () => {
    newGame(2, undefined, winGoal);
    onGameStart();
  };

  const handleStart3P = () => {
    newGame(3, undefined, winGoal);
    onGameStart();
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <img 
          src="/exclave-splatoon.png" 
          alt="EXCLAVE" 
          className="game-title-image"
        />
        
        <div className="instructions">
          <p>The game of strategy, wit, and niche cartographical idiosyncrasy.</p>
          <p>First to <em>n</em> exclaves wins!</p>
        </div>

        <div className="goal-selector">
          <label htmlFor="win-goal">Exclaves to win:</label>
          <select 
            id="win-goal" 
            value={winGoal} 
            onChange={(e) => setWinGoal(parseInt(e.target.value))}
          >
            <option value={5}>5 exclaves</option>
            <option value={6}>6 exclaves</option>
            <option value={7}>7 exclaves</option>
            <option value={8}>8 exclaves</option>
            <option value={9}>9 exclaves</option>
            <option value={10}>10 exclaves</option>
          </select>
        </div>

        <div className="game-buttons">
          <button className="start-button" onClick={handleStart2P}>
            Start 2P
          </button>
          <button className="start-button" onClick={handleStart3P}>
            Start 3P
          </button>
        </div>
      </div>
    </div>
  );
}