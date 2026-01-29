import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  CheckCircle2,
  Clock,
  FolderKanban,
  Users,
  BarChart3,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: FolderKanban,
    title: "Project Management",
    description: "Organize tasks into projects with kanban boards, lists, and calendar views.",
  },
  {
    icon: CheckCircle2,
    title: "Task Tracking",
    description: "Create, assign, and track tasks with priorities, due dates, and status updates.",
  },
  {
    icon: Clock,
    title: "Time Tracking",
    description: "Log time spent on tasks and generate reports to analyze productivity.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Invite team members, assign tasks, and collaborate in real-time.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description: "Get insights into project progress and team performance.",
  },
  {
    icon: Zap,
    title: "Real-time Updates",
    description: "Stay in sync with instant notifications and live updates.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FolderKanban className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold">TaskFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <a href="/auth">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl" data-testid="text-hero-title">
              Manage Projects.
              <br />
              <span className="text-primary">Track Progress.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              TaskFlow is a modern project and task management tool that helps teams 
              organize work, track time, and collaborate effectively.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" asChild data-testid="button-get-started">
                <a href="/auth">Get Started Free</a>
              </Button>
              <Button size="lg" variant="outline" data-testid="button-learn-more">
                Learn More
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-3xl font-semibold mb-12" data-testid="text-features-title">
              Everything you need to manage your projects
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <Card key={index} className="bg-card" data-testid={`card-feature-${index}`}>
                  <CardContent className="p-6">
                    <feature.icon className="h-10 w-10 text-primary mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-semibold mb-4">Ready to get started?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Join teams already using TaskFlow to streamline their workflow and boost productivity.
            </p>
            <Button size="lg" asChild data-testid="button-cta">
              <a href="/auth">Start Using TaskFlow</a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>TaskFlow - Project & Task Management</p>
        </div>
      </footer>
    </div>
  );
}
