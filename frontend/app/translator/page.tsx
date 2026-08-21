import { TranslatorPage } from "@/components/translator/TranslatorPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function TranslatorRoutePage() {
  return (
    <ProtectedRoute projectId="translator">
      <TranslatorPage />
    </ProtectedRoute>
  );
}
