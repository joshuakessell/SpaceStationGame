import BattleGrid from "../BattleGrid";

export default function BattleGridExample() {
  const playerUnits = [
    { id: "1", name: "Marine", icon: "🚀", health: 100, maxHealth: 120, position: { row: 1, col: 0 }, isPlayer: true },
    { id: "2", name: "Gunner", icon: "🔫", health: 80, maxHealth: 80, position: { row: 2, col: 1 }, isPlayer: true },
  ];

  const enemyUnits = [
    { id: "3", name: "Enemy", icon: "👾", health: 90, maxHealth: 100, position: { row: 1, col: 4 }, isPlayer: false },
    { id: "4", name: "Enemy", icon: "🤖", health: 50, maxHealth: 150, position: { row: 2, col: 5 }, isPlayer: false },
  ];

  return (
    <div className="flex justify-center p-8">
      <BattleGrid
        playerUnits={playerUnits}
        enemyUnits={enemyUnits}
        isDeployMode={false}
        onCellClick={(row, col) => console.log(`Clicked cell ${row}, ${col}`)}
      />
    </div>
  );
}
