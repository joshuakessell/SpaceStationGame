import { useState } from "react";
import { Button } from "@/components/ui/button";
import BuildingCard from "./BuildingCard";
import { Swords, Users, Settings } from "lucide-react";

export default function BaseView() {
  const [credits, setCredits] = useState(1250);
  const [metal, setMetal] = useState(850);
  const [crystals, setCrystals] = useState(320);

  const buildings = [
    {
      name: "Command Center",
      level: 3,
      icon: "🏢",
      description: "The heart of your base. Upgrading unlocks new buildings and capabilities.",
      upgradeCredits: 500,
      upgradeMetal: 200,
      upgradeTime: 300,
    },
    {
      name: "Ore Mine",
      level: 2,
      icon: "⛏️",
      description: "Produces metal resources automatically over time.",
      upgradeCredits: 300,
      upgradeMetal: 100,
      upgradeTime: 180,
      currentProduction: 5,
      maxStorage: 100,
      availableToCollect: 75,
    },
    {
      name: "Crystal Synthesizer",
      level: 1,
      icon: "💎",
      description: "Generates rare crystals used for advanced research.",
      upgradeCredits: 400,
      upgradeMetal: 150,
      upgradeTime: 240,
      currentProduction: 2,
      maxStorage: 50,
      availableToCollect: 30,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Resource Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-card border-b border-card-border">
        <div className="flex items-center gap-6">
          <h1 className="font-orbitron font-bold text-xl">
            <span className="text-primary">SPACE</span> BASE
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border border-border">
              <span className="text-2xl">💰</span>
              <span className="font-orbitron font-semibold text-sm tabular-nums" data-testid="text-credits">
                {credits}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border border-border">
              <span className="text-2xl">🔧</span>
              <span className="font-orbitron font-semibold text-sm tabular-nums" data-testid="text-metal">
                {metal}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border border-border">
              <span className="text-2xl">💎</span>
              <span className="font-orbitron font-semibold text-sm tabular-nums" data-testid="text-crystals">
                {crystals}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" data-testid="button-settings">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Base Overview */}
          <div 
            className="relative h-64 rounded-xl overflow-hidden border-2 border-primary/30"
            style={{
              background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)",
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="text-6xl">🌍</div>
                <h2 className="font-orbitron font-bold text-2xl text-white">Your Space Base</h2>
                <p className="text-sm text-white/70">Build, upgrade, and prepare for battle</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button 
              size="lg" 
              className="flex-1 h-16 text-lg font-orbitron"
              data-testid="button-battle"
            >
              <Swords className="w-6 h-6 mr-2" />
              Start Battle
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="flex-1 h-16 text-lg font-orbitron"
              data-testid="button-units"
            >
              <Users className="w-6 h-6 mr-2" />
              Manage Units
            </Button>
          </div>

          {/* Buildings Grid */}
          <div>
            <h3 className="font-orbitron font-bold text-xl mb-4">Buildings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {buildings.map((building, index) => (
                <BuildingCard
                  key={index}
                  {...building}
                  canUpgrade={
                    credits >= building.upgradeCredits &&
                    metal >= building.upgradeMetal
                  }
                  onUpgrade={() => {
                    console.log(`Upgrading ${building.name}`);
                    setCredits((c) => c - building.upgradeCredits);
                    setMetal((m) => m - building.upgradeMetal);
                  }}
                  onCollect={
                    building.availableToCollect
                      ? () => {
                          console.log(`Collecting from ${building.name}`);
                          if (building.name === "Ore Mine") {
                            setMetal((m) => m + (building.availableToCollect || 0));
                          } else if (building.name === "Crystal Synthesizer") {
                            setCrystals((c) => c + (building.availableToCollect || 0));
                          }
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
