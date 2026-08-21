import { VoiceDocGeneratorPage } from "@/components/voice-doc-generator/VoiceDocGeneratorPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function VoiceDocGeneratorRoutePage() {
  return (
    <ProtectedRoute projectId="voice-doc-generator">
      <VoiceDocGeneratorPage />
    </ProtectedRoute>
  );
}
