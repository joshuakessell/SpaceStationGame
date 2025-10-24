import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Rocket, Zap, TrendingUp, Clock } from "lucide-react";
import type { Drone, Mission } from "@shared/schema";
import { getEffectiveDroneStats } from "@shared/schema";

interface ResourceConsoleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ResourceConsole({ open, onOpenChange }: ResourceConsoleProps) {
  const { data: drones = [], isLoading: dronesLoading } = useQuery<Drone[]>({
    queryKey: ["/api/drones"],
    enabled: open,
    refetchInterval: open ? 2000 : false, // Poll every 2 seconds when open
  });

  const { data: missions = [], isLoading: missionsLoading } = useQuery<Mission[]>({
    queryKey: ["/api/missions"],
    enabled: open,
    refetchInterval: open ? 2000 : false, // Poll every 2 seconds when open
  });

  const activeMissions = missions.filter(
    (m) => m.status === "traveling" || m.status === "mining" || m.status === "returning"
  );

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "traveling":
        return <Rocket className="h-3 w-3" />;
      case "mining":
        return <Zap className="h-3 w-3" />;
      case "returning":
        return <TrendingUp className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getMissionProgress = (mission: Mission) => {
    const now = Date.now();
    
    if (mission.status === "traveling" && mission.arrivalAt) {
      const start = new Date(mission.startedAt).getTime();
      const end = new Date(mission.arrivalAt).getTime();
      const progress = ((now - start) / (end - start)) * 100;
      return Math.min(100, Math.max(0, progress));
    } else if (mission.status === "mining" && mission.arrivalAt && mission.completesAt) {
      const start = new Date(mission.arrivalAt).getTime();
      const end = new Date(mission.completesAt).getTime();
      const progress = ((now - start) / (end - start)) * 100;
      return Math.min(100, Math.max(0, progress));
    } else if (mission.status === "returning" && mission.completesAt && mission.returnAt) {
      const start = new Date(mission.completesAt).getTime();
      const end = new Date(mission.returnAt).getTime();
      const progress = ((now - start) / (end - start)) * 100;
      return Math.min(100, Math.max(0, progress));
    }
    
    return 0;
  };

  const getTimeRemaining = (mission: Mission) => {
    const now = Date.now();
    let targetTime: number | null = null;

    if (mission.status === "traveling" && mission.arrivalAt) {
      targetTime = new Date(mission.arrivalAt).getTime();
    } else if (mission.status === "mining" && mission.completesAt) {
      targetTime = new Date(mission.completesAt).getTime();
    } else if (mission.status === "returning" && mission.returnAt) {
      targetTime = new Date(mission.returnAt).getTime();
    }

    if (!targetTime) return "Unknown";

    const remaining = Math.max(0, targetTime - now);
    const seconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Calculate iron flow rate (resources per minute)
  const calculateFlowRate = () => {
    let totalHarvestRate = 0;
    
    activeMissions.forEach(mission => {
      if (mission.status === "mining") {
        const drone = drones.find(d => d.id === mission.droneId);
        if (drone) {
          const effectiveStats = getEffectiveDroneStats(drone);
          totalHarvestRate += effectiveStats.harvestRate;
        }
      }
    });
    
    return Math.floor(totalHarvestRate);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resource Console</DialogTitle>
          <DialogDescription>
            Monitor active mining operations and resource flow rates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active Drones</CardDescription>
                <CardTitle className="text-2xl">
                  {drones.filter(d => d.status !== "idle").length}/{drones.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active Missions</CardDescription>
                <CardTitle className="text-2xl">{activeMissions.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Iron Flow Rate</CardDescription>
                <CardTitle className="text-2xl">{calculateFlowRate()}/min</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Active Missions */}
          <Card>
            <CardHeader>
              <CardTitle>Active Mining Operations</CardTitle>
              <CardDescription>
                Real-time status of all mining missions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dronesLoading || missionsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : activeMissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active missions. Assign drones from the Star Map.
                </div>
              ) : (
                <div className="space-y-4">
                  {activeMissions.map((mission) => {
                    const drone = drones.find(d => d.id === mission.droneId);
                    if (!drone) return null;

                    return (
                      <div
                        key={mission.id}
                        className="border rounded-lg p-4 space-y-3"
                        data-testid={`mission-card-${mission.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(mission.status)}
                              <span className="font-medium">{drone.droneName}</span>
                            </div>
                            <Badge variant={getStatusColor(mission.status)} data-testid={`badge-status-${mission.id}`}>
                              {mission.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getTimeRemaining(mission)}
                          </div>
                        </div>

                        <Progress 
                          value={getMissionProgress(mission)} 
                          className="h-2"
                          data-testid={`progress-${mission.id}`}
                        />

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Tier:</span>{" "}
                            <span className="font-medium">Mk{drone.tier}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cargo:</span>{" "}
                            <span className="font-medium">{Math.floor(getEffectiveDroneStats(drone).cargoCapacity)} Iron</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Harvest:</span>{" "}
                            <span className="font-medium">{Math.floor(getEffectiveDroneStats(drone).harvestRate)}/min</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Idle Drones */}
          <Card>
            <CardHeader>
              <CardTitle>Idle Drones</CardTitle>
              <CardDescription>
                Drones ready for deployment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dronesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : drones.filter(d => d.status === "idle").length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  All drones are currently deployed
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {drones
                    .filter(d => d.status === "idle")
                    .map((drone) => (
                      <div
                        key={drone.id}
                        className="border rounded-lg p-3"
                        data-testid={`idle-drone-${drone.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{drone.droneName}</span>
                          <Badge variant="secondary">Idle</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Mk{drone.tier} • {Math.floor(getEffectiveDroneStats(drone).cargoCapacity)} cargo • {Math.floor(getEffectiveDroneStats(drone).harvestRate)}/min
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
