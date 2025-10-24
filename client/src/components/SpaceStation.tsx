import { useState } from "react";
import { Card } from "@/components/ui/card";

interface Building {
  id: string;
  name: string;
  level: number;
  position: { x: number; y: number };
  isBuilt: boolean;
  isBuilding?: boolean;
  resourceType?: "metal" | "crystal";
  currentStorage?: number;
  maxStorage?: number;
}

interface SpaceStationProps {
  buildings: Building[];
  onHubClick: () => void;
  onBuildingClick: (buildingId: string) => void;
  onCollectResource: (buildingId: string) => void;
}

export default function SpaceStation({
  buildings,
  onHubClick,
  onBuildingClick,
  onCollectResource,
}: SpaceStationProps) {
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null);

  const getResourceIcon = (type: string) => {
    return type === "metal" ? "🔧" : "💎";
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center" data-testid="space-station">
      {/* Space background */}
      <div 
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, #1e1b4b 0%, #0f0a2e 70%, #000000 100%)",
        }}
      >
        {/* Stars */}
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1 + "px",
              height: Math.random() * 2 + 1 + "px",
              top: Math.random() * 100 + "%",
              left: Math.random() * 100 + "%",
              opacity: Math.random() * 0.7 + 0.3,
            }}
          />
        ))}
      </div>

      {/* Station container */}
      <div className="relative w-[600px] h-[600px]">
        {/* Central Hub */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
          onClick={onHubClick}
          onMouseEnter={() => setHoveredBuilding("hub")}
          onMouseLeave={() => setHoveredBuilding(null)}
          data-testid="hub-center"
        >
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl group-hover:bg-primary/50 transition-all" />
            
            {/* Hub sphere */}
            <div 
              className="relative w-32 h-32 rounded-full flex items-center justify-center text-6xl transition-transform group-hover:scale-110"
              style={{
                background: "radial-gradient(circle at 30% 30%, #a78bfa 0%, #7c3aed 50%, #5b21b6 100%)",
                boxShadow: "0 0 40px rgba(139, 92, 246, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.2)",
              }}
            >
              <span className="drop-shadow-lg">🛸</span>
            </div>

            {/* Tooltip */}
            {hoveredBuilding === "hub" && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 bg-card border border-border rounded-md text-sm font-semibold whitespace-nowrap pointer-events-none">
                Central Hub
              </div>
            )}
          </div>
        </div>

        {/* Buildings */}
        {buildings.map((building) => {
          if (!building.isBuilt && !building.isBuilding) return null;

          const isFull = building.currentStorage && building.maxStorage && building.currentStorage >= building.maxStorage;

          return (
            <div
              key={building.id}
              className="absolute cursor-pointer group"
              style={{
                top: building.position.y + "%",
                left: building.position.x + "%",
                transform: "translate(-50%, -50%)",
              }}
              onClick={() => onBuildingClick(building.id)}
              onMouseEnter={() => setHoveredBuilding(building.id)}
              onMouseLeave={() => setHoveredBuilding(null)}
              data-testid={`building-${building.id}`}
            >
              {/* Connection line to hub */}
              <svg
                className="absolute pointer-events-none"
                style={{
                  width: "600px",
                  height: "600px",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              >
                <line
                  x1={300 - (building.position.x * 6 - 300)}
                  y1={300 - (building.position.y * 6 - 300)}
                  x2={300}
                  y2={300}
                  stroke="rgba(139, 92, 246, 0.3)"
                  strokeWidth="2"
                  strokeDasharray={building.isBuilding ? "5,5" : "none"}
                />
              </svg>

              <div className="relative">
                {/* Building glow */}
                <div className={`absolute inset-0 rounded-full blur-lg transition-all ${
                  building.isBuilding 
                    ? "bg-yellow-500/30 animate-pulse" 
                    : "bg-blue-500/20 group-hover:bg-blue-500/40"
                }`} />
                
                {/* Building sphere */}
                <div 
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-transform group-hover:scale-110 ${
                    building.isBuilding ? "opacity-50" : "opacity-100"
                  }`}
                  style={{
                    background: building.isBuilding
                      ? "radial-gradient(circle at 30% 30%, #fbbf24 0%, #f59e0b 50%, #d97706 100%)"
                      : "radial-gradient(circle at 30% 30%, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)",
                    boxShadow: `0 0 30px ${building.isBuilding ? "rgba(251, 191, 36, 0.4)" : "rgba(59, 130, 246, 0.4)"}, inset 0 0 15px rgba(255, 255, 255, 0.15)`,
                  }}
                >
                  {building.isBuilding ? (
                    <span className="animate-spin">⚙️</span>
                  ) : (
                    <span>
                      {building.name === "Command Center" ? "🏢" : 
                       building.name === "Ore Mine" ? "⛏️" : "💎"}
                    </span>
                  )}
                </div>

                {/* Resource collection icon */}
                {isFull && !building.isBuilding && (
                  <div
                    className="absolute -top-2 -right-2 w-8 h-8 bg-accent rounded-full flex items-center justify-center animate-bounce cursor-pointer hover:scale-125 transition-transform"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCollectResource(building.id);
                    }}
                    data-testid={`collect-${building.id}`}
                  >
                    <span className="text-lg">{getResourceIcon(building.resourceType || "metal")}</span>
                  </div>
                )}

                {/* Building tooltip */}
                {hoveredBuilding === building.id && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 bg-card border border-border rounded-md text-sm font-semibold whitespace-nowrap pointer-events-none z-10">
                    {building.name} {building.isBuilding ? "(Building...)" : `Lv.${building.level}`}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
