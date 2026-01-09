import { ErrorScreen } from "@/components/ErrorScreen";

export default function NotFound() {
  return <ErrorScreen type="not_found" message="The page you're looking for doesn't exist." />;
}
