import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Scan, Activity, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Player, Building, ResourceNode } from "@shared/schema";

export function RiftScanner() {
  const { toast } = useToast();

  const { data: player } = useQuery<Player>({
    queryKey: ['/api/player'],
  });

  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ['/api/buildings'],
  });

  const { data: resourceNodes = [] } = useQuery<ResourceNode[]>({
    queryKey: ['/api/resource-nodes'],
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/buildings/rift-scanner/scan');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/resource-nodes'] });
      toast({
        title: "Rift Detected",
        description: "A new crystal rift has been discovered!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Scan Failed",
        description: error.message || "Unable to scan for rifts",
        variant: "destructive",
      });
    }
  });

  const riftScanner = buildings.find(
    (b: any) => b.buildingType === 'rift_scanner' && b.isBuilt
  );

  if (!riftScanner) {
    return (
      <Card data-testid="card-rift-scanner-not-built">
        <CardHeader>
          <CardTitle>Rift Scanner</CardTitle>
          <CardDescription>Build a Rift Scanner to detect crystal rifts</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const rifts = resourceNodes.filter((n: any) => n.nodeType === 'crystal_rift' && !n.isDepleted);
  const scannerLevel = riftScanner.level;
  const maxRifts = scannerLevel === 1 ? 2 : scannerLevel === 2 ? 4 : 6;
  const canScan = rifts.length < maxRifts;

  return (
    <Card data-testid="card-rift-scanner">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Rift Scanner
              <Badge variant="outline" data-testid="badge-scanner-level">
                Level {scannerLevel}
              </Badge>
            </CardTitle>
            <CardDescription>
              Detect unstable dimensional rifts rich in crystals
            </CardDescription>
          </div>
          <Button
            onClick={() => scanMutation.mutate()}
            disabled={!canScan || scanMutation.isPending}
            data-testid="button-scan-rifts"
          >
            <Scan className="w-4 h-4 mr-2" />
            {scanMutation.isPending ? 'Scanning...' : 'Scan'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm" data-testid="text-rift-capacity">
          <span className="text-muted-foreground">Detected Rifts</span>
          <span className="font-medium">{rifts.length} / {maxRifts}</span>
        </div>

        <div className="space-y-2">
          {rifts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-rifts">
              No rifts detected. Start scanning to discover crystal rifts.
            </div>
          ) : (
            rifts.map((rift: any) => {
              const stabilityPercent = (rift.stability / rift.maxStability) * 100;
              const isLowStability = stabilityPercent < 20;

              return (
                <Card key={rift.id} data-testid={`card-rift-${rift.id}`} className="hover-elevate">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className={`w-4 h-4 ${isLowStability ? 'text-destructive' : 'text-primary'}`} />
                          <span className="font-medium" data-testid={`text-rift-name-${rift.id}`}>
                            {rift.nodeName}
                          </span>
                          <Badge variant="outline" data-testid={`badge-distance-${rift.id}`}>
                            {rift.distanceClass}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground" data-testid={`text-richness-${rift.id}`}>
                          {rift.richnessCrystalPerTick} ⚡/tick
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Stability</span>
                          <span 
                            className={isLowStability ? 'text-destructive font-medium' : ''}
                            data-testid={`text-stability-${rift.id}`}
                          >
                            {Math.round(rift.stability)} / {Math.round(rift.maxStability)}
                            {isLowStability && ' ⚠️'}
                          </span>
                        </div>
                        <Progress 
                          value={stabilityPercent} 
                          className="h-2"
                          data-testid={`progress-stability-${rift.id}`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span data-testid={`text-volatility-${rift.id}`}>
                          Volatility: {Number(rift.volatilityModifier).toFixed(2)}x
                        </span>
                        {isLowStability && (
                          <span className="text-destructive font-medium" data-testid={`text-collapse-warning-${rift.id}`}>
                            Collapse Imminent!
                          </span>
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
