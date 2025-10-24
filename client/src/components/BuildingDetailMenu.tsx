import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Coins, Wrench, Gem, X, Zap, MapPin } from "lucide-react";

interface BuildingDetailMenuProps {
  name: string;
  level: number;
  icon: string;
  description: string;
  onClose: () => void;
  onUpgrade?: () => void;
  canUpgrade?: boolean;
  upgradeCost?: {
    credits?: number;
    metal?: number;
    crystals?: number;
  };
  upgradeTime?: number;
  currentProduction?: number;
  maxStorage?: number;
  currentStorage?: number;
  resourceType?: "metal" | "crystal";
  onOpenStarMap?: () => void;
  onOpenRiftScanner?: () => void;
  onOpenArrayBay?: () => void;
}

export default function BuildingDetailMenu({
  name,
  level,
  icon,
  description,
  onClose,
  onUpgrade,
  canUpgrade = false,
  upgradeCost,
  upgradeTime,
  currentProduction,
  maxStorage,
  currentStorage = 0,
  resourceType,
  onOpenStarMap,
  onOpenRiftScanner,
  onOpenArrayBay,
}: BuildingDetailMenuProps) {
  return (
    <Card className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 bg-card/95 backdrop-blur" data-testid="building-detail-menu">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div 
              className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl shrink-0"
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
              }}
            >
              {icon}
            </div>
            <div>
              <CardTitle className="font-orbitron text-lg">{name}</CardTitle>
              <Badge variant="secondary" className="mt-1">Level {level}</Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-detail">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>

        {currentProduction !== undefined && maxStorage !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Resource Storage</span>
              <span className="font-semibold font-mono">
                {currentStorage}/{maxStorage}
              </span>
            </div>
            <Progress value={(currentStorage / maxStorage) * 100} className="h-2" />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="w-3 h-3" />
              <span>Produces {currentProduction} {resourceType}/min</span>
            </div>
          </div>
        )}

        {onUpgrade && upgradeCost && (
          <div className="pt-4 border-t border-border">
            <h4 className="font-semibold text-sm mb-3">Upgrade to Level {level + 1}</h4>
            <div className="flex flex-wrap items-center gap-3 text-sm mb-3">
              {upgradeCost.credits !== undefined && (
                <div className="flex items-center gap-1">
                  <Coins className="w-4 h-4 text-accent" />
                  <span className="font-semibold">{upgradeCost.credits}</span>
                </div>
              )}
              {upgradeCost.metal !== undefined && (
                <div className="flex items-center gap-1">
                  <Wrench className="w-4 h-4 text-secondary" />
                  <span className="font-semibold">{upgradeCost.metal}</span>
                </div>
              )}
              {upgradeCost.crystals !== undefined && (
                <div className="flex items-center gap-1">
                  <Gem className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{upgradeCost.crystals}</span>
                </div>
              )}
              {upgradeTime && <span className="text-muted-foreground">• {upgradeTime}s</span>}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        {onOpenStarMap && (
          <Button
            onClick={onOpenStarMap}
            variant="outline"
            className="flex-1"
            data-testid="button-open-star-map"
          >
            <MapPin className="mr-2 h-4 w-4" />
            Open Star Map
          </Button>
        )}
        {onOpenRiftScanner && (
          <Button
            onClick={onOpenRiftScanner}
            variant="outline"
            className="flex-1"
            data-testid="button-open-rift-scanner"
          >
            <Zap className="mr-2 h-4 w-4" />
            Open Scanner
          </Button>
        )}
        {onOpenArrayBay && (
          <Button
            onClick={onOpenArrayBay}
            variant="outline"
            className="flex-1"
            data-testid="button-open-array-bay"
          >
            <Zap className="mr-2 h-4 w-4" />
            Manage Arrays
          </Button>
        )}
        {onUpgrade && (
          <Button
            onClick={onUpgrade}
            disabled={!canUpgrade}
            className="flex-1"
            data-testid="button-upgrade-building"
          >
            {canUpgrade ? `Upgrade to Level ${level + 1}` : "Insufficient Resources"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
