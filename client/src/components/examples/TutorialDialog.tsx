import TutorialDialog from "../TutorialDialog";

export default function TutorialDialogExample() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <TutorialDialog
        message="Welcome to Space Base Showdown, Commander! What is your name?"
        needsInput={true}
        inputLabel="Your Name"
        onInput={(name) => console.log("Player name:", name)}
      />
    </div>
  );
}
