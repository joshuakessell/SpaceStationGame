import { Coins, Wrench, Gem } from "lucide-react";

interface ResourceBarProps {
  gold: number;
  metal: number;
  crystals: number;
}

export default function ResourceBar({ credits, metal, crystals }: ResourceBarProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-card border-b border-card-border" data-testid="resource-bar">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border border-border">
        <Coins className="w-5 h-5 text-accent" />
        <span className="font-orbitron font-semibold text-sm tabular-nums" data-testid="text-credits">
          {formatNumber(credits)}
        </span>
      </div>
      
      <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border border-border">
        <Wrench className="w-5 h-5 text-secondary" />
        <span className="font-orbitron font-semibold text-sm tabular-nums" data-testid="text-metal">
          {formatNumber(metal)}
        </span>
      </div>
      
      <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border border-border">
        <Gem className="w-5 h-5 text-primary" />
        <span className="font-orbitron font-semibold text-sm tabular-nums" data-testid="text-crystals">
          {formatNumber(crystals)}
        </span>
      </div>
    </div>
  );
}
