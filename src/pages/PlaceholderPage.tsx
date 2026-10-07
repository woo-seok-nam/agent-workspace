import { useLocation } from "react-router-dom";

export function PlaceholderPage() {
  const location = useLocation();

  return (
    <section>
      <h1>Coming Soon</h1>

      <p>{location.pathname}</p>
    </section>
  );
}