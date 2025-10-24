import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Battle } from "@shared/schema";

export function BattleArena() {
  const { toast } = useToast();
  
  const { data: battles = [] } = useQuery<Battle[]>({
    queryKey: ["/api/battles"],
  });
  
  const startBattleMutation = useMutation({
    mutationFn: async (difficulty: string) => {
      const res = await apiRequest("POST", "/api/battles/start", { difficulty });
      return res.json();
    },
    onSuccess: (battle: Battle) => {
      queryClient.invalidateQueries({ queryKey: ["/api/battles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ships"] });
      queryClient.invalidateQueries({ queryKey: ["/api/player"] });
      
      if (battle.status === "victory") {
        toast({ title: "Victory!", description: "Rewards have been granted" });
      } else {
        toast({ title: "Defeat", description: "Your fleet was destroyed", variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Battle failed", description: error.message, variant: "destructive" });
    },
  });
  
  return (
    <div className="space-y-6" data-testid="battle-arena">
      <Card>
        <CardHeader>
          <CardTitle>Start Battle</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button
            onClick={() => startBattleMutation.mutate("easy")}
            disabled={startBattleMutation.isPending}
            data-testid="button-battle-easy"
          >
            Easy (200🔧 50💎 100💰)
          </Button>
          <Button
            onClick={() => startBattleMutation.mutate("medium")}
            disabled={startBattleMutation.isPending}
            data-testid="button-battle-medium"
          >
            Medium (400🔧 100💎 200💰)
          </Button>
          <Button
            onClick={() => startBattleMutation.mutate("hard")}
            disabled={startBattleMutation.isPending}
            data-testid="button-battle-hard"
          >
            Hard (800🔧 200💎 400💰)
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Battle History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {battles.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              No battles yet. Start a battle to see your combat history!
            </div>
          )}
          {battles.map(battle => {
            const log = (battle.battleLog || []) as any[];
            const rewards = (battle.rewards || {}) as any;
            
            return (
              <div key={battle.id} className="border border-border rounded-md p-4 space-y-2" data-testid={`battle-${battle.id}`}>
                <div className="flex justify-between items-center">
                  <div className="font-semibold">
                    Battle - {battle.status === "victory" ? "✅ Victory" : "❌ Defeat"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(battle.startedAt).toLocaleString()}
                  </div>
                </div>
                {battle.status === "victory" && (
                  <div className="text-sm">
                    Rewards: 🔧{rewards.metal} 💎{rewards.crystals} 💰{rewards.credits}
                  </div>
                )}
                <details className="text-sm">
                  <summary className="cursor-pointer">View Battle Log ({log.length} turns)</summary>
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {log.slice(0, 20).map((event: any, i: number) => (
                      <div key={i} className="text-xs">
                        Turn {event.turn}: {event.attacker} → {event.target} ({event.damage} dmg)
                        {event.destroyed && " [DESTROYED]"}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
