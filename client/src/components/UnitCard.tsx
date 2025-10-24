import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Swords, Shield, Heart, Zap } from "lucide-react";

export interface UnitCardProps {
  name: string;
  type: "melee" | "ranged" | "tank";
  level: number;
  health: number;
  maxHealth: number;
  damage: number;
  count: number;
  icon: string;
  description: string;
  onTrain?: () => void;
  onDeploy?: () => void;
  canTrain?: boolean;
  isDeployed?: boolean;
}

export default function UnitCard({
  name,
  type,
  level,
  health,
  maxHealth,
  damage,
  count,
  icon,
  description,
  onTrain,
  onDeploy,
  canTrain = true,
  isDeployed = false,
}: UnitCardProps) {
  const typeColors = {
    melee: "from-red-500 to-red-700",
    ranged: "from-blue-500 to-blue-700",
    tank: "from-green-500 to-green-700",
  };

  const typeLabels = {
    melee: "Melee",
    ranged: "Ranged",
    tank: "Tank",
  };

  return (
    <Card 
      className={`overflow-visible hover-elevate ${isDeployed ? "ring-2 ring-primary" : ""}`}
      data-testid={`card-unit-${name.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="font-orbitron text-base">{name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {typeLabels[type]}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Lvl {level}
              </Badge>
            </div>
          </div>
          <div 
            className={`w-14 h-14 rounded-lg flex items-center justify-center text-3xl bg-gradient-to-br ${typeColors[type]}`}
            style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
          >
            {icon}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Heart className="w-3 h-3" />
              <span>Health</span>
            </div>
            <span className="font-semibold font-mono">{health}/{maxHealth}</span>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Swords className="w-3 h-3" />
              <span>Damage</span>
            </div>
            <span className="font-semibold font-mono">{damage}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Shield className="w-3 h-3" />
              <span>Owned</span>
            </div>
            <span className="font-semibold font-mono">{count}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        {onTrain && (
          <Button 
            onClick={onTrain}
            disabled={!canTrain}
            variant="outline"
            size="sm"
            className="flex-1"
            data-testid={`button-train-${name.toLowerCase().replace(/\s+/g, "-")}`}
          >
            Train
          </Button>
        )}
        {onDeploy && (
          <Button 
            onClick={onDeploy}
            disabled={count === 0}
            size="sm"
            className="flex-1"
            variant={isDeployed ? "secondary" : "default"}
            data-testid={`button-deploy-${name.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {isDeployed ? "Deployed" : "Deploy"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
