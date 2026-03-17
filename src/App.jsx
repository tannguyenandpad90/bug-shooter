import GameCanvas from "./components/GameCanvas";

export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#050508",
      }}
    >
      <GameCanvas />
    </div>
  );
}
