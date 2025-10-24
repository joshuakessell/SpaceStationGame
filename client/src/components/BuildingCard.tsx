import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Coins, Wrench, Clock, Zap } from "lucide-react";

export interface BuildingCardProps {
  name: string;
  level: number;
  icon: string;
  description: string;
  upgradeCredits?: number;
  upgradeMetal?: number;
  upgradeTime?: number;
  isUpgrading?: boolean;
  upgradeProgress?: number;
  canUpgrade?: boolean;
  currentProduction?: number;
  maxStorage?: number;
  onUpgrade?: () => void;
  onCollect?: () => void;
  availableToCollect?: number;
}

export default function BuildingCard({
  name,
  level,
  icon,
  description,
  upgradeCredits = 0,
  upgradeMetal = 0,
  upgradeTime = 0,
  isUpgrading = false,
  upgradeProgress = 0,
  canUpgrade = true,
  currentProduction = 0,
  maxStorage = 0,
  onUpgrade,
  onCollect,
  availableToCollect = 0,
}: BuildingCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  return (
    <Card 
      className="overflow-visible hover-elevate transition-all"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`card-building-${name.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="font-orbitron text-lg">{name}</CardTitle>
            <Badge variant="secondary" className="mt-1">
              Level {level}
            </Badge>
          </div>
          <div 
            className={`w-16 h-16 rounded-lg flex items-center justify-center text-4xl transition-transform ${
              isHovered ? "scale-110" : "scale-100"
            }`}
            style={{ 
              background: `linear-gradient(135deg, ${icon === "🏢" ? "#8b5cf6" : icon === "⛏️" ? "#0ea5e9" : "#f59e0b"} 0%, ${icon === "🏢" ? "#6d28d9" : icon === "⛏️" ? "#0284c7" : "#d97706"} 100%)`,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}
          >
            {icon}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        
        {currentProduction > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Storage</span>
              <span className="font-semibold font-mono">{availableToCollect}/{maxStorage}</span>
            </div>
            <Progress value={(availableToCollect / maxStorage) * 100} className="h-2" />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="w-3 h-3" />
              <span>{currentProduction}/min</span>
            </div>
          </div>
        )}

        {isUpgrading && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Upgrading...</span>
              <span className="font-semibold">{upgradeProgress}%</span>
            </div>
            <Progress value={upgradeProgress} className="h-2" />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {availableToCollect > 0 && onCollect && (
          <Button 
            onClick={onCollect}
            className="w-full"
            variant="secondary"
            data-testid={`button-collect-${name.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <Zap className="w-4 h-4 mr-2" />
            Collect {availableToCollect}
          </Button>
        )}
        
        {!isUpgrading && onUpgrade && (
          <div className="w-full space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {upgradeCredits > 0 && (
                <div className="flex items-center gap-1">
                  <Coins className="w-3 h-3 text-accent" />
                  <span className="font-semibold">{upgradeCredits}</span>
                </div>
              )}
              {upgradeMetal > 0 && (
                <div className="flex items-center gap-1">
                  <Wrench className="w-3 h-3 text-secondary" />
                  <span className="font-semibold">{upgradeMetal}</span>
                </div>
              )}
              {upgradeTime > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(upgradeTime)}</span>
                </div>
              )}
            </div>
            <Button 
              onClick={onUpgrade}
              disabled={!canUpgrade}
              className="w-full"
              data-testid={`button-upgrade-${name.toLowerCase().replace(/\s+/g, "-")}`}
            >
              Upgrade to Level {level + 1}
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
