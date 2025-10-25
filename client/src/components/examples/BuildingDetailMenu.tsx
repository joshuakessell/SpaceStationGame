import BuildingDetailMenu from "../BuildingDetailMenu";

export default function BuildingDetailMenuExample() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <BuildingDetailMenu
        name="Ore Mine"
        level={2}
        icon="⛏️"
        description="Extracts metal resources from nearby asteroids. Upgrade to increase production rate and storage capacity."
        onClose={() => console.log("Close")}
        onUpgrade={() => console.log("Upgrade")}
        canUpgrade={true}
        upgradeCost={{ gold: 200, metal: 100 }}
        upgradeTime={10}
        currentProduction={5}
        maxStorage={100}
        currentStorage={75}
        resourceType="metal"
      />
    </div>
  );
}
