import { useState } from 'react';
import { Hex } from '../core/hex';
import { useGame, useGameActions } from '../state';
import { MoveDialog } from './MoveDialog';
import type { Cell, PlayerId } from '../types';

const HEX_SIZE = 60;

function getPlayerColor(playerId: PlayerId): string {
  switch (playerId) {
    case 0: return '#66FF57';
    case 1: return '#FF4BD1';
    case 2: return '#2EE7FF';
    default: return '#666666';
  }
}

function getPlayerEdgeColor(playerId: PlayerId): string {
  switch (playerId) {
    case 0: return '#1F7F1A';
    case 1: return '#9A1F7B';
    case 2: return '#127E90';
    default: return '#333333';
  }
}

function generateHexPath(centerX: number, centerY: number, size: number): string {
  const points: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const x = centerX + size * Math.cos(angle);
    const y = centerY + size * Math.sin(angle);
    points.push([x, y]);
  }
  return `M ${points.map(([x, y]) => `${x},${y}`).join(' L ')} Z`;
}

interface HexShapeProps {
  cell: Cell;
  isSelected: boolean;
  isHovered: boolean;
  isValidTarget: boolean;
  isMoveTarget: boolean;
  isMoveSource: boolean;
  onHexClick: (cellId: number) => void;
  onHexHover: (cellId: number | null) => void;
}

interface HexCellProps {
  cell: Cell;
  isSelected: boolean;
  isHovered: boolean;
  isValidTarget: boolean;
  isReinforcementTarget: boolean;
  onHexClick: (cellId: number) => void;
  onHexHover: (cellId: number | null) => void;
  gamePhase: 'reinforce' | 'attack' | 'move';
  currentPlayer: PlayerId;
}

function HexShape({ cell, isSelected, isHovered, isValidTarget, isMoveTarget, isMoveSource, onHexClick, onHexHover }: HexShapeProps) {
  const hex = new Hex(cell.q, cell.r);
  const { x, y } = hex.toPixel(HEX_SIZE);
  
  const fillColor = getPlayerColor(cell.owner);
  const hexPath = generateHexPath(x, y, HEX_SIZE);

  const handleClick = () => onHexClick(cell.id);
  const handleMouseEnter = () => onHexHover(cell.id);
  const handleMouseLeave = () => onHexHover(null);

  const opacity = isHovered ? 0.8 : 1.0;
  const strokeWidth = isSelected || isMoveSource ? 4 : 2;
  const glowFilter = isValidTarget ? 'url(#targetGlow)' : undefined;
  let adjustedFillColor = fillColor;
  let strokeColor = getPlayerEdgeColor(cell.owner);
  
  if (isValidTarget) {
    adjustedFillColor = lightenColor(fillColor, 0.3);
  } else if (isMoveTarget) {
    adjustedFillColor = lightenColor(fillColor, 0.2);
    strokeColor = '#FFFF00'; // Yellow border for move targets
  } else if (isMoveSource) {
    strokeColor = '#00FFFF'; // Cyan border for move source
  }
  
  const hexClass = isValidTarget ? 'hex-cell attackable' : 'hex-cell';

  return (
    <g
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}  
      style={{ cursor: 'pointer' }}
      className={hexClass}
    >
      <path
        d={hexPath}
        fill={adjustedFillColor}
        stroke={isSelected ? '#FFFFFF' : strokeColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
        filter={glowFilter}
      />
    </g>
  );
}

function HexCell({ cell, isSelected, isHovered, isValidTarget, isReinforcementTarget, onHexClick, onHexHover, gamePhase, currentPlayer }: HexCellProps) {
  const hex = new Hex(cell.q, cell.r);
  const { x, y } = hex.toPixel(HEX_SIZE);
  
  const fillColor = getPlayerColor(cell.owner);
  
  // Show numbers when: hovering, selected, attackable target, or owned during reinforcement phase
  const showNumbers = isHovered || isSelected || isValidTarget || 
                     (gamePhase === 'reinforce' && cell.owner === currentPlayer);

  return (
    <UnitStack
      x={x}
      y={y}
      units={cell.units}
      color={fillColor}
      showNumbers={showNumbers}
    />
  );
}

interface UnitStackProps {
  x: number;
  y: number;
  units: number;
  color: string;
  showNumbers: boolean;
}

function UnitStack({ x, y, units, color, showNumbers }: UnitStackProps) {
  const stacks = [];
  const stackSize = Math.min(units, 8);
  
  // Darker shade for 3D effect
  const darkerColor = getDarkerShade(color);
  
  for (let i = 0; i < stackSize; i++) {
    const offsetY = -i * 6; // More vertical spacing for chunky 3D effect
    const shadowOffset = 3;
    
    // Shadow/bottom disc
    stacks.push(
      <ellipse
        key={`shadow-${i}`}
        cx={x + shadowOffset}
        cy={y + offsetY + shadowOffset}
        rx={32}
        ry={20}
        fill={darkerColor}
        opacity={0.7}
      />
    );
    
    // Main disc with 3D effect - much darker than hex color
    stacks.push(
      <ellipse
        key={i}
        cx={x}
        cy={y + offsetY}
        rx={32}
        ry={20}
        fill={getMuchDarkerShade(color)}
        stroke={darkerColor}
        strokeWidth={3}
      />
    );
  }

  // Only show number on top disc when showNumbers is true
  const topY = y - (stackSize - 1) * 6;
  return (
    <g className="unit-stack">
      {stacks}
      {showNumbers && (
        <text
          x={x}
          y={topY + 6}
          textAnchor="middle"
          fontSize="28"
          fontWeight="bold"
          fill="#FFFFFF"
          pointerEvents="none"
          style={{ 
            textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000'
          }}
        >
          {units}
        </text>
      )}
    </g>
  );
}

function getDarkerShade(color: string): string {
  // Convert hex to RGB, darken, and return hex
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const darkerR = Math.max(0, Math.floor(r * 0.6));
  const darkerG = Math.max(0, Math.floor(g * 0.6));
  const darkerB = Math.max(0, Math.floor(b * 0.6));
  
  return `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`;
}

function getMuchDarkerShade(color: string): string {
  // Convert hex to RGB, make much darker than hex, and return hex
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const darkerR = Math.max(0, Math.floor(r * 0.95));
  const darkerG = Math.max(0, Math.floor(g * 0.95));
  const darkerB = Math.max(0, Math.floor(b * 0.95));
  
  return `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`;
}

function lightenColor(color: string, factor: number): string {
  // Convert hex to RGB, lighten, and return hex
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const lighterR = Math.min(255, Math.floor(r + (255 - r) * factor));
  const lighterG = Math.min(255, Math.floor(g + (255 - g) * factor));
  const lighterB = Math.min(255, Math.floor(b + (255 - b) * factor));
  
  return `#${lighterR.toString(16).padStart(2, '0')}${lighterG.toString(16).padStart(2, '0')}${lighterB.toString(16).padStart(2, '0')}`;
}

export function Board() {
  const { state, engine } = useGame();
  const { reinforce, attack, move, selectCell, deselectCell } = useGameActions();
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);
  const [moveSource, setMoveSource] = useState<number | null>(null);
  const [moveDestination, setMoveDestination] = useState<number | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  if (state.cells.length === 0) {
    return <div className="board-loading">Loading game...</div>;
  }

  const minX = Math.min(...state.cells.map(cell => new Hex(cell.q, cell.r).toPixel(HEX_SIZE).x));
  const maxX = Math.max(...state.cells.map(cell => new Hex(cell.q, cell.r).toPixel(HEX_SIZE).x));
  const minY = Math.min(...state.cells.map(cell => new Hex(cell.q, cell.r).toPixel(HEX_SIZE).y));
  const maxY = Math.max(...state.cells.map(cell => new Hex(cell.q, cell.r).toPixel(HEX_SIZE).y));

  const padding = HEX_SIZE * 2;
  const viewBoxX = minX - padding;
  const viewBoxY = minY - padding;
  const viewBoxWidth = (maxX - minX) + (padding * 2);
  const viewBoxHeight = (maxY - minY) + (padding * 2);

  const selectedCell = state.selected ? state.cells.find(c => c.id === state.selected) : null;
  const validTargets = selectedCell ? engine.getValidAttackTargets(state, selectedCell.id) : [];
  const validReinforcements = engine.getValidReinforcementTargets(state);
  const validMoveTargets = selectedCell ? engine.getValidMoveTargets(state, selectedCell.id) : [];
  
  // Show glowing effect for attack targets, move targets get different visual
  const glowingTargets = state.phase === 'attack' ? validTargets : [];
  const moveTargetCells = validMoveTargets;

  const handleHexClick = (cellId: number) => {
    const cell = state.cells.find(c => c.id === cellId);
    if (!cell) return;

    if (state.phase === 'reinforce') {
      if (validReinforcements.includes(cellId)) {
        reinforce(cellId);
      }
    } else if (state.phase === 'attack') {
      // If we're in movement mode
      if (moveSource !== null) {
        if (validMoveTargets.includes(cellId)) {
          // Set destination and show move dialog
          setMoveDestination(cellId);
          setShowMoveDialog(true);
        } else {
          // Cancel movement mode
          setMoveSource(null);
        }
        return;
      }

      // Normal attack/selection logic
      if (state.selected === null) {
        if (cell.owner === state.current && cell.units >= 1) {
          selectCell(cellId);
        }
      } else if (state.selected === cellId) {
        deselectCell();
      } else if (validTargets.includes(cellId) && state.selected !== null) {
        // Regular attack on enemy
        attack(state.selected as number, cellId);
        deselectCell();
      } else if (validMoveTargets.includes(cellId) && state.selected !== null) {
        // "Attack" on own adjacent hex = movement
        setMoveSource(state.selected || null);
        setMoveDestination(cellId);
        setShowMoveDialog(true);
      } else if (cell.owner === state.current && cell.units >= 1) {
        selectCell(cellId);
      } else {
        deselectCell();
      }
    }
  };

  const handleMoveRequest = (cellId: number) => {
    const cell = state.cells.find(c => c.id === cellId);
    if (!cell || cell.owner !== state.current || cell.units <= 1) return;
    
    // Enter movement mode
    setMoveSource(cellId);
    deselectCell(); // Clear any attack selection
  };

  const handleMoveConfirm = (unitCount: number) => {
    if (moveSource !== null && moveDestination !== null) {
      move(moveSource, moveDestination, unitCount);
    }
    setMoveSource(null);
    setMoveDestination(null);
    setShowMoveDialog(false);
  };

  const handleMoveCancel = () => {
    setMoveSource(null);
    setMoveDestination(null);
    setShowMoveDialog(false);
  };

  return (
    <div className="board-container">
      <svg
        className="game-board"
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
        width="100%"
        height="100%"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="targetGlow">
            <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
            <feFlood floodColor="#FFFFFF" floodOpacity="0.8"/>
            <feComposite in="SourceGraphic" in2="coloredBlur" operator="over"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Render all hex shapes first (background layer) */}
        {state.cells.map(cell => (
          <HexShape
            key={`hex-${cell.id}`}
            cell={cell}
            isSelected={state.selected === cell.id}
            isHovered={hoveredCell === cell.id}
            isValidTarget={glowingTargets.includes(cell.id)}
            isMoveTarget={moveTargetCells.includes(cell.id)}
            isMoveSource={moveSource === cell.id}
            onHexClick={handleHexClick}
            onHexHover={setHoveredCell}
          />
        ))}
        
        {/* Render all unit stacks sorted by Y coordinate (foreground layer) */}
        {state.cells
          .map(cell => ({ 
            cell, 
            y: new Hex(cell.q, cell.r).toPixel(HEX_SIZE).y 
          }))
          .sort((a, b) => a.y - b.y) // Sort by Y coordinate - top to bottom
          .map(({ cell }) => (
            <HexCell
              key={`stack-${cell.id}`}
              cell={cell}
              isSelected={state.selected === cell.id}
              isHovered={hoveredCell === cell.id}
              isValidTarget={glowingTargets.includes(cell.id)}
              isReinforcementTarget={validReinforcements.includes(cell.id)}
              onHexClick={handleHexClick}
              onHexHover={setHoveredCell}
              gamePhase={state.phase}
              currentPlayer={state.current}
            />
          ))}
        
      </svg>
      
      <MoveDialog
        isVisible={showMoveDialog}
        fromCell={moveSource ? state.cells.find(c => c.id === moveSource) : null}
        toCell={moveDestination ? state.cells.find(c => c.id === moveDestination) : null}
        onMove={handleMoveConfirm}
        onCancel={handleMoveCancel}
      />
    </div>
  );
}

