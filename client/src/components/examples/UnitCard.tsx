import UnitCard from "../UnitCard";

export default function UnitCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      <UnitCard
        name="Space Marine"
        type="melee"
        level={2}
        health={120}
        maxHealth={120}
        damage={25}
        count={3}
        icon="🚀"
        description="Fast melee fighter that charges into battle"
        onTrain={() => console.log("Training Space Marine")}
        onDeploy={() => console.log("Deploying Space Marine")}
        canTrain={true}
      />
      
      <UnitCard
        name="Laser Gunner"
        type="ranged"
        level={1}
        health={80}
        maxHealth={80}
        damage={30}
        count={2}
        icon="🔫"
        description="Ranged unit that attacks from a distance"
        onTrain={() => console.log("Training Laser Gunner")}
        onDeploy={() => console.log("Deploying Laser Gunner")}
        canTrain={true}
        isDeployed={true}
      />
      
      <UnitCard
        name="Battle Tank"
        type="tank"
        level={1}
        health={200}
        maxHealth={200}
        damage={15}
        count={1}
        icon="🛡️"
        description="Heavy armored unit that soaks damage"
        onTrain={() => console.log("Training Battle Tank")}
        canTrain={false}
      />
    </div>
  );
}
