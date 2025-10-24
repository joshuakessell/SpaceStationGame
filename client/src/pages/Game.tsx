import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import SpaceStation from "@/components/SpaceStation";
import TutorialDialog from "@/components/TutorialDialog";
import BuildMenu from "@/components/BuildMenu";
import BuildingDetailMenu from "@/components/BuildingDetailMenu";
import { Settings, Swords } from "lucide-react";
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
        credits: player.credits + 100,
        metal: player.metal + 50,
      });
    } else if (tutorialStep === "mine_building") {
      await updatePlayerMutation.mutateAsync({ 
        tutorialStep: "build_crystal",
        credits: player.credits + 150,
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

  const handleBuild = async (buildingId: string) => {
    const buildOptions = getBuildOptions();
    const option = buildOptions.find((o) => o.id === buildingId);
    if (!option) return;

    // Deduct costs
    await updatePlayerMutation.mutateAsync({
      credits: player.credits - (option.cost.credits || 0),
      metal: player.metal - (option.cost.metal || 0),
      crystals: player.crystals - (option.cost.crystals || 0),
    });

    // Determine position
    const positions = [
      { x: 50, y: 20 },
      { x: 20, y: 50 },
      { x: 80, y: 50 },
      { x: 50, y: 80 },
      { x: 30, y: 30 },
      { x: 70, y: 30 },
    ];

    await createBuildingMutation.mutateAsync({
      buildingType: buildingId,
      name: option.name,
      level: 1,
      positionX: positions[buildings.length]?.x || 50,
      positionY: positions[buildings.length]?.y || 20,
      isBuilt: false,
      isBuilding: true,
      currentStorage: 0,
      maxStorage: buildingId === "mine" ? 100 : buildingId === "crystal" ? 50 : null,
      productionRate: buildingId === "mine" ? 5 : buildingId === "crystal" ? 2 : null,
      resourceType: buildingId === "mine" ? "metal" : buildingId === "crystal" ? "crystals" : null,
      buildStartedAt: new Date(),
    });

    setShowBuildMenu(false);

    // Simulate building completion
    setTimeout(async () => {
      // Refetch buildings to get the newly created one
      await queryClient.refetchQueries({ queryKey: ["/api/buildings"] });
      const updatedBuildings = queryClient.getQueryData<Building[]>(["/api/buildings"]);
      const newBuilding = updatedBuildings?.find((b) => b.buildingType === buildingId && b.isBuilding);
      
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
  };

  const getBuildOptions = () => {
    const hasCommand = buildings.some((b) => b.buildingType === "command" && b.isBuilt);
    const hasMine = buildings.some((b) => b.buildingType === "mine" && b.isBuilt);

    return [
      {
        id: "command",
        name: "Command Center",
        icon: "🏢",
        description: "The nerve center of your station. Required for all operations.",
        cost: { credits: 50, metal: 25, crystals: 0 },
        buildTime: 5,
        available: !buildings.some((b) => b.buildingType === "command"),
      },
      {
        id: "mine",
        name: "Ore Mine",
        icon: "⛏️",
        description: "Extracts metal from nearby asteroids automatically.",
        cost: { credits: 100, metal: 50, crystals: 0 },
        buildTime: 8,
        available: hasCommand && !buildings.some((b) => b.buildingType === "mine"),
        reason: !hasCommand ? "Requires Command Center" : undefined,
      },
      {
        id: "crystal",
        name: "Crystal Synthesizer",
        icon: "💎",
        description: "Generates rare crystals for advanced research.",
        cost: { credits: 150, metal: 75, crystals: 0 },
        buildTime: 10,
        available: hasMine && !buildings.some((b) => b.buildingType === "crystal"),
        reason: !hasMine ? "Requires Ore Mine" : undefined,
      },
    ].filter((o) => !buildings.some((b) => b.buildingType === o.id && b.isBuilt));
  };

  const handleBuildingClick = (buildingId: string) => {
    if (tutorialStep !== "complete") return;
    setSelectedBuilding(buildingId);
  };

  const handleCollectResource = async (buildingId: string) => {
    await collectResourceMutation.mutateAsync(buildingId);
  };

  const buildingsData = buildings.map(b => ({
    ...b,
    id: b.buildingType,
    position: { x: b.positionX, y: b.positionY },
    icon: b.buildingType === "command" ? "🏢" : b.buildingType === "mine" ? "⛏️" : "💎",
    description: b.buildingType === "command" ? "Command Center" : b.buildingType === "mine" ? "Ore Mine" : "Crystal Synthesizer",
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
                {Math.floor(player.credits)}
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
            <Button variant="default" data-testid="button-battle">
              <Swords className="w-5 h-5 mr-2" />
              Battle
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
          playerCredits={player.credits}
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
        />
      )}
    </div>
  );
}
