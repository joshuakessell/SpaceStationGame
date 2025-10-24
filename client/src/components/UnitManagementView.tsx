import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UnitCard from "./UnitCard";
import { ArrowLeft } from "lucide-react";

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

export default function UnitManagementView() {
  const [credits, setCredits] = useState(1250);
  const [units, setUnits] = useState<Unit[]>([
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
      description: "Fast melee fighter that charges into enemy lines",
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
      description: "Ranged unit that attacks from a safe distance",
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
      description: "Heavy armored unit that absorbs enemy damage",
    },
  ]);

  const [activeTab, setActiveTab] = useState("all");

  const trainUnit = (unitId: string, cost: number) => {
    if (credits >= cost) {
      setCredits((c) => c - cost);
      setUnits((prevUnits) =>
        prevUnits.map((u) =>
          u.id === unitId ? { ...u, count: u.count + 1 } : u
        )
      );
      console.log("Unit trained!");
    }
  };

  const getTrainingCost = (unit: Unit) => {
    return 100 * unit.level;
  };

  const filteredUnits = units.filter(
    (unit) => activeTab === "all" || unit.type === activeTab
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-card border-b border-card-border">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" data-testid="button-back">
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

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-4">
              <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
              <TabsTrigger value="melee" data-testid="tab-melee">Melee</TabsTrigger>
              <TabsTrigger value="ranged" data-testid="tab-ranged">Ranged</TabsTrigger>
              <TabsTrigger value="tank" data-testid="tab-tank">Tank</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {filteredUnits.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUnits.map((unit) => {
                    const cost = getTrainingCost(unit);
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

          {/* Info Card */}
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
  );
}
