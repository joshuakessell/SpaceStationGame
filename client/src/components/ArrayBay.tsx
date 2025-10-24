import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Satellite, Plus, ArrowUpCircle, Loader2, Radio, Zap, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Player, Building, ExtractionArray, ResourceNode } from "@shared/schema";

const ARRAY_TIERS = [
  { id: 1, name: "Mk1 Array", baseExtraction: 2, buildCost: { metal: 200, credits: 100 } },
  { id: 2, name: "Mk2 Array", baseExtraction: 5, buildCost: { metal: 500, credits: 250 } },
  { id: 3, name: "Mk3 Array", baseExtraction: 10, buildCost: { metal: 1000, credits: 500 } },
];

const UPGRADE_CONFIG = {
  baseCosts: {
    uplink: { metal: 100, credits: 50 },
    beam: { metal: 80, credits: 40 },
    telemetry: { metal: 60, credits: 30 },
  },
  costMultiplier: 1.5,
  upgradeDuration: 60,
};

export function ArrayBay() {
  const { toast } = useToast();
  const [selectedTier, setSelectedTier] = useState(1);
  const [buildDialogOpen, setBuildDialogOpen] = useState(false);

  const { data: player } = useQuery<Player>({
    queryKey: ['/api/player'],
  });

  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ['/api/buildings'],
  });

  const { data: arrays = [] } = useQuery<ExtractionArray[]>({
    queryKey: ['/api/extraction-arrays'],
  });

  const { data: resourceNodes = [] } = useQuery<ResourceNode[]>({
    queryKey: ['/api/resource-nodes'],
  });

  const buildMutation = useMutation({
    mutationFn: async (tier: number) => {
      return await apiRequest('POST', '/api/extraction-arrays/build', { tier });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/extraction-arrays'] });
      queryClient.invalidateQueries({ queryKey: ['/api/player'] });
      setBuildDialogOpen(false);
      toast({
        title: "Array Constructed",
        description: "Extraction array is ready for deployment",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Construction Failed",
        description: error.message || "Unable to build array",
        variant: "destructive",
      });
    }
  });

  const deployMutation = useMutation({
    mutationFn: async ({ arrayId, riftId }: { arrayId: string; riftId: string }) => {
      return await apiRequest('POST', `/api/extraction-arrays/${arrayId}/deploy`, { riftId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/extraction-arrays'] });
      toast({
        title: "Array Deployed",
        description: "Extraction array is now siphoning crystals",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Deployment Failed",
        description: error.message || "Unable to deploy array",
        variant: "destructive",
      });
    }
  });

  const recallMutation = useMutation({
    mutationFn: async (arrayId: string) => {
      return await apiRequest('POST', `/api/extraction-arrays/${arrayId}/recall`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/extraction-arrays'] });
      toast({
        title: "Array Recalled",
        description: "Extraction array has returned to the bay",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Recall Failed",
        description: error.message || "Unable to recall array",
        variant: "destructive",
      });
    }
  });

  const upgradeMutation = useMutation({
    mutationFn: async ({ arrayId, type }: { arrayId: string; type: string }) => {
      return await apiRequest('POST', `/api/extraction-arrays/${arrayId}/upgrade`, { type });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/extraction-arrays'] });
      queryClient.invalidateQueries({ queryKey: ['/api/player'] });
      toast({
        title: "Upgrade Started",
        description: "Array upgrade in progress",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upgrade Failed",
        description: error.message || "Unable to upgrade array",
        variant: "destructive",
      });
    }
  });

  const arrayBay = buildings.find(
    (b: any) => b.buildingType === 'array_bay' && b.isBuilt
  );

  if (!arrayBay) {
    return (
      <Card data-testid="card-array-bay-not-built">
        <CardHeader>
          <CardTitle>Array Bay</CardTitle>
          <CardDescription>Build an Array Bay to construct extraction arrays</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const maxArrays = player?.maxExtractionArrays || 2;
  const canBuild = arrays.length < maxArrays;
  const selectedTierConfig = ARRAY_TIERS.find(t => t.id === selectedTier)!;
  const activeRifts = resourceNodes.filter((n: any) => n.nodeType === 'crystal_rift' && !n.isDepleted);

  return (
    <Card data-testid="card-array-bay">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Satellite className="w-5 h-5" />
              Array Bay
              <Badge variant="outline" data-testid="badge-bay-level">
                Level {arrayBay.level}
              </Badge>
            </CardTitle>
            <CardDescription>
              Construct and manage crystal extraction arrays
            </CardDescription>
          </div>
          <Dialog open={buildDialogOpen} onOpenChange={setBuildDialogOpen}>
            <DialogTrigger asChild>
              <Button
                disabled={!canBuild}
                data-testid="button-build-array"
              >
                <Plus className="w-4 h-4 mr-2" />
                Build Array
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-build-array">
              <DialogHeader>
                <DialogTitle>Build Extraction Array</DialogTitle>
                <DialogDescription>
                  Select an array tier to construct
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <RadioGroup value={selectedTier.toString()} onValueChange={(v) => setSelectedTier(Number(v))}>
                  {ARRAY_TIERS.map(tier => (
                    <div key={tier.id} className="flex items-center space-x-2" data-testid={`radio-tier-${tier.id}`}>
                      <RadioGroupItem value={tier.id.toString()} id={`tier-${tier.id}`} />
                      <Label htmlFor={`tier-${tier.id}`} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{tier.name}</span>
                          <Badge variant="outline">{tier.baseExtraction} ⚡/tick</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Cost: {tier.buildCost.metal} Metal, {tier.buildCost.credits} Credits
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                <Button
                  onClick={() => buildMutation.mutate(selectedTier)}
                  disabled={buildMutation.isPending || (player && (player.metal < selectedTierConfig.buildCost.metal || player.credits < selectedTierConfig.buildCost.credits))}
                  className="w-full"
                  data-testid="button-confirm-build"
                >
                  {buildMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Build {selectedTierConfig.name}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm" data-testid="text-array-capacity">
          <span className="text-muted-foreground">Array Capacity</span>
          <span className="font-medium">{arrays.length} / {maxArrays}</span>
        </div>

        <div className="space-y-2">
          {arrays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-arrays">
              No arrays constructed. Build your first extraction array.
            </div>
          ) : (
            arrays.map((array: any) => {
              const tierConfig = ARRAY_TIERS.find(t => t.id === array.tier)!;
              const rift = array.targetRiftId ? resourceNodes.find((n: any) => n.id === array.targetRiftId) : null;
              const isUpgrading = array.upgradingType !== null;
              const baseRate = tierConfig.baseExtraction;
              const uplinkBonus = array.uplinkLevel * 0.1;
              const effectiveRate = Math.round(baseRate * (1 + uplinkBonus));

              return (
                <Card key={array.id} data-testid={`card-array-${array.id}`} className="hover-elevate">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Satellite className="w-4 h-4" />
                          <span className="font-medium" data-testid={`text-array-name-${array.id}`}>
                            {array.arrayName}
                          </span>
                          <Badge variant="outline" data-testid={`badge-tier-${array.id}`}>
                            {tierConfig.name}
                          </Badge>
                        </div>
                        <Badge
                          variant={array.status === 'deployed' ? 'default' : array.status === 'decommissioned' ? 'destructive' : 'secondary'}
                          data-testid={`badge-status-${array.id}`}
                        >
                          {array.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <Radio className="w-3 h-3" />
                          <span data-testid={`text-uplink-${array.id}`}>Uplink L{array.uplinkLevel}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          <span data-testid={`text-beam-${array.id}`}>Beam L{array.beamLevel}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span data-testid={`text-telemetry-${array.id}`}>Scan L{array.telemetryLevel}</span>
                        </div>
                      </div>

                      {isUpgrading && array.upgradeCompletesAt && (
                        <div className="space-y-1" data-testid={`upgrade-progress-${array.id}`}>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Upgrading {array.upgradingType}...</span>
                            <span>{new Date(array.upgradeCompletesAt).toLocaleTimeString()}</span>
                          </div>
                          <Progress value={50} className="h-1" />
                        </div>
                      )}

                      {array.status === 'deployed' && rift && (
                        <div className="text-xs text-muted-foreground" data-testid={`text-deployed-location-${array.id}`}>
                          Deployed to: {rift.nodeName} ({effectiveRate} ⚡/tick)
                        </div>
                      )}

                      <div className="flex gap-2">
                        {array.status === 'idle' && activeRifts.length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const rift = activeRifts[0];
                              if (rift) {
                                deployMutation.mutate({ arrayId: array.id, riftId: rift.id });
                              }
                            }}
                            disabled={deployMutation.isPending}
                            data-testid={`button-deploy-${array.id}`}
                          >
                            Deploy
                          </Button>
                        )}
                        {array.status === 'deployed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => recallMutation.mutate(array.id)}
                            disabled={recallMutation.isPending}
                            data-testid={`button-recall-${array.id}`}
                          >
                            Recall
                          </Button>
                        )}
                        {!isUpgrading && array.status !== 'decommissioned' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => upgradeMutation.mutate({ arrayId: array.id, type: 'uplink' })}
                              disabled={upgradeMutation.isPending}
                              data-testid={`button-upgrade-uplink-${array.id}`}
                            >
                              <ArrowUpCircle className="w-3 h-3 mr-1" />
                              Uplink
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => upgradeMutation.mutate({ arrayId: array.id, type: 'beam' })}
                              disabled={upgradeMutation.isPending}
                              data-testid={`button-upgrade-beam-${array.id}`}
                            >
                              <ArrowUpCircle className="w-3 h-3 mr-1" />
                              Beam
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
