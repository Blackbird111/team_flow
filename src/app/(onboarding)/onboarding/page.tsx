import { CreateWorkspaceForm } from "@/components/onboarding/create-workspace-form";

export const metadata = {
  title: "Set up your workspace — TeamFlow",
};

export default function OnboardingPage() {
  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome to TeamFlow
        </h1>
        <p className="text-muted-foreground text-sm">
          Let&apos;s set up your workspace. You can invite your team next.
        </p>
      </div>
      <CreateWorkspaceForm />
    </div>
  );
}
