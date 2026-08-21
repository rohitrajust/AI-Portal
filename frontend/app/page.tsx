import { Dashboard } from "@/components/dashboard/Dashboard";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function HomePage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}
