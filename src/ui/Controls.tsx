import { useGame, useGameActions } from '../state';

export function Controls() {
  const { state, engine } = useGame();
  const { endTurn, newGame } = useGameActions();

  const hasValidMoves = engine.hasValidMoves(state);
  const canEndTurn = engine.canEndTurn(state);
  const isGameOver = engine.isGameOver(state);

  const handleEndTurn = () => {
    if (canEndTurn || !hasValidMoves || state.actionsLeft === 0) {
      endTurn();
    }
  };

  return (
    <div className="controls-section">
      {(canEndTurn || !hasValidMoves || state.actionsLeft === 0) && !isGameOver && (
        <button 
          className="end-turn-button"
          onClick={handleEndTurn}
        >
          End Turn
        </button>
      )}
      <button 
        className="new-game-button"
        onClick={() => newGame(state.players.length as 2 | 3, undefined, state.winGoal)}
      >
        New Game
      </button>
    </div>
  );
}