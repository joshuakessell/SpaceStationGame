import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import SpaceStation from "@/components/SpaceStation";
import TutorialDialog from "@/components/TutorialDialog";
import BuildMenu from "@/components/BuildMenu";
import BuildingDetailMenu from "@/components/BuildingDetailMenu";
import { StarMap } from "@/components/StarMap";
import DroneHangar from "@/components/DroneHangar";
import ResourceConsole from "@/components/ResourceConsole";
import { RiftScanner } from "@/components/RiftScanner";
import { ArrayBay } from "@/components/ArrayBay";
import PowerManagement from "@/components/PowerManagement";
import { ResearchBay } from "@/components/ResearchBay";
import { Shipyard } from "@/components/Shipyard";
import { BattleArena } from "@/components/Battle";
import { Settings, Swords, Rocket, Activity, Zap, Beaker } from "lucide-react";
import type { Player, Building } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";

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

interface BuildingData extends Building {
  upgradeCost?: { credits?: number; metal?: number; crystals?: number };
  upgradeTime?: number;
  description?: string;
  icon?: string;
}

export default function Game() {
  const { toast } = useToast();
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [showStarMap, setShowStarMap] = useState(false);
  const [showDroneHangar, setShowDroneHangar] = useState(false);
  const [showResourceConsole, setShowResourceConsole] = useState(false);
  const [showRiftScanner, setShowRiftScanner] = useState(false);
  const [showArrayBay, setShowArrayBay] = useState(false);
  const [showPowerManagement, setShowPowerManagement] = useState(false);
  const [showResearchBay, setShowResearchBay] = useState(false);
  const [showShipyard, setShowShipyard] = useState(false);
  const [showBattle, setShowBattle] = useState(false);
  const [placementMode, setPlacementMode] = useState<{
    buildingType: string;
    cost: { credits?: number; metal?: number; crystals?: number };
  } | null>(null);
  const [availablePositions, setAvailablePositions] = useState<Array<{ x: number; y: number }>>([]);

  // Fetch player data
  const { data: player, isLoading: playerLoading } = useQuery<Player>({
    queryKey: ["/api/player"],
    retry: false,
  });

  // Fetch buildings
  const { data: buildings = [], isLoading: buildingsLoading } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
    retry: false,
  });

  // Update player mutation
  const updatePlayerMutation = useMutation({
    mutationFn: async (updates: Partial<Player>) => {
      return await apiRequest("PATCH", "/api/player", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/player"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  // Create building mutation
  const createBuildingMutation = useMutation({
    mutationFn: async (buildingData: any) => {
      return await apiRequest("POST", "/api/buildings", buildingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/player"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  // Update building mutation
  const updateBuildingMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Building> }) => {
      return await apiRequest("PATCH", `/api/buildings/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings"] });
    },
  });

  // Collect resource mutation
  const collectResourceMutation = useMutation({
    mutationFn: async (buildingId: string) => {
      return await apiRequest("POST", `/api/buildings/${buildingId}/collect`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/player"] });
    },
  });

  if (playerLoading || buildingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🚀</div>
          <p className="text-muted-foreground">Loading your space station...</p>
        </div>
      </div>
    );
  }

  if (!player) return null;

  const tutorialStep = (player.tutorialStep || "welcome") as TutorialStep;

  const tutorialMessages = {
    welcome: "Welcome to Space Base Showdown, Commander! What is your name?",
    intro: `Greetings, Commander ${player.name}! You have been assigned to establish a new space station in this sector. Your station currently consists of a single central hub, floating in the vastness of space. To survive and thrive, you must expand your station with essential facilities.`,
    click_hub: "Click on the central hub to view available expansions for your station.",
    build_command: "Excellent! The Command Center is your first priority. It will serve as the nerve center of all operations. You have just enough resources to construct it. Select the Command Center and begin construction.",
    command_building: "Construction in progress! Your crew is working diligently. Please stand by...",
    build_mine: "Wonderful! Now that you have a Command Center, you need to secure a steady supply of resources. Without metal, your station cannot grow. Click the hub again and construct an Ore Mine to begin extracting metal from nearby asteroids.",
    mine_building: "The Ore Mine is being constructed. Soon you'll have a steady supply of metal resources.",
    build_crystal: "Excellent work! Now you need advanced resources for research and technology. Click the hub one more time and construct a Crystal Synthesizer. This facility will generate the rare crystals needed for cutting-edge upgrades.",
    crystal_building: "The Crystal Synthesizer is under construction. These precious crystals will unlock powerful technologies.",
    explain_resources: `Perfect! Your station is taking shape. Here's what you need to know about resources:\n\n• The Ore Mine produces metal automatically over time\n• The Crystal Synthesizer generates crystals slowly\n• When a building's storage is full, a resource icon will appear above it\n• Click the icon to collect the resources quickly\n• Use resources to upgrade buildings and train units for battle\n\nYou're ready to command your station, Commander ${player.name}!`,
  };

  const handleNameInput = async (name: string) => {
    await updatePlayerMutation.mutateAsync({
      name,
      tutorialStep: "intro",
    });
  };

  const handleTutorialContinue = async () => {
    if (tutorialStep === "intro") {
      await updatePlayerMutation.mutateAsync({ tutorialStep: "click_hub" });
    } else if (tutorialStep === "command_building") {
      await updatePlayerMutation.mutateAsync({ 
        tutorialStep: "build_mine",
        gold: player.gold + 100,
        metal: player.metal + 50,
      });
    } else if (tutorialStep === "mine_building") {
      await updatePlayerMutation.mutateAsync({ 
        tutorialStep: "build_crystal",
        gold: player.gold + 150,
        metal: player.metal + 75,
      });
    } else if (tutorialStep === "crystal_building") {
      await updatePlayerMutation.mutateAsync({ tutorialStep: "explain_resources" });
    } else if (tutorialStep === "explain_resources") {
      await updatePlayerMutation.mutateAsync({ tutorialStep: "complete" });
    }
  };

  const handleHubClick = () => {
    if (tutorialStep === "click_hub") {
      updatePlayerMutation.mutate({ tutorialStep: "build_command" });
      setShowBuildMenu(true);
    } else if (tutorialStep === "build_mine" || tutorialStep === "build_crystal") {
      setShowBuildMenu(true);
    } else if (tutorialStep === "complete") {
      setShowBuildMenu(true);
    }
  };

  const calculateAvailablePositions = (buildingsArray: typeof buildingsData) => {
    const occupied = new Set(buildingsArray.map(b => `${b.position.x},${b.position.y}`));
    const available: Array<{ x: number; y: number }> = [];
    
    // Hub is at (50, 50), check 4 cardinal directions
    const hubAdjacent = [
      { x: 50, y: 35 }, // top
      { x: 50, y: 65 }, // bottom
      { x: 35, y: 50 }, // left
      { x: 65, y: 50 }, // right
    ];
    
    // Add hub-adjacent spots if not occupied
    hubAdjacent.forEach(pos => {
      if (!occupied.has(`${pos.x},${pos.y}`)) {
        available.push(pos);
      }
    });
    
    // For each built building, check adjacent spots
    buildingsArray.filter(b => b.isBuilt).forEach(building => {
      const adjacent = [
        { x: building.position.x, y: building.position.y - 15 }, // top
        { x: building.position.x, y: building.position.y + 15 }, // bottom
        { x: building.position.x - 15, y: building.position.y }, // left
        { x: building.position.x + 15, y: building.position.y }, // right
      ];
      
      adjacent.forEach(pos => {
        // Check bounds (10-90% to stay on screen)
        if (pos.x >= 10 && pos.x <= 90 && pos.y >= 10 && pos.y <= 90) {
          if (!occupied.has(`${pos.x},${pos.y}`) && 
              !available.some(a => a.x === pos.x && a.y === pos.y)) {
            available.push(pos);
          }
        }
      });
    });
    
    return available;
  };

  const handleBuild = (buildingId: string) => {
    const buildOptions = getBuildOptions();
    const option = buildOptions.find((o) => o.id === buildingId);
    if (!option) return;

    // Enter placement mode
    setPlacementMode({
      buildingType: buildingId,
      cost: option.cost,
    });
    setAvailablePositions(calculateAvailablePositions(buildingsData));
    setShowBuildMenu(false);
  };

  const handlePositionSelect = async (position: { x: number; y: number }) => {
    if (!placementMode) return;

    try {
      // Deduct costs
      await updatePlayerMutation.mutateAsync({
        gold: player.gold - (placementMode.cost.gold || 0),
        metal: player.metal - (placementMode.cost.metal || 0),
        crystals: player.crystals - (placementMode.cost.crystals || 0),
      });

      const option = getBuildOptions().find((o) => o.id === placementMode.buildingType);
      if (!option) return;

      await createBuildingMutation.mutateAsync({
        buildingType: placementMode.buildingType,
        name: option.name,
        level: 1,
        positionX: position.x,
        positionY: position.y,
        isBuilt: false,
        isBuilding: true,
        currentStorage: 0,
        maxStorage: placementMode.buildingType === "mine" ? 100 : placementMode.buildingType === "crystal" ? 50 : null,
        productionRate: placementMode.buildingType === "mine" ? 5 : placementMode.buildingType === "crystal" ? 2 : null,
        resourceType: placementMode.buildingType === "mine" ? "metal" : placementMode.buildingType === "crystal" ? "crystals" : null,
        buildStartedAt: new Date(),
      });

      setPlacementMode(null);
      setAvailablePositions([]);
      toast({ title: "Building construction started!" });

      // Simulate building completion
      setTimeout(async () => {
        await queryClient.refetchQueries({ queryKey: ["/api/buildings"] });
        const updatedBuildings = queryClient.getQueryData<Building[]>(["/api/buildings"]);
        const newBuilding = updatedBuildings?.find((b) => b.buildingType === placementMode.buildingType && b.isBuilding);
        
        if (newBuilding) {
          await updateBuildingMutation.mutateAsync({
            id: newBuilding.id,
            updates: { 
              isBuilt: true, 
              isBuilding: false,
              lastCollectedAt: new Date(),
            },
          });

          const currentTutorialStep = queryClient.getQueryData<Player>(["/api/player"])?.tutorialStep;
          if (currentTutorialStep === "build_command") {
            await updatePlayerMutation.mutateAsync({ tutorialStep: "command_building" });
          } else if (currentTutorialStep === "build_mine") {
            await updatePlayerMutation.mutateAsync({ tutorialStep: "mine_building" });
          } else if (currentTutorialStep === "build_crystal") {
            await updatePlayerMutation.mutateAsync({ tutorialStep: "crystal_building" });
          }
        }
      }, option.buildTime * 1000);
    } catch (error: any) {
      toast({ 
        title: "Build failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const getBuildOptions = () => {
    const hasCommand = buildings.some((b) => b.buildingType === "command" && b.isBuilt);
    const hasMine = buildings.some((b) => b.buildingType === "mine" && b.isBuilt);
    const hasScanner = buildings.some((b) => b.buildingType === "scanner" && b.isBuilt);
    const hasDroneHangar = buildings.some((b) => b.buildingType === "drone_hangar" && b.isBuilt);

    return [
      {
        id: "command",
        name: "Command Center",
        icon: "🏢",
        description: "The nerve center of your station. Required for all operations.",
        cost: { gold: 50, metal: 25, crystals: 0 },
        buildTime: 5,
        available: !buildings.some((b) => b.buildingType === "command"),
      },
      {
        id: "mine",
        name: "Ore Mine",
        icon: "⛏️",
        description: "Extracts metal from nearby asteroids automatically.",
        cost: { gold: 100, metal: 50, crystals: 0 },
        buildTime: 8,
        available: hasCommand && !buildings.some((b) => b.buildingType === "mine"),
        reason: !hasCommand ? "Requires Command Center" : undefined,
      },
      {
        id: "scanner",
        name: "Scanner Array",
        icon: "📡",
        description: "Scans for asteroid clusters containing iron. Access the Star Map to discover mining opportunities.",
        cost: { gold: 200, metal: 100, crystals: 0 },
        buildTime: 12,
        available: hasCommand && !buildings.some((b) => b.buildingType === "scanner"),
        reason: !hasCommand ? "Requires Command Center" : undefined,
      },
      {
        id: "crystal",
        name: "Crystal Synthesizer",
        icon: "💎",
        description: "Generates rare crystals for advanced research.",
        cost: { gold: 150, metal: 75, crystals: 0 },
        buildTime: 10,
        available: hasMine && !buildings.some((b) => b.buildingType === "crystal"),
        reason: !hasMine ? "Requires Ore Mine" : undefined,
      },
      {
        id: "rift_scanner",
        name: "Rift Scanner",
        icon: "🌀",
        description: "Detects unstable dimensional rifts rich in crystalline energy. Advanced technology for discovering rifts.",
        cost: { gold: 300, metal: 150, crystals: 50 },
        buildTime: 15,
        available: hasScanner && !buildings.some((b) => b.buildingType === "rift_scanner"),
        reason: !hasScanner ? "Requires Scanner Array" : undefined,
      },
      {
        id: "array_bay",
        name: "Array Bay",
        icon: "🛸",
        description: "Construct and deploy extraction arrays to siphon crystals from dimensional rifts continuously.",
        cost: { gold: 400, metal: 200, crystals: 75 },
        buildTime: 18,
        available: hasDroneHangar && !buildings.some((b) => b.buildingType === "array_bay"),
        reason: !hasDroneHangar ? "Requires Drone Hangar" : undefined,
      },
    ].filter((o) => !buildings.some((b) => b.buildingType === o.id && b.isBuilt));
  };

  const handleBuildingClick = (buildingId: string) => {
    const building = buildingsData.find((b) => b.id === buildingId);
    if (!building || !building.isBuilt) return;

    // Map building types to their menu functions
    switch (building.buildingType) {
      case "drone_bay":
        setShowDroneHangar(true);
        break;
      case "power_generator":
      case "fusion_reactor":
      case "antimatter_core":
        setShowPowerManagement(true);
        break;
      case "research_bay":
        setShowResearchBay(true);
        break;
      case "shipyard":
        setShowShipyard(true);
        break;
      case "combat_simulator":
        setShowBattle(true);
        break;
      case "scanner":
        setShowStarMap(true);
        break;
      case "rift_scanner":
        setShowRiftScanner(true);
        break;
      case "array_bay":
        setShowArrayBay(true);
        break;
      default:
        // For other buildings, show building detail menu
        setSelectedBuilding(buildingId);
        break;
    }
  };

  const handleCollectResource = async (buildingId: string) => {
    await collectResourceMutation.mutateAsync(buildingId);
  };

  const buildingsData = buildings.map(b => ({
    ...b,
    id: b.buildingType,
    position: { x: b.positionX, y: b.positionY },
    icon: b.buildingType === "command" ? "🏢" : b.buildingType === "mine" ? "⛏️" : b.buildingType === "scanner" ? "📡" : b.buildingType === "crystal" ? "💎" : b.buildingType === "rift_scanner" ? "🌀" : b.buildingType === "array_bay" ? "🛸" : "🏭",
    description: b.buildingType === "command" ? "Command Center" : b.buildingType === "mine" ? "Ore Mine" : b.buildingType === "scanner" ? "Scanner Array" : b.buildingType === "crystal" ? "Crystal Synthesizer" : b.buildingType === "rift_scanner" ? "Rift Scanner" : b.buildingType === "array_bay" ? "Array Bay" : "Building",
    resourceType: (b.resourceType === "metal" || b.resourceType === "crystals") ? b.resourceType as "metal" | "crystal" : undefined,
    currentStorage: b.currentStorage || undefined,
    maxStorage: b.maxStorage || undefined,
  }));

  const selectedBuildingData = buildingsData.find((b) => b.id === selectedBuilding);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-card border-b border-card-border z-10">
        <div className="flex items-center gap-6">
          <h1 className="font-orbitron font-bold text-xl">
            <span className="text-primary">SPACE</span> BASE
          </h1>
          {player.name && (
            <span className="text-sm text-muted-foreground">Commander {player.name}</span>
          )}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border border-border">
              <span className="text-xl">💰</span>
              <span className="font-orbitron font-semibold text-sm tabular-nums" data-testid="text-credits">
                {Math.floor(player.gold)}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border border-border">
              <span className="text-xl">🔧</span>
              <span className="font-orbitron font-semibold text-sm tabular-nums" data-testid="text-metal">
                {Math.floor(player.metal)}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border border-border">
              <span className="text-xl">💎</span>
              <span className="font-orbitron font-semibold text-sm tabular-nums" data-testid="text-crystals">
                {Math.floor(player.crystals)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tutorialStep === "complete" && (
            <Button 
              variant="default" 
              onClick={() => setShowResourceConsole(true)}
              data-testid="button-resource-console"
            >
              <Activity className="w-5 h-5 mr-2" />
              Console
            </Button>
          )}
          <Button 
            variant="outline" 
            size="icon" 
            data-testid="button-logout"
            onClick={() => window.location.href = "/api/logout"}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Space Station View */}
      <div className="flex-1 relative">
        <SpaceStation
          buildings={buildingsData}
          onHubClick={handleHubClick}
          onBuildingClick={handleBuildingClick}
          onCollectResource={handleCollectResource}
          placementMode={placementMode !== null}
          availablePositions={availablePositions}
          onPositionSelect={handlePositionSelect}
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
          playerCredits={player.gold}
          playerMetal={player.metal}
          playerCrystals={player.crystals}
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
          currentProduction={selectedBuildingData.productionRate || undefined}
          maxStorage={selectedBuildingData.maxStorage || undefined}
          currentStorage={Math.floor(selectedBuildingData.currentStorage || 0)}
          resourceType={selectedBuildingData.resourceType as "metal" | "crystal" | undefined}
          onOpenStarMap={selectedBuildingData.buildingType === "scanner" ? () => setShowStarMap(true) : undefined}
          onOpenRiftScanner={selectedBuildingData.buildingType === "rift_scanner" ? () => setShowRiftScanner(true) : undefined}
          onOpenArrayBay={selectedBuildingData.buildingType === "array_bay" ? () => setShowArrayBay(true) : undefined}
        />
      )}

      {/* Star Map */}
      <StarMap
        open={showStarMap}
        onOpenChange={setShowStarMap}
        scannerLevel={buildings.find(b => b.buildingType === "scanner" && b.isBuilt)?.level || 0}
      />

      {/* Drone Hangar */}
      <DroneHangar
        open={showDroneHangar}
        onOpenChange={setShowDroneHangar}
      />

      {/* Resource Console */}
      <ResourceConsole
        open={showResourceConsole}
        onOpenChange={setShowResourceConsole}
      />

      {/* Rift Scanner Dialog */}
      {showRiftScanner && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="flex justify-end mb-2">
              <Button variant="ghost" size="icon" onClick={() => setShowRiftScanner(false)} data-testid="button-close-rift-scanner">
                ✕
              </Button>
            </div>
            <RiftScanner />
          </div>
        </div>
      )}

      {/* Array Bay Dialog */}
      {showArrayBay && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="flex justify-end mb-2">
              <Button variant="ghost" size="icon" onClick={() => setShowArrayBay(false)} data-testid="button-close-array-bay">
                ✕
              </Button>
            </div>
            <ArrayBay />
          </div>
        </div>
      )}

      {/* Power Management */}
      <PowerManagement
        open={showPowerManagement}
        onOpenChange={setShowPowerManagement}
      />

      {/* Research Bay Dialog */}
      {showResearchBay && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-end mb-2">
              <Button variant="ghost" size="icon" onClick={() => setShowResearchBay(false)} data-testid="button-close-research-bay">
                ✕
              </Button>
            </div>
            <ResearchBay />
          </div>
        </div>
      )}

      {/* Shipyard Dialog */}
      {showShipyard && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-end mb-2">
              <Button variant="ghost" size="icon" onClick={() => setShowShipyard(false)} data-testid="button-close-shipyard">
                ✕
              </Button>
            </div>
            <Shipyard />
          </div>
        </div>
      )}

      {/* Battle Arena Dialog */}
      {showBattle && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-end mb-2">
              <Button variant="ghost" size="icon" onClick={() => setShowBattle(false)} data-testid="button-close-battle">
                ✕
              </Button>
            </div>
            <BattleArena />
          </div>
        </div>
      )}
    </div>
  );
}
