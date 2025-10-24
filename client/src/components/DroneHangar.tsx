import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Rocket, Coins, Wrench, Gem, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Drone, Player } from "@shared/schema";

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
  });

  const { data: player } = useQuery<Player>({
    queryKey: ["/api/player"],
    enabled: open,
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
    1: { credits: 100, metal: 50, crystals: 0 },
    2: { credits: 300, metal: 150, crystals: 25 },
    3: { credits: 600, metal: 300, crystals: 75 },
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
    player.credits >= cost.credits && 
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
                              <span>{cost.credits}</span>
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
                {drones.map((drone) => (
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
                    <CardContent>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-muted-foreground text-xs">Speed</div>
                          <div className="font-semibold">{drone.travelSpeed} km/s</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs">Cargo</div>
                          <div className="font-semibold">{drone.cargoCapacity}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs">Harvest</div>
                          <div className="font-semibold">{drone.harvestRate}/min</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
