import { WhiteboardCamPage } from "@/components/whiteboard-cam/WhiteboardCamPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function Page() {
  return (
    <ProtectedRoute projectId="ai-whiteboard-cam">
      <WhiteboardCamPage />
    </ProtectedRoute>
  );
}