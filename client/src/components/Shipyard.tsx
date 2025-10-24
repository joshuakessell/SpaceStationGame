import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { SHIP_CHASSIS, EQUIPMENT_CATALOG } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Ship, Equipment } from "@shared/schema";

interface EquipmentWithSlot extends Equipment {
  shipId?: string;
  slot?: string;
}

export function Shipyard() {
  const { toast } = useToast();
  
  const { data: ships = [], isLoading } = useQuery<Ship[]>({
    queryKey: ["/api/ships"],
  });
  
  const { data: playerEquipment = [] } = useQuery<EquipmentWithSlot[]>({ 
    queryKey: ["/api/equipment"] 
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
  
  const craftMutation = useMutation({
    mutationFn: async (equipmentId: string) => {
      return apiRequest("POST", "/api/equipment/craft", { equipmentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/player"] });
      toast({ title: "Equipment crafted!" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to craft equipment", description: error.message, variant: "destructive" });
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
  
  const equipMutation = useMutation({
    mutationFn: async ({ shipId, equipmentId, slot }: { shipId: string; equipmentId: string; slot: string }) => {
      return apiRequest("POST", "/api/equipment/equip", { shipId, equipmentId, slot });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ships"] });
      toast({ title: "Equipment equipped!" });
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
          <CardTitle>Equipment Crafting</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          {EQUIPMENT_CATALOG.map(eq => (
            <div key={eq.id} className="border border-border rounded-md p-3 space-y-2">
              <div className="font-semibold">{eq.name}</div>
              <div className="text-sm">
                {eq.bonusDamage && eq.bonusDamage > 0 && `+${eq.bonusDamage} Damage `}
                {eq.bonusShields && eq.bonusShields > 0 && `+${eq.bonusShields} Shields `}
                {eq.bonusHull && eq.bonusHull > 0 && `+${eq.bonusHull} Hull`}
              </div>
              <div className="text-sm">Cost: 🔧{eq.cost.metal} 💎{eq.cost.crystals} 💰{eq.cost.credits}</div>
              <Button 
                size="sm" 
                onClick={() => craftMutation.mutate(eq.id)} 
                disabled={craftMutation.isPending}
                data-testid={`button-craft-${eq.id}`}
              >
                Craft
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

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
                <div key={ship.id} className="border border-border rounded-md p-3 space-y-3">
                  <div className="flex justify-between items-start">
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
                  
                  <div>
                    <div className="text-sm font-semibold mt-2">Equipment:</div>
                    <div className="flex gap-2 flex-wrap">
                      {["weapon", "defense", "utility"].map(slot => {
                        const equipped = playerEquipment.find(eq => 
                          eq.shipId === ship.id && eq.slot === slot && eq.isEquipped
                        );
                        
                        if (equipped) {
                          return (
                            <div key={slot} className="text-xs border border-border rounded px-2 py-1">
                              {slot}: {equipped.name}
                            </div>
                          );
                        }
                        
                        const availableItems = playerEquipment.filter(eq => 
                          !eq.shipId && 
                          (
                            (slot === "weapon" && eq.type === "weapon") ||
                            (slot === "defense" && (eq.type === "shield_booster" || eq.type === "hull_plating")) ||
                            (slot === "utility")
                          )
                        );
                        
                        if (availableItems.length === 0) {
                          return <div key={slot} className="text-xs text-muted-foreground">{slot}: empty</div>;
                        }
                        
                        return (
                          <select
                            key={slot}
                            className="text-xs border border-border rounded px-1 py-1"
                            onChange={(e) => {
                              if (e.target.value) {
                                equipMutation.mutate({
                                  shipId: ship.id,
                                  equipmentId: e.target.value,
                                  slot,
                                });
                              }
                            }}
                            data-testid={`select-equip-${ship.id}-${slot}`}
                          >
                            <option value="">Equip {slot}...</option>
                            {availableItems.map(item => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        );
                      })}
                    </div>
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
      
      <Card data-testid="equipment-inventory">
        <CardHeader>
          <CardTitle>Equipment Inventory ({playerEquipment.length} items)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {playerEquipment.map(eq => (
            <div key={eq.id} className="border border-border rounded-md p-2 space-y-1" data-testid={`equipment-item-${eq.id}`}>
              <div className="font-semibold text-sm">{eq.name}</div>
              <div className="text-xs">
                {eq.bonusDamage && eq.bonusDamage > 0 && `+${eq.bonusDamage} Dmg `}
                {eq.bonusShields && eq.bonusShields > 0 && `+${eq.bonusShields} Shields `}
                {eq.bonusHull && eq.bonusHull > 0 && `+${eq.bonusHull} Hull`}
              </div>
              <div className="text-xs text-muted-foreground">
                {eq.isEquipped ? `Equipped on ship` : "Available"}
              </div>
            </div>
          ))}
          {playerEquipment.length === 0 && (
            <div className="text-sm text-muted-foreground col-span-2">
              No equipment crafted yet. Craft equipment above to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
