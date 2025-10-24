import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import BattleGrid from "./BattleGrid";
import UnitCard from "./UnitCard";
import { ArrowLeft, Play } from "lucide-react";

interface Unit {
  id: string;
  name: string;
  type: "melee" | "ranged" | "tank";
  level: number;
  health: number;
  maxHealth: number;
  damage: number;
  count: number;
  icon: string;
  description: string;
}

export default function BattleView() {
  const [deployedUnits, setDeployedUnits] = useState<string[]>([]);
  const [battleStarted, setBattleStarted] = useState(false);

  const availableUnits: Unit[] = [
    {
      id: "1",
      name: "Space Marine",
      type: "melee",
      level: 2,
      health: 120,
      maxHealth: 120,
      damage: 25,
      count: 3,
      icon: "🚀",
      description: "Fast melee fighter",
    },
    {
      id: "2",
      name: "Laser Gunner",
      type: "ranged",
      level: 1,
      health: 80,
      maxHealth: 80,
      damage: 30,
      count: 2,
      icon: "🔫",
      description: "Ranged attacker",
    },
    {
      id: "3",
      name: "Battle Tank",
      type: "tank",
      level: 1,
      health: 200,
      maxHealth: 200,
      damage: 15,
      count: 1,
      icon: "🛡️",
      description: "Heavy defender",
    },
  ];

  const playerGridUnits = deployedUnits.slice(0, 3).map((id, index) => {
    const unit = availableUnits.find((u) => u.id === id)!;
    return {
      id: unit.id,
      name: unit.name,
      icon: unit.icon,
      health: unit.health,
      maxHealth: unit.maxHealth,
      position: { row: index, col: 0 },
      isPlayer: true,
    };
  });

  const enemyGridUnits = [
    { id: "e1", name: "Enemy", icon: "👾", health: 90, maxHealth: 100, position: { row: 0, col: 5 }, isPlayer: false },
    { id: "e2", name: "Enemy", icon: "🤖", health: 150, maxHealth: 150, position: { row: 1, col: 4 }, isPlayer: false },
    { id: "e3", name: "Enemy", icon: "👽", health: 80, maxHealth: 80, position: { row: 2, col: 5 }, isPlayer: false },
  ];

  const toggleDeploy = (unitId: string) => {
    setDeployedUnits((prev) => {
      if (prev.includes(unitId)) {
        return prev.filter((id) => id !== unitId);
      } else if (prev.length < 6) {
        return [...prev, unitId];
      }
      return prev;
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-card border-b border-card-border">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-orbitron font-bold text-xl">
            <span className="text-primary">BATTLE</span> MODE
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Units Deployed: {deployedUnits.length}/6
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {!battleStarted ? (
            <>
              {/* Deployment Instructions */}
              <Card className="p-4 bg-primary/10 border-primary/30">
                <p className="text-sm text-center">
                  Select up to 6 units to deploy in battle. Click "Start Battle" when ready!
                </p>
              </Card>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Unit Selection */}
                <div className="space-y-4">
                  <h2 className="font-orbitron font-bold text-lg">Select Your Units</h2>
                  <div className="grid gap-4">
                    {availableUnits.map((unit) => (
                      <UnitCard
                        key={unit.id}
                        {...unit}
                        isDeployed={deployedUnits.includes(unit.id)}
                        onDeploy={() => toggleDeploy(unit.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Battle Preview */}
                <div className="space-y-4">
                  <h2 className="font-orbitron font-bold text-lg">Battle Preview</h2>
                  <div className="flex justify-center">
                    <BattleGrid
                      playerUnits={playerGridUnits}
                      enemyUnits={enemyGridUnits}
                      isDeployMode={false}
                    />
                  </div>
                  
                  <Button
                    size="lg"
                    className="w-full h-14 text-lg font-orbitron"
                    disabled={deployedUnits.length === 0}
                    onClick={() => setBattleStarted(true)}
                    data-testid="button-start-battle"
                  >
                    <Play className="w-6 h-6 mr-2" />
                    Start Battle
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              {/* Battle Arena */}
              <Card className="p-6">
                <div className="flex justify-center mb-6">
                  <BattleGrid
                    playerUnits={playerGridUnits}
                    enemyUnits={enemyGridUnits}
                    isDeployMode={false}
                  />
                </div>
                
                <div className="text-center space-y-4">
                  <p className="text-lg font-semibold">Battle in Progress...</p>
                  <p className="text-sm text-muted-foreground">Units are fighting automatically</p>
                  
                  <div className="flex gap-4 justify-center mt-6">
                    <Button 
                      variant="outline"
                      onClick={() => setBattleStarted(false)}
                      data-testid="button-end-battle"
                    >
                      End Battle
                    </Button>
                    <Button
                      onClick={() => {
                        console.log("Battle Won!");
                        setBattleStarted(false);
                      }}
                      data-testid="button-simulate-win"
                    >
                      Simulate Victory
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
