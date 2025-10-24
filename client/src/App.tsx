import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import BuildingCard from "./components/BuildingCard";
import UnitCard from "./components/UnitCard";
import BattleGrid from "./components/BattleGrid";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Swords, Users, Settings, ArrowLeft, Play } from "lucide-react";

type ViewType = "base" | "battle" | "units";

function App() {
  const [currentView, setCurrentView] = useState<ViewType>("base");
  const [credits, setCredits] = useState(1250);
  const [metal, setMetal] = useState(850);
  const [crystals, setCrystals] = useState(320);
  const [deployedUnits, setDeployedUnits] = useState<string[]>([]);
  const [battleStarted, setBattleStarted] = useState(false);
  const [unitTab, setUnitTab] = useState("all");

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

  const [units, setUnits] = useState([
    {
      id: "1",
      name: "Space Marine",
      type: "melee" as const,
      level: 2,
      health: 120,
      maxHealth: 120,
      damage: 25,
      count: 3,
      icon: "🚀",
      description: "Fast melee fighter that charges into enemy lines",
    },
    {
      id: "2",
      name: "Laser Gunner",
      type: "ranged" as const,
      level: 1,
      health: 80,
      maxHealth: 80,
      damage: 30,
      count: 2,
      icon: "🔫",
      description: "Ranged unit that attacks from a safe distance",
    },
    {
      id: "3",
      name: "Battle Tank",
      type: "tank" as const,
      level: 1,
      health: 200,
      maxHealth: 200,
      damage: 15,
      count: 1,
      icon: "🛡️",
      description: "Heavy armored unit that absorbs enemy damage",
    },
  ]);

  const playerGridUnits = deployedUnits.slice(0, 3).map((id, index) => {
    const unit = units.find((u) => u.id === id)!;
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

  const trainUnit = (unitId: string, cost: number) => {
    if (credits >= cost) {
      setCredits((c) => c - cost);
      setUnits((prevUnits) =>
        prevUnits.map((u) =>
          u.id === unitId ? { ...u, count: u.count + 1 } : u
        )
      );
    }
  };

  const filteredUnits = units.filter(
    (unit) => unitTab === "all" || unit.type === unitTab
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          {/* BASE VIEW */}
          {currentView === "base" && (
            <div className="min-h-screen flex flex-col">
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
                <Button variant="outline" size="icon" data-testid="button-settings">
                  <Settings className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 p-6">
                <div className="max-w-7xl mx-auto space-y-6">
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

                  <div className="flex gap-4">
                    <Button 
                      size="lg" 
                      className="flex-1 h-16 text-lg font-orbitron"
                      onClick={() => {
                        setCurrentView("battle");
                        setBattleStarted(false);
                      }}
                      data-testid="button-battle"
                    >
                      <Swords className="w-6 h-6 mr-2" />
                      Start Battle
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline"
                      className="flex-1 h-16 text-lg font-orbitron"
                      onClick={() => setCurrentView("units")}
                      data-testid="button-units"
                    >
                      <Users className="w-6 h-6 mr-2" />
                      Manage Units
                    </Button>
                  </div>

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
                            setCredits((c) => c - building.upgradeCredits);
                            setMetal((m) => m - building.upgradeMetal);
                          }}
                          onCollect={
                            building.availableToCollect
                              ? () => {
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
          )}

          {/* BATTLE VIEW */}
          {currentView === "battle" && (
            <div className="min-h-screen flex flex-col">
              <div className="flex items-center justify-between px-6 py-3 bg-card border-b border-card-border">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setCurrentView("base")}
                    data-testid="button-back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <h1 className="font-orbitron font-bold text-xl">
                    <span className="text-primary">BATTLE</span> MODE
                  </h1>
                </div>
                <span className="text-sm text-muted-foreground">
                  Units Deployed: {deployedUnits.length}/6
                </span>
              </div>

              <div className="flex-1 p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                  {!battleStarted ? (
                    <>
                      <Card className="p-4 bg-primary/10 border-primary/30">
                        <p className="text-sm text-center">
                          Select up to 6 units to deploy in battle. Click "Start Battle" when ready!
                        </p>
                      </Card>

                      <div className="grid lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h2 className="font-orbitron font-bold text-lg">Select Your Units</h2>
                          <div className="grid gap-4">
                            {units.map((unit) => (
                              <UnitCard
                                key={unit.id}
                                {...unit}
                                isDeployed={deployedUnits.includes(unit.id)}
                                onDeploy={() => toggleDeploy(unit.id)}
                              />
                            ))}
                          </div>
                        </div>

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
                                setCredits((c) => c + 200);
                                setBattleStarted(false);
                                setCurrentView("base");
                              }}
                              data-testid="button-simulate-win"
                            >
                              Simulate Victory (+200 Credits)
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* UNITS VIEW */}
          {currentView === "units" && (
            <div className="min-h-screen flex flex-col">
              <div className="flex items-center justify-between px-6 py-3 bg-card border-b border-card-border">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setCurrentView("base")}
                    data-testid="button-back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <h1 className="font-orbitron font-bold text-xl">
                    <span className="text-primary">UNIT</span> MANAGEMENT
                  </h1>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border border-border">
                  <span className="text-2xl">💰</span>
                  <span className="font-orbitron font-semibold text-sm tabular-nums" data-testid="text-credits">
                    {credits}
                  </span>
                </div>
              </div>

              <div className="flex-1 p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                  <Tabs value={unitTab} onValueChange={setUnitTab}>
                    <TabsList className="grid w-full max-w-md grid-cols-4">
                      <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
                      <TabsTrigger value="melee" data-testid="tab-melee">Melee</TabsTrigger>
                      <TabsTrigger value="ranged" data-testid="tab-ranged">Ranged</TabsTrigger>
                      <TabsTrigger value="tank" data-testid="tab-tank">Tank</TabsTrigger>
                    </TabsList>

                    <TabsContent value={unitTab} className="mt-6">
                      {filteredUnits.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredUnits.map((unit) => {
                            const cost = 100 * unit.level;
                            return (
                              <UnitCard
                                key={unit.id}
                                {...unit}
                                canTrain={credits >= cost}
                                onTrain={() => trainUnit(unit.id, cost)}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">No units in this category</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  <div className="p-4 bg-muted/50 rounded-lg border border-border">
                    <h3 className="font-orbitron font-semibold mb-2">Training Info</h3>
                    <p className="text-sm text-muted-foreground">
                      Train units to build your army. Training costs increase with unit level. 
                      Deploy your units in battle mode to earn rewards and progress!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
