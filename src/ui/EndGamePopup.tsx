import { useEffect, useState } from 'react';
import type { PlayerId } from '../types';
import { useGameActions } from '../state';

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

function getPlayerColorVariations(playerId: PlayerId): string[] {
  switch (playerId) {
    case 0: // Green variations
      return ['#66FF57', '#4FE043', '#7AFF6B', '#38D129', '#8CFF7F', '#29C41A'];
    case 1: // Pink variations  
      return ['#FF4BD1', '#FF2BC6', '#FF6BDC', '#E027B7', '#FF8BE7', '#C41DA8'];
    case 2: // Blue variations
      return ['#2EE7FF', '#1ADDFF', '#4CECFF', '#0BCDF0', '#6AF0FF', '#00B8E0'];
    default: 
      return ['#666666', '#777777', '#555555', '#888888', '#444444', '#999999'];
  }
}

function getPlayerGradient(playerId: PlayerId): string {
  const variations = getPlayerColorVariations(playerId);
  return `linear-gradient(45deg, ${variations[0]}, ${variations[1]}, ${variations[2]}, ${variations[0]})`;
}

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  size: number;
  gravity: number;
}

function createConfettiPiece(id: number, playerId: PlayerId): ConfettiPiece {
  const colors = getPlayerColorVariations(playerId);
  
  // Spawn from center of screen where popup appears
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  
  return {
    id,
    x: centerX + (Math.random() - 0.5) * 1, // Spread around center
    y: centerY,
    vx: (Math.random() - 0.5) * 10, // Spread for better effect
    vy: -(Math.random() * 20 + 8), // Always shoot upward initially
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 15,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 10 + 6,
    gravity: Math.random() * 0.2 + 0.2
  };
}

function ConfettiCanvas({ playerId }: { playerId: PlayerId }) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    let nextId = 0;
    
    // Create single burst with more confetti
    const burstConfetti = Array.from({ length: 120 }, () => 
      createConfettiPiece(nextId++, playerId)
    );
    
    setConfetti(burstConfetti);

    // Animation loop
    const interval = setInterval(() => {
      setConfetti(prev => {
        return prev
          .map(piece => ({
            ...piece,
            x: piece.x + piece.vx,
            y: piece.y + piece.vy,
            vx: piece.vx * 0.985, // Air resistance
            vy: piece.vy + piece.gravity, // Gravity
            rotation: piece.rotation + piece.rotationSpeed
          }))
          .filter(piece => {
            // Remove pieces that are off-screen or have been falling for too long
            const isOnScreen = piece.y < window.innerHeight + 50 && 
                              piece.y > -50 && 
                              piece.x > -50 && 
                              piece.x < window.innerWidth + 50;
            const isStillVisible = piece.vy < 20; // Remove if falling too fast (stuck)
            return isOnScreen && isStillVisible;
          })
      });
    }, 16); // ~60fps

    // Clean up after 8 seconds
    const cleanup = setTimeout(() => {
      clearInterval(interval);
      setConfetti([]);
    }, 8000);

    return () => {
      clearInterval(interval);
      clearTimeout(cleanup);
    };
  }, [playerId]);

  return (
    <div className="confetti-canvas">
      {confetti.map(piece => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            position: 'fixed',
            left: piece.x,
            top: piece.y,
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
            pointerEvents: 'none',
            zIndex: 9999
          }}
        />
      ))}
    </div>
  );
}

interface EndGamePopupProps {
  winner: PlayerId;
  onClose: () => void;
}

export function EndGamePopup({ winner, onClose }: EndGamePopupProps) {
  const playerName = getPlayerName(winner);
  const playerColor = getPlayerColor(winner);
  const playerGradient = getPlayerGradient(winner);
  const { newGame } = useGameActions();

  const handleNewGame = () => {
    // Use a 3-player game by default (can be made configurable later)
    newGame(3, undefined, 5);
    // Close popup after new game is started
    setTimeout(() => onClose(), 100);
  };

  return (
    <>
      <ConfettiCanvas playerId={winner} />
      <div className="turn-transition-overlay">
        <div 
          className="end-game-popup" 
          onClick={(e) => e.stopPropagation()}
          style={{ 
            border: '4px solid',
            borderImage: `${playerGradient} 1`
          }}
        >
          <div className="end-game-content">
            <h1 className="victory-title" style={{ color: playerColor }}>
              {playerName} Wins!
            </h1>
            <button 
              className="new-game-button"
              onClick={handleNewGame}
            >
              New Game
            </button>
          </div>
        </div>
      </div>
    </>
  );
}