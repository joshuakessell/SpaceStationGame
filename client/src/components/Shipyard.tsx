import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { SHIP_CHASSIS } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Ship } from "@shared/schema";

export function Shipyard() {
  const { toast } = useToast();
  
  const { data: ships = [], isLoading } = useQuery<Ship[]>({
    queryKey: ["/api/ships"],
  });
  
  const buildMutation = useMutation({
    mutationFn: async (chassisId: string) => {
      return apiRequest("POST", "/api/ships/build", { chassisId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ships"] });
      queryClient.invalidateQueries({ queryKey: ["/api/player"] });
      toast({ title: "Ship constructed!" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to build ship", description: error.message, variant: "destructive" });
    },
  });
  
  const assignMutation = useMutation({
    mutationFn: async ({ shipId, fleetRole }: { shipId: string; fleetRole: string }) => {
      return apiRequest("PATCH", `/api/ships/${shipId}/assign`, { fleetRole });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ships"] });
      toast({ title: "Fleet assignment updated" });
    },
  });
  
  if (isLoading) return <div className="p-4 text-center text-muted-foreground">Loading ships...</div>;
  
  const fleetGroups = {
    offense: ships.filter(s => s.fleetRole === "offense"),
    defense: ships.filter(s => s.fleetRole === "defense"),
    reserve: ships.filter(s => s.fleetRole === "reserve"),
  };
  
  return (
    <div className="space-y-6" data-testid="shipyard">
      <Card>
        <CardHeader>
          <CardTitle>Ship Construction</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SHIP_CHASSIS.map(chassis => (
            <div key={chassis.id} className="border border-border rounded-md p-4 space-y-2">
              <div className="font-semibold">{chassis.name}</div>
              <div className="text-sm text-muted-foreground">{chassis.description}</div>
              <div className="text-sm">
                Hull: {chassis.baseStats.maxHull} | Shields: {chassis.baseStats.maxShields} | 
                Damage: {chassis.baseStats.weaponDamage} | Speed: {chassis.baseStats.speed}
              </div>
              <div className="text-sm">
                Cost: 🔧{chassis.cost.metal} 💎{chassis.cost.crystals} 💰{chassis.cost.credits}
              </div>
              <Button
                onClick={() => buildMutation.mutate(chassis.id)}
                disabled={buildMutation.isPending}
                data-testid={`button-build-${chassis.id}`}
              >
                Build Ship
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
      
      {["offense", "defense", "reserve"].map(role => (
        <Card key={role} data-testid={`fleet-${role}`}>
          <CardHeader>
            <CardTitle className="capitalize">{role} Fleet ({fleetGroups[role as keyof typeof fleetGroups].length} ships)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {fleetGroups[role as keyof typeof fleetGroups].map(ship => {
              const chassis = SHIP_CHASSIS.find(c => c.id === ship.chassisId);
              if (!chassis) return null;
              
              return (
                <div key={ship.id} className="border border-border rounded-md p-3 flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{ship.name || chassis.name}</div>
                    <div className="text-sm">Hull: {ship.currentHull} | Shields: {ship.currentShields}</div>
                  </div>
                  <div className="flex gap-2">
                    {role !== "offense" && (
                      <Button
                        size="sm"
                        onClick={() => assignMutation.mutate({ shipId: ship.id, fleetRole: "offense" })}
                        data-testid={`button-assign-${ship.id}-offense`}
                      >
                        → Offense
                      </Button>
                    )}
                    {role !== "defense" && (
                      <Button
                        size="sm"
                        onClick={() => assignMutation.mutate({ shipId: ship.id, fleetRole: "defense" })}
                        data-testid={`button-assign-${ship.id}-defense`}
                      >
                        → Defense
                      </Button>
                    )}
                    {role !== "reserve" && (
                      <Button
                        size="sm"
                        onClick={() => assignMutation.mutate({ shipId: ship.id, fleetRole: "reserve" })}
                        data-testid={`button-assign-${ship.id}-reserve`}
                      >
                        → Reserve
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {fleetGroups[role as keyof typeof fleetGroups].length === 0 && (
              <div className="text-sm text-muted-foreground">No ships assigned</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
