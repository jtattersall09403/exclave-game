import { useGame, useGameActions } from '../state';
import type { PlayerId } from '../types';
import { useState, useEffect } from 'react';

function getPlayerColor(playerId: PlayerId): string {
  switch (playerId) {
    case 0: return '#66FF57';
    case 1: return '#FF4BD1';
    case 2: return '#2EE7FF';
    default: return '#666666';
  }
}

function getPlayerName(playerId: PlayerId): string {
  switch (playerId) {
    case 0: return 'Player 1';
    case 1: return 'Player 2';
    case 2: return 'Player 3';
    default: return 'Unknown';
  }
}

interface ScoreBarProps {
  playerId: PlayerId;
  score: number;
  winGoal: number;
  isCurrentPlayer: boolean;
}

function ScoreBar({ playerId, score, winGoal, isCurrentPlayer }: ScoreBarProps) {
  const color = getPlayerColor(playerId);
  const name = getPlayerName(playerId);
  const width = winGoal > 0 ? (score / winGoal) * 100 : 0;

  return (
    <div className={`score-bar ${isCurrentPlayer ? 'current-player' : ''}`}>
      <div className="player-info">
        <div className="player-name">{name}</div>
        <div className="score-text">{score}/{winGoal}</div>
      </div>
      <div className="score-bar-container">
        <div 
          className="score-bar-fill"
          style={{ 
            width: `${width}%`,
            backgroundColor: color,
            transition: 'width 0.3s ease-in-out'
          }}
        />
      </div>
    </div>
  );
}

function getPhaseText(phase: 'reinforce' | 'attack' | 'move'): string {
  if (phase === 'reinforce') {
    return `Reinforce`;
  }
  if (phase === 'move') {
    return 'Move';
  }
  return 'Attack';
}

function ReinforcementCounter({ count, playerColor }: { count: number; playerColor: string }) {
  if (count <= 0) return null;
  
  const discs = [];
  for (let i = 0; i < count; i++) {
    discs.push(
      <div
        key={i}
        className="reinforcement-disc"
        style={{ backgroundColor: playerColor }}
      />
    );
  }
  
  return (
    <div className="reinforcement-counter">
      <span className="reinforcement-label">Place:</span>
      <div className="reinforcement-discs">
        {discs}
      </div>
    </div>
  );
}

function ActionCounter({ count, playerColor }: { count: number; playerColor: string }) {
  if (count <= 0) return null;
  
  const discs = [];
  for (let i = 0; i < count; i++) {
    discs.push(
      <div
        key={i}
        className="action-disc"
        style={{ backgroundColor: playerColor }}
      />
    );
  }
  
  return (
    <div className="action-counter">
      <span className="action-label">Actions:</span>
      <div className="action-discs">
        {discs}
      </div>
    </div>
  );
}

function getContextHint(phase: 'reinforce' | 'attack' | 'move', reinfLeft: number, hasValidMoves: boolean, actionsLeft: number): string {
  if (phase === 'reinforce' && reinfLeft > 0) {
    return 'Tap your cell to place +1';
  }
  if (phase === 'reinforce' && reinfLeft === 0) {
    return 'Click "End Turn" to switch to attack phase';
  }
  if (phase === 'move') {
    return 'Click your stack then a friendly hex to move units';
  }
  if (phase === 'attack' && actionsLeft <= 0) {
    return 'No actions remaining - end turn';
  }
  if (phase === 'attack' && hasValidMoves) {
    return 'Select an adjacent enemy to attack or move units';
  }
  if (phase === 'attack' && !hasValidMoves) {
    return 'No valid attacks available - end turn';
  }
  return 'End turn to score';
}

function TurnTransitionPopup({ playerId, onClose }: { playerId: PlayerId; onClose: () => void }) {
  const playerName = getPlayerName(playerId);
  const playerColor = getPlayerColor(playerId);
  
  useEffect(() => {
    const timer = setTimeout(onClose, 2000); // Auto-close after 2 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="turn-transition-overlay" onClick={onClose}>
      <div className="turn-transition-popup" style={{ borderColor: playerColor }}>
        <h2 style={{ color: playerColor }}>{playerName}'s Turn</h2>
        <p>Get ready to dominate the battlefield!</p>
      </div>
    </div>
  );
}

export function HUD() {
  const { state, engine } = useGame();
  const { endTurn, newGame } = useGameActions();
  const [showTurnTransition, setShowTurnTransition] = useState(false);
  const [lastCurrentPlayer, setLastCurrentPlayer] = useState(state.current);

  // Detect player changes and show turn transition
  useEffect(() => {
    if (state.current !== lastCurrentPlayer && state.phase === 'reinforce') {
      setShowTurnTransition(true);
      setLastCurrentPlayer(state.current);
    }
  }, [state.current, state.phase, lastCurrentPlayer]);

  const hasValidMoves = engine.hasValidMoves(state);
  const canEndTurn = engine.canEndTurn(state);
  const isGameOver = engine.isGameOver(state);
  const winner = engine.getWinner(state);

  const handleEndTurn = () => {
    if (canEndTurn || !hasValidMoves || state.actionsLeft === 0) {
      endTurn();
    }
  };

  return (
    <>
      {showTurnTransition && (
        <TurnTransitionPopup 
          playerId={state.current}
          onClose={() => setShowTurnTransition(false)}
        />
      )}
      <div className="top-hud">
        <div className="game-info">
          <div className="turn-info">
            <div className="current-player">
              <span style={{ color: getPlayerColor(state.current) }}>
                {getPlayerName(state.current)}
              </span>
              {' • '}
              <span className="phase">
                {getPhaseText(state.phase)}
              </span>
              {state.phase === 'reinforce' && (
                <ReinforcementCounter 
                  count={state.reinfLeft} 
                  playerColor={getPlayerColor(state.current)} 
                />
              )}
              {state.phase === 'attack' && (
                <ActionCounter 
                  count={state.actionsLeft} 
                  playerColor={getPlayerColor(state.current)} 
                />
              )}
            </div>
            <div className="round-info">
              First to {state.winGoal} exclaves wins!
            </div>
          </div>

          <div className="context-hint" style={{ color: getPlayerColor(state.current) }}>
            {isGameOver && winner !== null 
              ? `Game Over! ${getPlayerName(winner)} wins!`
              : getContextHint(state.phase, state.reinfLeft, hasValidMoves, state.actionsLeft)
            }
          </div>

          <div className="controls">
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
        </div>
      </div>

      <div className="bottom-hud">
        <div className="score-section">
          {state.players.map(playerId => (
            <ScoreBar
              key={playerId}
              playerId={playerId}
              score={state.scores[playerId]}
              winGoal={state.winGoal}
              isCurrentPlayer={playerId === state.current}
            />
          ))}
        </div>
      </div>
    </>
  );
}