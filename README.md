# Exclave

![Exclave Title Image](public/exclave-splatoon.png)

A lightweight, turn-based strategy game where players create their own exclaves (disconnected regions) to score points.

## Game Overview

**Exclave** is a hot-seat, turn-based strategy game for 2-3 players. The core mechanic revolves around deliberately creating disconnected territories (exclaves) that are cut off from the board edge. Players score +1 point per exclave at the end of their turn. The game lasts 20 rounds, and the highest score wins.

## Features

- **Hex Grid Board**: Procedurally generated organic landmass on hex grid
- **Sacrificial Combat**: Losing an attack flips your origin hex to the defender (key to creating exclaves)
- **Dynamic Scoring**: Score points for each exclave you control at turn end
- **2P and 3P Modes**: Support for both 2-player and 3-player games
- **Splatoon-Inspired Visuals**: Bright neon colors and smooth animations
- **Touch & Mouse Support**: Works on desktop and mobile devices

## How to Play

### Setup
- Every land hex starts owned by a player
- Each player's initial territory is contiguous
- Territories are split roughly evenly

### Turn Flow
1. **Reinforce**: Place +1 unit on 3 of your hexes (max 8 units per hex)
2. **Attack**: Select your hex (≥2 units), then attack adjacent enemy hex
   - Roll dice: Attacker rolls (units-1) d6, Defender rolls (units) d6
   - Higher total wins; ties go to defender
   - **Win**: Origin drops to 1 unit, target captured with moved stack
   - **Lose**: Origin flips to defender (sacrificial rule - creates exclaves!)
3. **End Turn**: Score +1 per exclave (connected groups not touching board edge)

### Victory
After 20 rounds, player with highest score wins.

## Development

Built with:
- React 18 + TypeScript
- Vite for build tooling
- SVG for hex grid rendering
- CSS3 animations

### Running Locally

```bash
npm install
npm run dev
```

Visit `http://localhost:8081`

### Building

```bash
npm run build
```

## Deployment

Configured for Netlify deployment with automatic SPA routing.

## Game Design

The key innovation of Exclave is the **sacrificial rule**: when you lose an attack, your attacking hex flips to the defender. This creates a risk/reward dynamic where losing attacks can actually be beneficial for creating disconnected territories that score points.

## Accessibility

- Color-blind friendly palette option
- High contrast mode support  
- Reduced motion support
- Large touch targets
- Keyboard navigation support
