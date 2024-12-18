import { TrpcWrapper } from "./api/TrpcWrapper";
import { TestComponent } from "./components/Test";

function App() {
  return (
    <TrpcWrapper>
      <TestComponent />
    </TrpcWrapper>
  );
}

export default App;
