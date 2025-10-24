import BuildingCard from "../BuildingCard";

export default function BuildingCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      <BuildingCard
        name="Command Center"
        level={3}
        icon="🏢"
        description="The heart of your base. Upgrading unlocks new buildings and capabilities."
        upgradeCredits={500}
        upgradeMetal={200}
        upgradeTime={300}
        canUpgrade={true}
        onUpgrade={() => console.log("Upgrading Command Center")}
      />
      
      <BuildingCard
        name="Ore Mine"
        level={2}
        icon="⛏️"
        description="Produces metal resources automatically over time."
        upgradeCredits={300}
        upgradeMetal={100}
        upgradeTime={180}
        currentProduction={5}
        maxStorage={100}
        availableToCollect={75}
        canUpgrade={true}
        onUpgrade={() => console.log("Upgrading Ore Mine")}
        onCollect={() => console.log("Collecting metal")}
      />
      
      <BuildingCard
        name="Crystal Synthesizer"
        level={1}
        icon="💎"
        description="Generates rare crystals used for advanced research and upgrades."
        upgradeCredits={400}
        upgradeMetal={150}
        upgradeTime={240}
        isUpgrading={true}
        upgradeProgress={65}
        currentProduction={2}
        maxStorage={50}
        availableToCollect={30}
      />
    </div>
  );
}
