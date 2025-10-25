import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Zap, Lock, CheckCircle, Clock, ArrowUp, Coins, Wrench, Gem } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Player } from "@shared/schema";
import { POWER_MODULE_TIERS } from "@shared/schema";

interface PowerManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PowerBudget {
  generation: number;
  consumption: number;
  available: number;
}

interface UnlockInfo {
  currentLevel: number;
  unlockedTiers: number[];
  nextLevelCost: {
    level: number;
    metal: number;
    crystals: number;
    gold: number;
  } | null;
}

interface PowerModule {
  id: string;
  moduleName: string;
  powerTier: number;
  powerOutput: number;
  isBuilt: boolean;
  isPowered: boolean;
  buildStartedAt: string | null;
  upgradeCompletesAt: string | null;
}

export default function PowerManagement({ open, onOpenChange }: PowerManagementProps) {
  const { toast } = useToast();
  const [showBuildForm, setShowBuildForm] = useState(false);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [moduleName, setModuleName] = useState("");

  // Fetch power budget
  const { data: powerBudget, isLoading: budgetLoading } = useQuery<PowerBudget>({
    queryKey: ["/api/power-budget"],
    enabled: open,
    refetchInterval: open ? 2000 : false,
  });

  // Fetch player data
  const { data: player } = useQuery<Player>({
    queryKey: ["/api/player"],
    enabled: open,
    refetchInterval: open ? 2000 : false,
  });

  // Fetch unlock info
  const { data: unlockInfo, isLoading: unlockLoading } = useQuery<UnlockInfo>({
    queryKey: ["/api/central-hub/unlock-info"],
    enabled: open,
    refetchInterval: open ? 2000 : false,
  });

  // Fetch power modules
  const { data: powerModules = [], isLoading: modulesLoading } = useQuery<PowerModule[]>({
    queryKey: ["/api/power-modules"],
    enabled: open,
    refetchInterval: open ? 2000 : false,
  });

  // Upgrade central hub mutation
  const upgradeCentralHubMutation = useMutation({
    mutationFn: async (targetLevel: number) => {
      return await apiRequest("POST", "/api/central-hub/upgrade", { targetLevel });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/player"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/central-hub/unlock-info"] }),
      ]);
      toast({
        title: "Upgrade Started",
        description: "Central Hub upgrade in progress!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upgrade Failed",
        description: error.message || "Failed to upgrade Central Hub",
        variant: "destructive",
      });
    },
  });

  // Build power module mutation
  const buildPowerModuleMutation = useMutation({
    mutationFn: async (data: { tier: number; name: string; positionX: number; positionY: number }) => {
      return await apiRequest("POST", "/api/power-modules/build", data);
    },
    onSuccess: async () => {
      setShowBuildForm(false);
      setSelectedTier(null);
      setModuleName("");
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/power-modules"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/power-budget"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/player"] }),
      ]);
      
      toast({
        title: "Construction Started",
        description: "Power module construction in progress!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Build Failed",
        description: error.message || "Failed to build power module",
        variant: "destructive",
      });
    },
  });

  const handleUpgradeHub = () => {
    if (!unlockInfo?.nextLevelCost) return;
    upgradeCentralHubMutation.mutate(unlockInfo.nextLevelCost.level);
  };

  const handleBuildModule = () => {
    if (!selectedTier || !moduleName.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a name for your power module",
        variant: "destructive",
      });
      return;
    }

    // Generate random position (this could be enhanced with actual placement UI)
    const positionX = Math.random() * 500;
    const positionY = Math.random() * 500;

    buildPowerModuleMutation.mutate({
      tier: selectedTier,
      name: moduleName.trim(),
      positionX,
      positionY,
    });
  };

  const canAffordHub = () => {
    if (!player || !unlockInfo?.nextLevelCost) return false;
    const cost = unlockInfo.nextLevelCost;
    return (
      player.metal >= cost.metal &&
      player.crystals >= cost.crystals &&
      player.gold >= cost.gold
    );
  };

  const canAffordModule = (tier: number) => {
    if (!player) return false;
    const tierConfig = POWER_MODULE_TIERS.find(t => t.tier === tier);
    if (!tierConfig) return false;
    const cost = tierConfig.buildCost;
    return (
      player.metal >= (cost.metal || 0) &&
      player.crystals >= ('crystals' in cost ? cost.crystals : 0)
    );
  };

  const isModuleUnlocked = (tier: number) => {
    return unlockInfo?.unlockedTiers.includes(tier) || false;
  };

  const getBuildProgress = (module: PowerModule) => {
    if (module.isBuilt || !module.buildStartedAt || !module.upgradeCompletesAt) return null;
    
    const now = Date.now();
    const started = new Date(module.buildStartedAt).getTime();
    const completes = new Date(module.upgradeCompletesAt).getTime();
    const total = completes - started;
    const elapsed = now - started;
    const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
    const remaining = Math.max(0, Math.ceil((completes - now) / 1000));
    
    return { progress, remaining };
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" data-testid="dialog-power-management">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-orbitron text-xl">
            <Zap className="w-6 h-6 text-primary" />
            Power Management
          </DialogTitle>
          <DialogDescription>
            Manage your station's power generation and consumption
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Power Budget Display */}
          <Card>
            <CardHeader>
              <CardTitle>Power Budget</CardTitle>
              <CardDescription>Current power generation and consumption</CardDescription>
            </CardHeader>
            <CardContent>
              {budgetLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading...</div>
              ) : powerBudget ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Generation</div>
                      <div className="text-2xl font-bold text-green-500" data-testid="text-power-generation">
                        {powerBudget.generation}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Consumption</div>
                      <div className="text-2xl font-bold" data-testid="text-power-consumption">
                        {powerBudget.consumption}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Available</div>
                      <div 
                        className={`text-2xl font-bold ${powerBudget.available >= 0 ? 'text-green-500' : 'text-red-500'}`}
                        data-testid="text-power-available"
                      >
                        {powerBudget.available}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Usage</span>
                      <span data-testid="text-power-usage-percent">
                        {powerBudget.generation > 0 
                          ? Math.round((powerBudget.consumption / powerBudget.generation) * 100) 
                          : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={powerBudget.generation > 0 
                        ? Math.min(100, (powerBudget.consumption / powerBudget.generation) * 100) 
                        : 0}
                      className={powerBudget.available >= 0 ? '' : '[&>div]:bg-red-500'}
                      data-testid="progress-power-usage"
                    />
                    {powerBudget.available < 0 && (
                      <p className="text-sm text-red-500" data-testid="text-power-deficit-warning">
                        ⚠️ Power deficit! Some modules may be unpowered.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Central Hub Upgrade */}
          <Card>
            <CardHeader>
              <CardTitle>Central Hub</CardTitle>
              <CardDescription>Upgrade your hub to unlock advanced power modules</CardDescription>
            </CardHeader>
            <CardContent>
              {unlockLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading...</div>
              ) : unlockInfo ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Current Level</div>
                      <div className="text-3xl font-bold" data-testid="text-hub-level">
                        {unlockInfo.currentLevel}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Unlocked Tiers</div>
                      <div className="flex gap-1 mt-1">
                        {unlockInfo.unlockedTiers.map(tier => (
                          <Badge key={tier} variant="default" data-testid={`badge-unlocked-tier-${tier}`}>
                            T{tier}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {unlockInfo.nextLevelCost ? (
                    <div className="space-y-3">
                      <div className="text-sm font-medium">
                        Upgrade to Level {unlockInfo.nextLevelCost.level}
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-1" data-testid="text-hub-upgrade-cost-metal">
                          <Wrench className="w-4 h-4" />
                          {unlockInfo.nextLevelCost.metal}
                        </div>
                        <div className="flex items-center gap-1" data-testid="text-hub-upgrade-cost-crystals">
                          <Gem className="w-4 h-4" />
                          {unlockInfo.nextLevelCost.crystals}
                        </div>
                        <div className="flex items-center gap-1" data-testid="text-hub-upgrade-cost-credits">
                          <Coins className="w-4 h-4" />
                          {unlockInfo.nextLevelCost.gold}
                        </div>
                      </div>
                      <Button
                        onClick={handleUpgradeHub}
                        disabled={!canAffordHub() || upgradeCentralHubMutation.isPending}
                        className="w-full"
                        data-testid="button-upgrade-hub"
                      >
                        <ArrowUp className="w-4 h-4 mr-2" />
                        {upgradeCentralHubMutation.isPending ? "Upgrading..." : "Upgrade Central Hub"}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground" data-testid="text-hub-max-level">
                      Maximum level reached
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Power Module Construction */}
          <Card>
            <CardHeader>
              <CardTitle>Power Module Construction</CardTitle>
              <CardDescription>Build power modules to increase energy generation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!showBuildForm ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {POWER_MODULE_TIERS.map((tier) => {
                        const unlocked = isModuleUnlocked(tier.tier);
                        const canAfford = canAffordModule(tier.tier);
                        
                        return (
                          <div
                            key={tier.tier}
                            className={`border rounded-lg p-4 ${!unlocked ? 'opacity-50' : ''}`}
                            data-testid={`card-power-tier-${tier.tier}`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {unlocked ? (
                                  <Zap className="w-5 h-5 text-primary" />
                                ) : (
                                  <Lock className="w-5 h-5 text-muted-foreground" data-testid={`icon-locked-tier-${tier.tier}`} />
                                )}
                                <h4 className="font-semibold">{tier.name}</h4>
                              </div>
                              <Badge variant="outline">Tier {tier.tier}</Badge>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                <span data-testid={`text-tier-${tier.tier}-power`}>
                                  +{tier.powerOutput} Power
                                </span>
                              </div>
                              
                              <div className="flex gap-2 text-muted-foreground">
                                {tier.buildCost.metal && (
                                  <div className="flex items-center gap-1" data-testid={`text-tier-${tier.tier}-cost-metal`}>
                                    <Wrench className="w-3 h-3" />
                                    {tier.buildCost.metal}
                                  </div>
                                )}
                                {'crystals' in tier.buildCost && tier.buildCost.crystals && (
                                  <div className="flex items-center gap-1" data-testid={`text-tier-${tier.tier}-cost-crystals`}>
                                    <Gem className="w-3 h-3" />
                                    {tier.buildCost.crystals}
                                  </div>
                                )}
                              </div>

                              {!unlocked && (
                                <div className="text-xs text-muted-foreground" data-testid={`text-tier-${tier.tier}-requirement`}>
                                  Requires Hub Level {tier.requiredHubLevel}
                                </div>
                              )}
                            </div>

                            <Button
                              onClick={() => {
                                setSelectedTier(tier.tier);
                                setShowBuildForm(true);
                              }}
                              disabled={!unlocked || !canAfford}
                              className="w-full mt-3"
                              size="sm"
                              data-testid={`button-build-tier-${tier.tier}`}
                            >
                              {!unlocked ? "Locked" : canAfford ? "Build" : "Insufficient Resources"}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">
                        Build {POWER_MODULE_TIERS.find(t => t.tier === selectedTier)?.name}
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowBuildForm(false);
                          setSelectedTier(null);
                          setModuleName("");
                        }}
                        data-testid="button-cancel-build"
                      >
                        Cancel
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="module-name">Module Name</Label>
                      <Input
                        id="module-name"
                        value={moduleName}
                        onChange={(e) => setModuleName(e.target.value)}
                        placeholder="Enter module name..."
                        data-testid="input-module-name"
                      />
                    </div>

                    <Button
                      onClick={handleBuildModule}
                      disabled={!moduleName.trim() || buildPowerModuleMutation.isPending}
                      className="w-full"
                      data-testid="button-confirm-build"
                    >
                      {buildPowerModuleMutation.isPending ? "Building..." : "Confirm Build"}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Power Modules */}
          <Card>
            <CardHeader>
              <CardTitle>Active Power Modules</CardTitle>
              <CardDescription>Your deployed power generation units</CardDescription>
            </CardHeader>
            <CardContent>
              {modulesLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading...</div>
              ) : powerModules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-modules">
                  No power modules built yet. Build your first module above!
                </div>
              ) : (
                <div className="space-y-3">
                  {powerModules.map((module) => {
                    const buildProgress = getBuildProgress(module);
                    const tierConfig = POWER_MODULE_TIERS.find(t => t.tier === module.powerTier);
                    
                    return (
                      <div
                        key={module.id}
                        className="border rounded-lg p-4"
                        data-testid={`module-card-${module.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 text-primary" />
                            <div>
                              <div className="font-semibold" data-testid={`text-module-${module.id}-name`}>
                                {module.moduleName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {tierConfig?.name || `Tier ${module.powerTier}`}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-500" data-testid={`text-module-${module.id}-output`}>
                                +{module.powerOutput}
                              </div>
                              <div className="text-xs text-muted-foreground">Power</div>
                            </div>
                            
                            {module.isBuilt ? (
                              <Badge 
                                variant={module.isPowered ? "default" : "secondary"}
                                data-testid={`badge-module-${module.id}-status`}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {module.isPowered ? "Active" : "Offline"}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" data-testid={`badge-module-${module.id}-building`}>
                                <Clock className="w-3 h-3 mr-1" />
                                Building
                              </Badge>
                            )}
                          </div>
                        </div>

                        {buildProgress && (
                          <div className="mt-3 space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Construction Progress</span>
                              <span data-testid={`text-module-${module.id}-remaining`}>
                                {formatTime(buildProgress.remaining)} remaining
                              </span>
                            </div>
                            <Progress 
                              value={buildProgress.progress}
                              data-testid={`progress-module-${module.id}-build`}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
