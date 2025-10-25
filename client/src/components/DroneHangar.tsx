import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Rocket, Coins, Wrench, Gem, Plus, Zap, Package, TrendingUp, ArrowUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Drone, Player } from "@shared/schema";
import { DRONE_UPGRADE_CONFIG, getEffectiveDroneStats, droneTiers } from "@shared/schema";

interface DroneHangarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DroneHangar({ open, onOpenChange }: DroneHangarProps) {
  const [showBuildForm, setShowBuildForm] = useState(false);
  const [droneName, setDroneName] = useState("");
  const [selectedTier, setSelectedTier] = useState("1");
  const { toast } = useToast();

  const { data: drones = [], isLoading } = useQuery<Drone[]>({
    queryKey: ["/api/drones"],
    enabled: open,
    refetchInterval: open ? 2000 : false, // Poll for upgrade progress updates
  });

  const { data: player } = useQuery<Player>({
    queryKey: ["/api/player"],
    enabled: open,
    refetchInterval: open ? 2000 : false, // Poll for resource updates when dialog is open
  });

  const upgradeDroneMutation = useMutation({
    mutationFn: async ({ droneId, type }: { droneId: string; type: "speed" | "cargo" | "harvest" }) => {
      return await apiRequest("POST", `/api/drones/${droneId}/upgrade`, { type });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/drones"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/player"] }),
      ]);
      toast({
        title: "Upgrade Started",
        description: "Your drone upgrade is in progress!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upgrade Failed",
        description: error.message || "Failed to start upgrade",
        variant: "destructive",
      });
    },
  });

  const buildDroneMutation = useMutation({
    mutationFn: async (data: { droneName: string; tier: number }) => {
      return await apiRequest("POST", "/api/drones", data);
    },
    onSuccess: async () => {
      // Close form immediately to prevent double-submission
      setShowBuildForm(false);
      setDroneName("");
      setSelectedTier("1");
      
      // Wait for queries to refetch before showing success
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/drones"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/player"] }),
      ]);
      
      toast({
        title: "Drone Built",
        description: "Your new mining drone is ready for deployment!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Build Failed",
        description: error.message || "Failed to build drone",
        variant: "destructive",
      });
    },
  });

  const droneCosts = {
    1: { gold: 100, metal: 50, crystals: 0 },
    2: { gold: 300, metal: 150, crystals: 25 },
    3: { gold: 600, metal: 300, crystals: 75 },
  };

  const droneStats = {
    1: { speed: 10, cargo: 50, harvest: 10 },
    2: { speed: 15, cargo: 100, harvest: 20 },
    3: { speed: 25, cargo: 200, harvest: 40 },
  };

  const handleBuildDrone = () => {
    if (!droneName.trim()) {
      toast({
        title: "Invalid Name",
        description: "Please enter a name for your drone",
        variant: "destructive",
      });
      return;
    }

    buildDroneMutation.mutate({
      droneName: droneName.trim(),
      tier: parseInt(selectedTier),
    });
  };

  const tier = parseInt(selectedTier) as 1 | 2 | 3;
  const cost = droneCosts[tier];
  const stats = droneStats[tier];
  const canAfford = player ? (
    player.gold >= cost.gold && 
    player.metal >= cost.metal && 
    player.crystals >= cost.crystals
  ) : false;
  const atCapacity = player ? drones.length >= player.maxDrones : false;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "idle":
        return "secondary";
      case "traveling":
        return "default";
      case "mining":
        return "default";
      case "returning":
        return "default";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "idle":
        return "Idle";
      case "traveling":
        return "Traveling";
      case "mining":
        return "Mining";
      case "returning":
        return "Returning";
      default:
        return status;
    }
  };

  const calculateUpgradeCost = (upgradeType: "speed" | "cargo" | "harvest", currentLevel: number) => {
    const baseCost = DRONE_UPGRADE_CONFIG.baseCosts[upgradeType];
    const multiplier = Math.pow(DRONE_UPGRADE_CONFIG.costMultiplier, currentLevel);
    return {
      metal: Math.floor(baseCost.metal * multiplier),
      gold: Math.floor(baseCost.gold * multiplier),
    };
  };

  const getUpgradeProgress = (drone: Drone) => {
    if (!drone.upgradingType || !drone.upgradeCompletesAt) return null;
    
    const now = Date.now();
    const started = drone.upgradeStartedAt ? new Date(drone.upgradeStartedAt).getTime() : now;
    const completes = new Date(drone.upgradeCompletesAt).getTime();
    const total = completes - started;
    const elapsed = now - started;
    const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
    
    return {
      progress,
      type: drone.upgradingType,
      remaining: Math.max(0, Math.ceil((completes - now) / 1000)),
    };
  };

  const handleUpgrade = (droneId: string, type: "speed" | "cargo" | "harvest") => {
    upgradeDroneMutation.mutate({ droneId, type });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-drone-hangar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-orbitron text-xl">
            <Rocket className="w-6 h-6 text-primary" />
            Drone Hangar
          </DialogTitle>
          <DialogDescription>
            Build and manage your mining drone fleet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Build Drone Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Build New Drone</CardTitle>
                  <CardDescription>Construct a mining drone to extract resources from asteroid clusters</CardDescription>
                </div>
                {player && (
                  <Badge variant={atCapacity ? "destructive" : "secondary"} data-testid="badge-drone-capacity">
                    {drones.length}/{player.maxDrones}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!showBuildForm ? (
                <Button 
                  onClick={() => setShowBuildForm(true)} 
                  disabled={atCapacity}
                  className="w-full"
                  data-testid="button-show-build-form"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {atCapacity ? `Maximum Capacity Reached (${player?.maxDrones})` : "Build Mining Drone"}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="drone-name">Drone Name</Label>
                    <Input
                      id="drone-name"
                      placeholder="Enter drone name..."
                      value={droneName}
                      onChange={(e) => setDroneName(e.target.value)}
                      data-testid="input-drone-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="drone-tier">Drone Tier</Label>
                    <Select value={selectedTier} onValueChange={setSelectedTier}>
                      <SelectTrigger id="drone-tier" data-testid="select-drone-tier">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Mk1 - Basic</SelectItem>
                        <SelectItem value="2">Mk2 - Advanced</SelectItem>
                        <SelectItem value="3">Mk3 - Elite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Card className="bg-background/50">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Stats</div>
                          <div className="text-sm space-y-1">
                            <div>Speed: {stats.speed} km/s</div>
                            <div>Cargo: {stats.cargo} units</div>
                            <div>Harvest: {stats.harvest}/min</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Cost</div>
                          <div className="flex flex-wrap gap-2">
                            <div className="flex items-center gap-1 text-sm">
                              <Coins className="w-3 h-3 text-accent" />
                              <span>{cost.gold}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <Wrench className="w-3 h-3 text-secondary" />
                              <span>{cost.metal}</span>
                            </div>
                            {cost.crystals > 0 && (
                              <div className="flex items-center gap-1 text-sm">
                                <Gem className="w-3 h-3 text-primary" />
                                <span>{cost.crystals}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleBuildDrone}
                      disabled={!canAfford || buildDroneMutation.isPending || atCapacity}
                      className="flex-1"
                      data-testid="button-build-drone"
                    >
                      {buildDroneMutation.isPending 
                        ? "Building..." 
                        : atCapacity 
                        ? "At Maximum Capacity"
                        : canAfford 
                        ? "Build Drone" 
                        : "Insufficient Resources"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowBuildForm(false);
                        setDroneName("");
                        setSelectedTier("1");
                      }}
                      data-testid="button-cancel-build"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Drone Fleet */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Your Fleet ({drones.length})</h3>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading drones...</div>
            ) : drones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No drones yet. Build your first mining drone to start extracting resources!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {drones.map((drone) => {
                  const effectiveStats = getEffectiveDroneStats(drone);
                  const maxLevel = DRONE_UPGRADE_CONFIG.maxLevelPerTier[drone.tier];
                  const upgradeProgress = getUpgradeProgress(drone);
                  
                  const upgradeTypes: Array<{ type: "speed" | "cargo" | "harvest"; icon: any; label: string; levelKey: keyof Drone }> = [
                    { type: "speed", icon: Zap, label: "Speed", levelKey: "speedLevel" },
                    { type: "cargo", icon: Package, label: "Cargo", levelKey: "cargoLevel" },
                    { type: "harvest", icon: TrendingUp, label: "Harvest", levelKey: "harvestLevel" },
                  ];
                  
                  return (
                    <Card key={drone.id} data-testid={`card-drone-${drone.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">{drone.droneName}</CardTitle>
                            <CardDescription>Mk{drone.tier} Mining Drone</CardDescription>
                          </div>
                          <Badge variant={getStatusColor(drone.status)} data-testid={`badge-status-${drone.id}`}>
                            {getStatusLabel(drone.status)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Current Stats */}
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <div className="text-muted-foreground text-xs">Speed</div>
                            <div className="font-semibold" data-testid={`text-speed-${drone.id}`}>
                              {effectiveStats.speed.toFixed(1)} km/s
                            </div>
                            {drone.speedLevel > 0 && (
                              <div className="text-xs text-green-600">+{(drone.speedLevel * DRONE_UPGRADE_CONFIG.bonusPerLevel * 100).toFixed(0)}%</div>
                            )}
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">Cargo</div>
                            <div className="font-semibold" data-testid={`text-cargo-${drone.id}`}>
                              {Math.floor(effectiveStats.cargoCapacity)}
                            </div>
                            {drone.cargoLevel > 0 && (
                              <div className="text-xs text-green-600">+{(drone.cargoLevel * DRONE_UPGRADE_CONFIG.bonusPerLevel * 100).toFixed(0)}%</div>
                            )}
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">Harvest</div>
                            <div className="font-semibold" data-testid={`text-harvest-${drone.id}`}>
                              {Math.floor(effectiveStats.harvestRate)}/min
                            </div>
                            {drone.harvestLevel > 0 && (
                              <div className="text-xs text-green-600">+{(drone.harvestLevel * DRONE_UPGRADE_CONFIG.bonusPerLevel * 100).toFixed(0)}%</div>
                            )}
                          </div>
                        </div>

                        {/* Upgrade Progress (if upgrading) */}
                        {upgradeProgress && (
                          <div className="space-y-1" data-testid={`upgrade-progress-${drone.id}`}>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                Upgrading {upgradeProgress.type}...
                              </span>
                              <span className="font-mono">{upgradeProgress.remaining}s</span>
                            </div>
                            <Progress value={upgradeProgress.progress} className="h-2" />
                          </div>
                        )}

                        <Separator />

                        {/* Upgrade Controls */}
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-muted-foreground">Upgrades</div>
                          {upgradeTypes.map(({ type, icon: Icon, label, levelKey }) => {
                            const currentLevel = (drone[levelKey] as number) || 0;
                            const cost = calculateUpgradeCost(type, currentLevel);
                            const canAfford = player ? (player.metal >= cost.metal && player.gold >= cost.gold) : false;
                            const isMaxed = currentLevel >= maxLevel;
                            const canUpgrade = !isMaxed && drone.status === 'idle' && !drone.upgradingType && canAfford;
                            
                            return (
                              <div key={type} className="flex items-center gap-2">
                                <div className="flex items-center gap-1 flex-1">
                                  <Icon className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-xs">{label}</span>
                                  <Badge variant="outline" className="text-xs" data-testid={`badge-level-${type}-${drone.id}`}>
                                    Lv {currentLevel}/{maxLevel}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Wrench className="w-3 h-3" />
                                  {cost.metal}
                                  <Coins className="w-3 h-3 ml-1" />
                                  {cost.gold}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpgrade(drone.id, type)}
                                  disabled={!canUpgrade || upgradeDroneMutation.isPending}
                                  className="h-7 px-2"
                                  data-testid={`button-upgrade-${type}-${drone.id}`}
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
