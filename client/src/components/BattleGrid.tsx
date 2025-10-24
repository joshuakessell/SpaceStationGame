import { useState } from "react";

interface GridUnit {
  id: string;
  name: string;
  icon: string;
  health: number;
  maxHealth: number;
  position: { row: number; col: number };
  isPlayer: boolean;
}

interface BattleGridProps {
  rows?: number;
  cols?: number;
  playerUnits?: GridUnit[];
  enemyUnits?: GridUnit[];
  isDeployMode?: boolean;
  onCellClick?: (row: number, col: number) => void;
}

export default function BattleGrid({
  rows = 4,
  cols = 6,
  playerUnits = [],
  enemyUnits = [],
  isDeployMode = false,
  onCellClick,
}: BattleGridProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const getUnitAtPosition = (row: number, col: number) => {
    return [...playerUnits, ...enemyUnits].find(
      (unit) => unit.position.row === row && unit.position.col === col
    );
  };

  const isPlayerSide = (col: number) => col < 3;
  const isEnemySide = (col: number) => col >= 3;

  return (
    <div className="inline-block p-4 bg-card rounded-lg border border-card-border" data-testid="battle-grid">
      <div className="space-y-1">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-1">
            {Array.from({ length: cols }).map((_, colIndex) => {
              const unit = getUnitAtPosition(rowIndex, colIndex);
              const isHovered = hoveredCell?.row === rowIndex && hoveredCell?.col === colIndex;
              const canPlace = isDeployMode && isPlayerSide(colIndex);

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    w-16 h-16 rounded-md border-2 transition-all relative
                    ${isPlayerSide(colIndex) ? "bg-blue-500/10 border-blue-500/30" : "bg-red-500/10 border-red-500/30"}
                    ${canPlace ? "hover:bg-blue-500/20 hover:border-blue-500 cursor-pointer" : ""}
                    ${isHovered && canPlace ? "ring-2 ring-primary" : ""}
                    ${unit ? "border-accent" : ""}
                  `}
                  onClick={() => canPlace && onCellClick?.(rowIndex, colIndex)}
                  onMouseEnter={() => setHoveredCell({ row: rowIndex, col: colIndex })}
                  onMouseLeave={() => setHoveredCell(null)}
                  data-testid={`cell-${rowIndex}-${colIndex}`}
                >
                  {unit && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-2xl">{unit.icon}</div>
                      <div className="w-full px-1 mt-1">
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${unit.isPlayer ? "bg-blue-500" : "bg-red-500"}`}
                            style={{ width: `${(unit.health / unit.maxHealth) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500/30 border border-blue-500" />
          <span>Your Side</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500/30 border border-red-500" />
          <span>Enemy Side</span>
        </div>
      </div>
    </div>
  );
}
