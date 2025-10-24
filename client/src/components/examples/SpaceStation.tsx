import SpaceStation from "../SpaceStation";

export default function SpaceStationExample() {
  const buildings = [
    {
      id: "command",
      name: "Command Center",
      level: 1,
      position: { x: 50, y: 20 },
      isBuilt: true,
    },
    {
      id: "mine",
      name: "Ore Mine",
      level: 1,
      position: { x: 20, y: 50 },
      isBuilt: true,
      resourceType: "metal" as const,
      currentStorage: 100,
      maxStorage: 100,
    },
    {
      id: "crystal",
      name: "Crystal Synthesizer",
      level: 1,
      position: { x: 80, y: 50 },
      isBuilt: false,
      isBuilding: true,
      resourceType: "crystal" as const,
    },
  ];

  return (
    <div className="w-full h-screen">
      <SpaceStation
        buildings={buildings}
        onHubClick={() => console.log("Hub clicked")}
        onBuildingClick={(id) => console.log("Building clicked:", id)}
        onCollectResource={(id) => console.log("Collect resource:", id)}
      />
    </div>
  );
}
