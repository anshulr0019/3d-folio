import React, { useEffect, useRef, useState } from "react";
import { sound } from "./Audio";

interface ArcadeGameProps {
  onClose: () => void;
}

export const ArcadeGame: React.FC<ArcadeGameProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem("cyber_snake_highscore") || "0", 10);
  });
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const gameStateRef = useRef({
    snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    food: { x: 15, y: 10 },
    speed: 100,
  });

  const playBeep = (freq: number, duration: number) => {
    sound.playBeep(freq, duration, "square");
  };

  const spawnFood = () => {
    const x = Math.floor(Math.random() * 20);
    const y = Math.floor(Math.random() * 20);
    gameStateRef.current.food = { x, y };
  };

  const startGame = () => {
    gameStateRef.current = {
      snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }],
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      food: { x: 15, y: 10 },
      speed: 100,
    };
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    playBeep(440, 0.15);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      const dir = gameStateRef.current.dir;
      if ((e.key === "ArrowUp" || e.key === "w" || e.key === "W") && dir.y === 0) {
        gameStateRef.current.nextDir = { x: 0, y: -1 };
      } else if ((e.key === "ArrowDown" || e.key === "s" || e.key === "S") && dir.y === 0) {
        gameStateRef.current.nextDir = { x: 0, y: 1 };
      } else if ((e.key === "ArrowLeft" || e.key === "a" || e.key === "A") && dir.x === 0) {
        gameStateRef.current.nextDir = { x: -1, y: 0 };
      } else if ((e.key === "ArrowRight" || e.key === "d" || e.key === "D") && dir.x === 0) {
        gameStateRef.current.nextDir = { x: 1, y: 0 };
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const interval = setInterval(() => {
      const state = gameStateRef.current;
      state.dir = state.nextDir;
      const head = { x: state.snake[0].x + state.dir.x, y: state.snake[0].y + state.dir.y };

      // Wall collision check
      if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20) {
        setGameOver(true);
        playBeep(150, 0.4);
        return;
      }

      // Body collision check
      if (state.snake.some((segment) => segment.x === head.x && segment.y === head.y)) {
        setGameOver(true);
        playBeep(150, 0.4);
        return;
      }

      state.snake.unshift(head);

      // Food pickup check
      if (head.x === state.food.x && head.y === state.food.y) {
        setScore((prev) => {
          const next = prev + 10;
          if (next > highScore) {
            setHighScore(next);
            localStorage.setItem("cyber_snake_highscore", next.toString());
          }
          return next;
        });
        playBeep(880, 0.1);
        spawnFood();
      } else {
        state.snake.pop();
      }

      // Render game grid
      ctx.fillStyle = "#090912";
      ctx.fillRect(0, 0, 400, 400);

      // Grid lines
      ctx.strokeStyle = "rgba(99, 102, 241, 0.08)";
      for (let i = 0; i <= 400; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 400);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(400, i);
        ctx.stroke();
      }

      // Draw Food
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#06b6d4";
      ctx.beginPath();
      ctx.arc(state.food.x * 20 + 10, state.food.y * 20 + 10, 8, 0, Math.PI * 2);
      ctx.fill();

      // Draw Snake
      ctx.shadowColor = "#a855f7";
      ctx.shadowBlur = 10;
      state.snake.forEach((seg, idx) => {
        ctx.fillStyle = idx === 0 ? "#6366f1" : idx % 2 === 0 ? "#a855f7" : "#818cf8";
        ctx.fillRect(seg.x * 20 + 1, seg.y * 20 + 1, 18, 18);
      });
      ctx.shadowBlur = 0;
    }, gameStateRef.current.speed);

    return () => clearInterval(interval);
  }, [gameStarted, gameOver, highScore]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-gradient-to-b from-indigo-950/90 to-purple-950/90 border-2 border-cyan-500/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.4)] flex flex-col items-center">
        {/* Header Marquee */}
        <div className="w-full flex items-center justify-between border-b border-cyan-500/30 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#06b6d4]"></span>
            <h2 className="text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-300 to-indigo-400">
              CYBER SNAKE ARCADE
            </h2>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs font-mono text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-800/60 border border-cyan-500/40 rounded-lg transition"
          >
            ESC ✕
          </button>
        </div>

        {/* Score Board */}
        <div className="w-full flex justify-between px-4 py-2 mb-3 bg-black/40 border border-indigo-500/30 rounded-xl font-mono text-sm">
          <div className="text-cyan-300">SCORE: <span className="text-white font-bold">{score}</span></div>
          <div className="text-purple-300">HIGH: <span className="text-yellow-400 font-bold">{highScore}</span></div>
        </div>

        {/* Arcade Screen Canvas */}
        <div className="relative border-4 border-indigo-900/80 rounded-xl overflow-hidden shadow-inner bg-black">
          <canvas ref={canvasRef} width={380} height={380} className="w-[340px] h-[340px] sm:w-[380px] sm:h-[380px] block" />
          
          {/* Start / Game Over Screen Overlay */}
          {(!gameStarted || gameOver) && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
              <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
                {gameOver ? "GAME OVER!" : "READY PLAYER ONE"}
              </h3>
              <p className="text-xs text-gray-300 font-mono mb-5">
                {gameOver ? `Final Score: ${score}` : "Use WASD or Arrow keys to steer!"}
              </p>
              <button
                onClick={startGame}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.5)] transition transform hover:scale-105"
              >
                {gameOver ? "PLAY AGAIN" : "START GAME"}
              </button>
            </div>
          )}
        </div>

        {/* Controls footer */}
        <div className="mt-4 text-center text-xs text-gray-400 font-mono">
          [W][A][S][D] / Arrows to Move • Steer clear of borders!
        </div>
      </div>
    </div>
  );
};
