import { NotFoundScreen } from "@/components/layouts/Missing/not-found-screen";

export const metadata = {
  title: "404...",
  description: "NOT AN EXIT"
};

export default function NotFound() {
  return (
    <html lang="en">
      <body>
        <NotFoundScreen />
      </body>
    </html>
  );
}
