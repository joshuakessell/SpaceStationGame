import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { RESEARCH_TREE } from "@shared/schema";
import type { ResearchProject, PlayerTechUnlock } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

export function ResearchBay() {
  const { toast } = useToast();
  
  const { data: activeResearch, isLoading: loadingActive } = useQuery<ResearchProject | null>({
    queryKey: ["/api/research/active"],
    refetchInterval: (query) => {
      return query.state.data ? 1000 : false;
    },
  });
  
  const { data: unlocks = [], isLoading: loadingUnlocks } = useQuery<PlayerTechUnlock[]>({
    queryKey: ["/api/research/unlocks"],
  });
  
  const { data: bonuses } = useQuery<any>({
    queryKey: ["/api/research/bonuses"],
  });
  
  const startMutation = useMutation({
    mutationFn: async (researchId: string) => {
      const res = await apiRequest("POST", "/api/research/start", { researchId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/research/unlocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/research/bonuses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/player"] });
      toast({ title: "Research started!" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to start research", description: error.message, variant: "destructive" });
    },
  });
  
  const cancelMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const res = await apiRequest("POST", `/api/research/cancel/${projectId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/research/unlocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/research/bonuses"] });
      toast({ title: "Research cancelled" });
    },
  });
  
  const getResearchProgress = (research: ResearchProject) => {
    const startTime = new Date(research.startedAt).getTime();
    const endTime = new Date(research.completesAt).getTime();
    const now = Date.now();
    
    const elapsed = now - startTime;
    const total = endTime - startTime;
    
    return Math.min(100, (elapsed / total) * 100);
  };
  
  const canResearch = (techId: string) => {
    const tech = RESEARCH_TREE.find(t => t.id === techId);
    if (!tech) return false;
    
    if (unlocks.some(u => u.researchId === techId)) return false;
    
    if (activeResearch) return false;
    
    const unlockedIds = new Set(unlocks.map(u => u.researchId));
    return tech.prerequisites.every(prereqId => unlockedIds.has(prereqId));
  };
  
  const categories = {
    mining: RESEARCH_TREE.filter(t => t.category === "mining"),
    ship: RESEARCH_TREE.filter(t => t.category === "ship"),
    science_lab: RESEARCH_TREE.filter(t => t.category === "science_lab"),
  };
  
  if (loadingActive || loadingUnlocks) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="research-bay">
        <div className="text-center">
          <div className="text-muted-foreground">Loading research data...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 p-6" data-testid="research-bay">
      {activeResearch && (
        <Card data-testid="active-research-card">
          <CardHeader>
            <CardTitle>Active Research</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const tech = RESEARCH_TREE.find(t => t.id === activeResearch.researchId);
              if (!tech) return null;
              
              const progress = getResearchProgress(activeResearch);
              
              return (
                <>
                  <div>
                    <div className="font-semibold" data-testid="active-research-name">{tech.name}</div>
                    <div className="text-sm text-muted-foreground">{tech.description}</div>
                  </div>
                  <Progress value={progress} data-testid="active-research-progress" />
                  <div className="text-sm text-muted-foreground">
                    {Math.floor(progress)}% complete
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => cancelMutation.mutate(activeResearch.id)}
                    disabled={cancelMutation.isPending}
                    data-testid="button-cancel-research"
                  >
                    Cancel Research
                  </Button>
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}
      
      {Object.entries(categories).map(([categoryName, techs]) => (
        <Card key={categoryName} data-testid={`category-${categoryName}`}>
          <CardHeader>
            <CardTitle className="capitalize">{categoryName.replace("_", " ")} Technologies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {techs.map(tech => {
              const isUnlocked = unlocks.some(u => u.researchId === tech.id);
              const canStart = canResearch(tech.id);
              
              return (
                <div
                  key={tech.id}
                  className="border rounded-md p-4 space-y-2"
                  data-testid={`tech-${tech.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">{tech.name}</div>
                    {isUnlocked && <Badge variant="default">Unlocked</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground">{tech.description}</div>
                  <div className="flex gap-4 text-sm">
                    {tech.cost.metal && <span>🔧 Metal: {tech.cost.metal}</span>}
                    {tech.cost.crystals && <span>💎 Crystals: {tech.cost.crystals}</span>}
                    {tech.cost.gold && <span>💰 Credits: {tech.cost.gold}</span>}
                    <span>⏱️ Duration: {tech.duration}s</span>
                  </div>
                  {tech.prerequisites.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Requires: {tech.prerequisites.join(", ")}
                    </div>
                  )}
                  {!isUnlocked && (
                    <Button
                      onClick={() => startMutation.mutate(tech.id)}
                      disabled={!canStart || startMutation.isPending}
                      data-testid={`button-research-${tech.id}`}
                    >
                      {!canStart && activeResearch ? "Research in progress" : !canStart ? "Prerequisites not met" : "Start Research"}
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
