import BuildMenu from "../BuildMenu";

export default function BuildMenuExample() {
  const options = [
    {
      id: "command",
      name: "Command Center",
      icon: "🏢",
      description: "The heart of your station. Required for all operations.",
      cost: { gold: 50, metal: 25 },
      buildTime: 5,
      available: true,
    },
    {
      id: "mine",
      name: "Ore Mine",
      icon: "⛏️",
      description: "Extracts metal from nearby asteroids.",
      cost: { gold: 100, metal: 50 },
      buildTime: 8,
      available: false,
      reason: "Requires Command Center Level 1",
    },
    {
      id: "crystal",
      name: "Crystal Synthesizer",
      icon: "💎",
      description: "Generates rare crystals for advanced research.",
      cost: { gold: 150, metal: 75 },
      buildTime: 10,
      available: false,
      reason: "Requires Ore Mine Level 1",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <BuildMenu
        options={options}
        onBuild={(id) => console.log("Build:", id)}
        onClose={() => console.log("Close menu")}
        playerCredits={100}
        playerMetal={50}
        playerCrystals={0}
      />
    </div>
  );
}
