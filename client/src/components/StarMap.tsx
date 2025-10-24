import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Radar, MapPin, Loader2, Zap } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ResourceNode } from "@shared/schema";

interface StarMapProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scannerLevel: number;
}

export function StarMap({ open, onOpenChange, scannerLevel }: StarMapProps) {
  const [selectedCluster, setSelectedCluster] = useState<ResourceNode | null>(null);

  // Fetch discovered resource nodes
  const { data: resourceNodes = [], isLoading } = useQuery<ResourceNode[]>({
    queryKey: ["/api/resource-nodes"],
    enabled: open,
  });

  // Scan for new clusters mutation
  const scanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/resource-nodes/scan");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resource-nodes"] });
    },
  });

  const asteroidClusters = resourceNodes.filter(node => node.nodeType === "asteroid_cluster");
  const discoveredClusters = asteroidClusters.filter(node => node.isDiscovered);
  const canScan = scannerLevel > 0;

  const getScannerCapacity = () => {
    switch (scannerLevel) {
      case 0:
        return { maxClusters: 0, ranges: [], showExact: false };
      case 1:
        return { maxClusters: 2, ranges: ["short"], showExact: false };
      case 2:
        return { maxClusters: 4, ranges: ["short", "mid"], showExact: false };
      case 3:
      default:
        return { maxClusters: 6, ranges: ["short", "mid", "deep"], showExact: true };
    }
  };

  const capacity = getScannerCapacity();

  const getDistanceColor = (distance: string) => {
    switch (distance) {
      case "short":
        return "text-green-500";
      case "mid":
        return "text-yellow-500";
      case "deep":
        return "text-orange-500";
      default:
        return "text-gray-500";
    }
  };

  const getYieldDisplay = (cluster: ResourceNode) => {
    if (capacity.showExact && cluster.remainingIron !== null) {
      return `${cluster.remainingIron} Iron`;
    }
    // Approximate yield tiers
    const remaining = cluster.remainingIron || 0;
    if (remaining >= 5000) return "High Yield";
    if (remaining >= 2000) return "Medium Yield";
    return "Low Yield";
  };

  const getDepletionStatus = (cluster: ResourceNode) => {
    if (cluster.totalIron === null || cluster.totalIron === undefined) return "unknown";
    if (cluster.remainingIron === null || cluster.remainingIron === undefined) return "unknown";
    if (cluster.remainingIron === 0) return "depleted";
    const percentage = (cluster.remainingIron / cluster.totalIron) * 100;
    if (percentage <= 20) return "depleting";
    return "available";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-star-map">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Star Map - Home System
          </DialogTitle>
          <DialogDescription>
            Scan for asteroid clusters and manage mining operations. Scanner Level {scannerLevel}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Scanner Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Radar className="h-4 w-4" />
                Scanner Array
              </CardTitle>
              <CardDescription>
                Detect asteroid clusters within scanner range
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Max Clusters</p>
                  <p className="font-medium">{discoveredClusters.length} / {capacity.maxClusters}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Scanner Range</p>
                  <p className="font-medium capitalize">{capacity.ranges.join(", ")}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => scanMutation.mutate()}
                disabled={!canScan || scanMutation.isPending || discoveredClusters.length >= capacity.maxClusters}
                className="w-full"
                data-testid="button-scan-clusters"
              >
                {scanMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Radar className="mr-2 h-4 w-4" />
                    Scan for Clusters
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Discovered Clusters */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Discovered Asteroid Clusters</h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : discoveredClusters.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No clusters discovered yet. Use the scanner to find asteroid clusters.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {discoveredClusters.map((cluster) => {
                  const depletionStatus = getDepletionStatus(cluster);
                  return (
                    <Card
                      key={cluster.id}
                      className={`cursor-pointer transition-colors ${
                        selectedCluster?.id === cluster.id ? "ring-2 ring-primary" : ""
                      } ${cluster.isDepleted ? "opacity-50" : ""}`}
                      onClick={() => setSelectedCluster(cluster)}
                      data-testid={`card-cluster-${cluster.id}`}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center justify-between gap-2">
                          <span className="truncate">{cluster.nodeName}</span>
                          {cluster.isDepleted && (
                            <Badge variant="destructive">Depleted</Badge>
                          )}
                          {depletionStatus === "depleting" && !cluster.isDepleted && (
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500">
                              Depleting
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <MapPin className={`h-3 w-3 ${getDistanceColor(cluster.distanceClass)}`} />
                          <span className="capitalize">{cluster.distanceClass} Range</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Yield:</span>
                          <span className="font-medium">{getYieldDisplay(cluster)}</span>
                        </div>
                        {capacity.showExact && cluster.totalIron && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Remaining:</span>
                            <span className="font-medium">
                              {Math.round(((cluster.remainingIron || 0) / cluster.totalIron) * 100)}%
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Cluster Details */}
          {selectedCluster && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-lg">{selectedCluster.nodeName}</CardTitle>
                <CardDescription>Cluster Details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Distance Class</p>
                    <p className="font-medium capitalize flex items-center gap-1">
                      <MapPin className={`h-3 w-3 ${getDistanceColor(selectedCluster.distanceClass)}`} />
                      {selectedCluster.distanceClass}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">
                      {selectedCluster.isDepleted ? "Depleted" : "Available"}
                    </p>
                  </div>
                  {capacity.showExact && (
                    <>
                      <div>
                        <p className="text-muted-foreground">Total Iron</p>
                        <p className="font-medium">{selectedCluster.totalIron || 0} units</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Remaining Iron</p>
                        <p className="font-medium">{selectedCluster.remainingIron || 0} units</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  disabled={selectedCluster.isDepleted}
                  className="w-full"
                  data-testid="button-assign-drone"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Assign Mining Drone
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
