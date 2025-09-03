# Exclave

![Exclave Title Image](public/exclave-splatoon.png)

*[Play the game here](https://exclave-game.netlify.app/)*

The lightweight, [niche cartographical idiosyncrasy inspired](https://en.wikipedia.org/wiki/Baarle-Hertog), turn-based strategy game where **you** compete to become the nation with the most pointlessly complicated territorial borders.

*Major credit and thanks to the great [Dice Wars](https://www.gamedesign.jp/games/dicewars/) for design and gameplay inspiration*

## Game Overview

**Exclave** is a hot-seat, turn-based strategy game for 2-3 players. Your goal is to create the most [exclaves](https://en.wikipedia.org/wiki/Enclave_and_exclave) surrounded by your opponent's territory. 

## How to Play

### Setup
- Choose a 2P or 3P game, and your target number of exclaves. Five is a good default.

### Turn Flow
1. **Reinforce**: Add units to your territories. Each unit represents one six-sided die.
2. **Attack/move**: Select a stack of units to attack with and an enemy territory to attack. Your dice are rolled against theirs. Top score wins.
3. **End Turn**

### Victory
First player to *n* exclaves wins! (Set n during setup, default 5).

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
