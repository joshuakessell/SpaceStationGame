import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import SpaceStation from "./components/SpaceStation";
import TutorialDialog from "./components/TutorialDialog";
import BuildMenu from "./components/BuildMenu";
import BuildingDetailMenu from "./components/BuildingDetailMenu";
import { Settings, Swords } from "lucide-react";

type TutorialStep = 
  | "welcome"
  | "name_input"
  | "intro"
  | "click_hub"
  | "build_command"
  | "command_building"
  | "build_mine"
  | "mine_building"
  | "build_crystal"
  | "crystal_building"
  | "explain_resources"
  | "complete";

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
  productionRate?: number;
  upgradeCost?: { credits?: number; metal?: number; crystals?: number };
  upgradeTime?: number;
  description?: string;
  icon?: string;
}

function App() {
  const [playerName, setPlayerName] = useState("");
  const [tutorialStep, setTutorialStep] = useState<TutorialStep>("welcome");
  const [credits, setCredits] = useState(100);
  const [metal, setMetal] = useState(50);
  const [crystals, setCrystals] = useState(0);
  
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);

  const [buildings, setBuildings] = useState<Building[]>([]);

  // Initialize starting resources for tutorial
  useEffect(() => {
    // Player starts with enough to build Command Center
    setCredits(100);
    setMetal(50);
    setCrystals(0);
  }, []);

  const tutorialMessages = {
    welcome: "Welcome to Space Base Showdown, Commander! What is your name?",
    intro: `Greetings, Commander ${playerName}! You have been assigned to establish a new space station in this sector. Your station currently consists of a single central hub, floating in the vastness of space. To survive and thrive, you must expand your station with essential facilities.`,
    click_hub: "Click on the central hub to view available expansions for your station.",
    build_command: "Excellent! The Command Center is your first priority. It will serve as the nerve center of all operations. You have just enough resources to construct it. Select the Command Center and begin construction.",
    command_building: "Construction in progress! Your crew is working diligently. Please stand by...",
    build_mine: "Wonderful! Now that you have a Command Center, you need to secure a steady supply of resources. Without metal, your station cannot grow. Click the hub again and construct an Ore Mine to begin extracting metal from nearby asteroids.",
    mine_building: "The Ore Mine is being constructed. Soon you'll have a steady supply of metal resources.",
    build_crystal: "Excellent work! Now you need advanced resources for research and technology. Click the hub one more time and construct a Crystal Synthesizer. This facility will generate the rare crystals needed for cutting-edge upgrades.",
    crystal_building: "The Crystal Synthesizer is under construction. These precious crystals will unlock powerful technologies.",
    explain_resources: `Perfect! Your station is taking shape. Here's what you need to know about resources:\n\n• The Ore Mine produces metal automatically over time\n• The Crystal Synthesizer generates crystals slowly\n• When a building's storage is full, a resource icon will appear above it\n• Click the icon to collect the resources quickly\n• Use resources to upgrade buildings and train units for battle\n\nYou're ready to command your station, Commander ${playerName}!`,
  };

  const handleNameInput = (name: string) => {
    setPlayerName(name);
    setTutorialStep("intro");
  };

  const handleTutorialContinue = () => {
    if (tutorialStep === "intro") {
      setTutorialStep("click_hub");
    } else if (tutorialStep === "command_building") {
      // Command Center built, give resources for Ore Mine
      setCredits((c) => c + 100);
      setMetal((m) => m + 50);
      setTutorialStep("build_mine");
    } else if (tutorialStep === "mine_building") {
      // Ore Mine built, give resources for Crystal Synthesizer
      setCredits((c) => c + 150);
      setMetal((m) => m + 75);
      setTutorialStep("build_crystal");
    } else if (tutorialStep === "crystal_building") {
      setTutorialStep("explain_resources");
    } else if (tutorialStep === "explain_resources") {
      setTutorialStep("complete");
    }
  };

  const handleHubClick = () => {
    if (tutorialStep === "click_hub") {
      setTutorialStep("build_command");
      setShowBuildMenu(true);
    } else if (tutorialStep === "build_mine" || tutorialStep === "build_crystal") {
      setShowBuildMenu(true);
    } else if (tutorialStep === "complete") {
      setShowBuildMenu(true);
    }
  };

  const handleBuild = (buildingId: string) => {
    const buildOptions = getBuildOptions();
    const option = buildOptions.find((o) => o.id === buildingId);
    if (!option) return;

    // Deduct costs
    setCredits((c) => c - (option.cost.credits || 0));
    setMetal((m) => m - (option.cost.metal || 0));
    setCrystals((c) => c - (option.cost.crystals || 0));

    // Determine position based on building count
    const positions = [
      { x: 50, y: 20 }, // Top
      { x: 20, y: 50 }, // Left
      { x: 80, y: 50 }, // Right
      { x: 50, y: 80 }, // Bottom
      { x: 30, y: 30 }, // Top-left
      { x: 70, y: 30 }, // Top-right
    ];

    const newBuilding: Building = {
      id: buildingId,
      name: option.name,
      level: 1,
      position: positions[buildings.length] || { x: 50, y: 20 },
      isBuilt: false,
      isBuilding: true,
      resourceType: buildingId === "mine" ? "metal" : buildingId === "crystal" ? "crystal" : undefined,
      currentStorage: 0,
      maxStorage: buildingId === "mine" ? 100 : buildingId === "crystal" ? 50 : undefined,
      productionRate: buildingId === "mine" ? 5 : buildingId === "crystal" ? 2 : undefined,
      description: option.description,
      icon: option.icon,
    };

    setBuildings((prev) => [...prev, newBuilding]);
    setShowBuildMenu(false);

    // Simulate building completion
    setTimeout(() => {
      setBuildings((prev) =>
        prev.map((b) =>
          b.id === buildingId ? { ...b, isBuilt: true, isBuilding: false } : b
        )
      );

      // Advance tutorial
      if (tutorialStep === "build_command") {
        setTutorialStep("command_building");
      } else if (tutorialStep === "build_mine") {
        setTutorialStep("mine_building");
      } else if (tutorialStep === "build_crystal") {
        setTutorialStep("crystal_building");
      }
    }, option.buildTime * 1000);
  };

  const getBuildOptions = () => {
    const hasCommand = buildings.some((b) => b.id === "command" && b.isBuilt);
    const hasMine = buildings.some((b) => b.id === "mine" && b.isBuilt);

    return [
      {
        id: "command",
        name: "Command Center",
        icon: "🏢",
        description: "The nerve center of your station. Required for all operations.",
        cost: { credits: 50, metal: 25, crystals: 0 },
        buildTime: 5,
        available: !buildings.some((b) => b.id === "command"),
      },
      {
        id: "mine",
        name: "Ore Mine",
        icon: "⛏️",
        description: "Extracts metal from nearby asteroids automatically.",
        cost: { credits: 100, metal: 50, crystals: 0 },
        buildTime: 8,
        available: hasCommand && !buildings.some((b) => b.id === "mine"),
        reason: !hasCommand ? "Requires Command Center" : undefined,
      },
      {
        id: "crystal",
        name: "Crystal Synthesizer",
        icon: "💎",
        description: "Generates rare crystals for advanced research.",
        cost: { credits: 150, metal: 75, crystals: 0 },
        buildTime: 10,
        available: hasMine && !buildings.some((b) => b.id === "crystal"),
        reason: !hasMine ? "Requires Ore Mine" : undefined,
      },
    ].filter((o) => !buildings.some((b) => b.id === o.id && b.isBuilt));
  };

  const handleBuildingClick = (buildingId: string) => {
    if (tutorialStep !== "complete") return;
    setSelectedBuilding(buildingId);
  };

  const handleCollectResource = (buildingId: string) => {
    const building = buildings.find((b) => b.id === buildingId);
    if (!building || building.currentStorage === undefined || building.currentStorage === 0) return;

    const amount = building.currentStorage;
    if (building.resourceType === "metal") {
      setMetal((m) => m + amount);
    } else if (building.resourceType === "crystal") {
      setCrystals((c) => c + amount);
    }

    // Reset storage
    setBuildings((prev) =>
      prev.map((b) => (b.id === buildingId ? { ...b, currentStorage: 0 } : b))
    );
  };

  // Simulate resource production
  useEffect(() => {
    const interval = setInterval(() => {
      setBuildings((prev) =>
        prev.map((b) => {
          if (!b.isBuilt || !b.productionRate || !b.maxStorage) return b;
          const newStorage = Math.min(
            (b.currentStorage || 0) + b.productionRate / 6,
            b.maxStorage
          );
          return { ...b, currentStorage: newStorage };
        })
      );
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const selectedBuildingData = buildings.find((b) => b.id === selectedBuilding);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen flex flex-col">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-3 bg-card border-b border-card-border z-10">
            <div className="flex items-center gap-6">
              <h1 className="font-orbitron font-bold text-xl">
                <span className="text-primary">SPACE</span> BASE
              </h1>
              {playerName && (
                <span className="text-sm text-muted-foreground">Commander {playerName}</span>
              )}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border border-border">
                  <span className="text-xl">💰</span>
                  <span className="font-orbitron font-semibold text-sm tabular-nums" data-testid="text-credits">
                    {Math.floor(credits)}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border border-border">
                  <span className="text-xl">🔧</span>
                  <span className="font-orbitron font-semibold text-sm tabular-nums" data-testid="text-metal">
                    {Math.floor(metal)}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border border-border">
                  <span className="text-xl">💎</span>
                  <span className="font-orbitron font-semibold text-sm tabular-nums" data-testid="text-crystals">
                    {Math.floor(crystals)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tutorialStep === "complete" && (
                <Button variant="default" data-testid="button-battle">
                  <Swords className="w-5 h-5 mr-2" />
                  Battle
                </Button>
              )}
              <Button variant="outline" size="icon" data-testid="button-settings">
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Space Station View */}
          <div className="flex-1 relative">
            <SpaceStation
              buildings={buildings}
              onHubClick={handleHubClick}
              onBuildingClick={handleBuildingClick}
              onCollectResource={handleCollectResource}
            />
          </div>

          {/* Tutorial Dialog */}
          {tutorialStep !== "complete" && tutorialStep !== "name_input" && tutorialStep !== "welcome" && (
            <TutorialDialog
              message={tutorialMessages[tutorialStep as keyof typeof tutorialMessages]}
              onComplete={handleTutorialContinue}
              needsInput={false}
            />
          )}

          {tutorialStep === "welcome" && (
            <TutorialDialog
              message={tutorialMessages.welcome}
              needsInput={true}
              inputLabel="Your Name"
              onInput={handleNameInput}
            />
          )}

          {/* Build Menu */}
          {showBuildMenu && (
            <BuildMenu
              options={getBuildOptions()}
              onBuild={handleBuild}
              onClose={() => setShowBuildMenu(false)}
              playerCredits={credits}
              playerMetal={metal}
              playerCrystals={crystals}
            />
          )}

          {/* Building Detail Menu */}
          {selectedBuilding && selectedBuildingData && (
            <BuildingDetailMenu
              name={selectedBuildingData.name}
              level={selectedBuildingData.level}
              icon={selectedBuildingData.icon || "🏢"}
              description={selectedBuildingData.description || ""}
              onClose={() => setSelectedBuilding(null)}
              currentProduction={selectedBuildingData.productionRate}
              maxStorage={selectedBuildingData.maxStorage}
              currentStorage={Math.floor(selectedBuildingData.currentStorage || 0)}
              resourceType={selectedBuildingData.resourceType}
            />
          )}
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
