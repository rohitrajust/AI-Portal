import { ArenaPage } from "@/components/arena/ArenaPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function ArenaRoutePage() {
  return (
    <ProtectedRoute projectId="ai-model-arena">
      <ArenaPage />
    </ProtectedRoute>
  );
}
