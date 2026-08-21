import { TutorPage } from "@/components/tutor/TutorPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function TutorRoutePage() {
  return (
    <ProtectedRoute projectId="ai-tutor">
      <TutorPage />
    </ProtectedRoute>
  );
}