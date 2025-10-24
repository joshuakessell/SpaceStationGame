import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Coins, Wrench, Gem, X } from "lucide-react";

interface BuildOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  cost: {
    credits?: number;
    metal?: number;
    crystals?: number;
  };
  buildTime: number;
  available: boolean;
  reason?: string;
}

interface BuildMenuProps {
  options: BuildOption[];
  onBuild: (optionId: string) => void;
  onClose: () => void;
  playerCredits: number;
  playerMetal: number;
  playerCrystals: number;
}

export default function BuildMenu({
  options,
  onBuild,
  onClose,
  playerCredits,
  playerMetal,
  playerCrystals,
}: BuildMenuProps) {
  const canAfford = (option: BuildOption) => {
    const hasCredits = !option.cost.credits || playerCredits >= option.cost.credits;
    const hasMetal = !option.cost.metal || playerMetal >= option.cost.metal;
    const hasCrystals = !option.cost.crystals || playerCrystals >= option.cost.crystals;
    return hasCredits && hasMetal && hasCrystals && option.available;
  };

  return (
    <Card className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] z-50 bg-card/95 backdrop-blur" data-testid="build-menu">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="font-orbitron text-xl">Station Expansions</CardTitle>
            <CardDescription>Select a building to construct</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-menu">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>

      <ScrollArea className="max-h-[60vh]">
        <CardContent className="space-y-3">
          {options.map((option) => {
            const affordable = canAfford(option);
            
            return (
              <Card 
                key={option.id} 
                className={`overflow-visible ${!affordable ? "opacity-60" : ""}`}
                data-testid={`option-${option.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl shrink-0"
                      style={{
                        background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                        boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                      }}
                    >
                      {option.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="font-orbitron text-base">{option.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">{option.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {option.cost.credits !== undefined && (
                      <div className={`flex items-center gap-1 ${playerCredits < option.cost.credits ? "text-destructive" : ""}`}>
                        <Coins className="w-4 h-4" />
                        <span className="font-semibold">{option.cost.credits}</span>
                      </div>
                    )}
                    {option.cost.metal !== undefined && (
                      <div className={`flex items-center gap-1 ${playerMetal < option.cost.metal ? "text-destructive" : ""}`}>
                        <Wrench className="w-4 h-4" />
                        <span className="font-semibold">{option.cost.metal}</span>
                      </div>
                    )}
                    {option.cost.crystals !== undefined && (
                      <div className={`flex items-center gap-1 ${playerCrystals < option.cost.crystals ? "text-destructive" : ""}`}>
                        <Gem className="w-4 h-4" />
                        <span className="font-semibold">{option.cost.crystals}</span>
                      </div>
                    )}
                    <span className="text-muted-foreground">• {option.buildTime}s build</span>
                  </div>

                  {!option.available && option.reason && (
                    <p className="text-xs text-muted-foreground mt-2 italic">{option.reason}</p>
                  )}
                </CardContent>

                <CardFooter className="pt-3">
                  <Button
                    onClick={() => onBuild(option.id)}
                    disabled={!affordable}
                    className="w-full"
                    data-testid={`button-build-${option.id}`}
                  >
                    {affordable ? "Build" : "Insufficient Resources"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
