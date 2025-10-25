import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, Zap, Users, Wrench } from "lucide-react";

export default function Landing() {
  const isDevMode = import.meta.env.MODE === "development";
  
  const handleLogin = () => {
    window.location.href = "/api/login";
  };
  
  const handleDevLogin = () => {
    window.location.href = "/api/dev-login";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Orbitron' }}>
            Space Base Showdown
          </h1>
          <Button onClick={handleLogin} data-testid="button-login">
            Log In
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-4" style={{ fontFamily: 'Orbitron' }}>
            Build Your Space Empire
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Command your space station, gather resources, and expand across the stars
          </p>
          <div className="flex gap-4 justify-center items-center">
            <Button size="lg" onClick={handleLogin} data-testid="button-start">
              Start Your Journey
            </Button>
            {isDevMode && (
              <Button 
                size="lg" 
                variant="outline" 
                onClick={handleDevLogin} 
                data-testid="button-dev-login"
                className="gap-2"
              >
                <Wrench className="w-4 h-4" />
                Play as Dev
              </Button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <Rocket className="w-10 h-10 mb-2 text-primary" />
              <CardTitle>Base Building</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Construct buildings around your command hub and watch your space station grow
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="w-10 h-10 mb-2 text-primary" />
              <CardTitle>Real-Time Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Resources accumulate even when you're offline - return to collect your bounty
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="w-10 h-10 mb-2 text-primary" />
              <CardTitle>Multi-Device</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Your progress syncs across all devices - play anywhere, anytime
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
