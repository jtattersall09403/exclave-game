import { useState } from 'react';
import { GameProvider } from './state';
import { Welcome } from './ui/Welcome';
import { Board } from './ui/Board';
import { HUD } from './ui/HUD';
import { DicePanel } from './ui/DicePanel';
import './App.css';

function App() {
  const [gameStarted, setGameStarted] = useState(false);

  const handleGameStart = () => {
    setGameStarted(true);
  };

  const handleNewGame = () => {
    setGameStarted(false);
  };

  return (
    <GameProvider>
      <div className="app">
        {!gameStarted ? (
          <Welcome onGameStart={handleGameStart} />
        ) : (
          <div className="game-view">
            <HUD />
            <Board />
            <DicePanel />
            <button className="new-game-button" onClick={handleNewGame}>
              New Game
            </button>
          </div>
        )}
      </div>
    </GameProvider>
  );
}

export default App;
