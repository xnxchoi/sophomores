import { useState } from "react";
import { createRoot } from "react-dom/client";
import { useForm } from "react-hook-form";
import { Badge, HA_Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/hideaway/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider
} from "@/hideaway/components/ui/sidebar";

function CompositionPreview() {
  const [lastAction, setLastAction] = useState("No composed action yet.");
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<{ email: string }>({
    defaultValues: { email: "" },
    shouldFocusError: true
  });

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 font-sans text-base sm:px-8">
      <header className="mb-6 space-y-2">
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Local test fixture — not customer UI
        </p>
        <h1 className="text-2xl font-semibold">
          Production composition preview
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Actual Badge, Form and Sidebar components with synthetic state only.
          No account, provider, database or outbound request is used.
        </p>
      </header>

      <section
        aria-labelledby="badges-heading"
        className="mb-6 space-y-4 rounded-lg border border-border p-5"
      >
        <h2 id="badges-heading" className="text-lg font-semibold">
          Badges
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <Badge data-testid="modern-badge">Modern badge</Badge>
          <HA_Badge data-testid="legacy-badge" variant="secondary">
            Legacy badge
          </HA_Badge>
          <Badge
            data-testid="modern-badge-link"
            variant="outline"
            render={<a href="#composition-result" />}
            className="min-h-11"
            onClick={() => setLastAction("Modern badge link activated.")}
          >
            Modern badge link
          </Badge>
          <HA_Badge
            asChild
            variant="outline"
            className="min-h-11"
            onClick={() => setLastAction("Legacy badge link activated.")}
          >
            <a data-testid="legacy-badge-link" href="#composition-result">
              Legacy badge link
            </a>
          </HA_Badge>
        </div>
      </section>

      <div className="grid items-start gap-6 md:grid-cols-2">
        <section
          aria-labelledby="form-heading"
          className="space-y-4 rounded-lg border border-border p-5"
        >
          <h2 id="form-heading" className="text-lg font-semibold">
            Form composition
          </h2>
          <p className="text-sm text-muted-foreground">
            Submit empty: an inline error should appear and focus should return
            to the input. Clicking its label should focus it too.
          </p>
          <Form {...form}>
            <form
              noValidate
              autoComplete="off"
              className="space-y-4"
              onSubmit={form.handleSubmit(() => setSubmitted(true))}
            >
              <FormField
                control={form.control}
                name="email"
                rules={{
                  required: "Email is required.",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid synthetic email."
                  }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Synthetic email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        data-testid="composition-email"
                        type="email"
                        placeholder="fixture@example.test"
                        className="min-h-11"
                      />
                    </FormControl>
                    <FormDescription>
                      Test data only; nothing is sent.
                    </FormDescription>
                    <FormMessage data-testid="composition-email-error" />
                  </FormItem>
                )}
              />
              <button
                data-testid="composition-submit"
                type="submit"
                className="min-h-11 rounded border border-border bg-primary px-4 text-sm text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Validate synthetic form
              </button>
              {submitted && (
                <p role="status" className="text-sm">
                  Synthetic submission accepted; nothing was sent.
                </p>
              )}
            </form>
          </Form>
        </section>

        <section
          aria-labelledby="sidebar-heading"
          className="space-y-4 rounded-lg border border-border p-5"
        >
          <h2 id="sidebar-heading" className="text-lg font-semibold">
            Five sidebar composition sites
          </h2>
          <p className="text-sm text-muted-foreground">
            Real SidebarProvider; composed heading, group action, menu link,
            menu action and submenu link. Actions update the local status below.
          </p>
          <SidebarProvider className="min-h-0">
            <Sidebar
              collapsible="none"
              className="w-full rounded border border-border p-2"
            >
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupLabel asChild className="h-11 pr-14">
                    <h3 data-testid="composed-group-label">
                      Composed group label
                    </h3>
                  </SidebarGroupLabel>
                  <SidebarGroupAction
                    asChild
                    className="top-2 right-2 size-11"
                    onClick={() => setLastAction("Group action activated.")}
                  >
                    <button
                      data-testid="composed-group-action"
                      type="button"
                      aria-label="Run composed group action"
                    >
                      +
                    </button>
                  </SidebarGroupAction>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive
                          className="min-h-11 pr-14"
                          onClick={() => setLastAction("Menu link activated.")}
                        >
                          <a
                            data-testid="composed-menu-link"
                            href="#composition-result"
                          >
                            Composed menu link
                          </a>
                        </SidebarMenuButton>
                        <SidebarMenuAction
                          asChild
                          className="top-0 right-0 size-11"
                          onClick={() =>
                            setLastAction("Menu action activated.")
                          }
                        >
                          <button
                            data-testid="composed-menu-action"
                            type="button"
                            aria-label="Run composed menu action"
                          >
                            ···
                          </button>
                        </SidebarMenuAction>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              className="min-h-11"
                              onClick={() =>
                                setLastAction("Submenu link activated.")
                              }
                            >
                              <a
                                data-testid="composed-submenu-link"
                                href="#composition-result"
                              >
                                Composed submenu link
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>
          </SidebarProvider>
        </section>
      </div>

      <p
        id="composition-result"
        role="status"
        data-testid="composition-result"
        className="mt-6 min-h-11 rounded border border-border bg-muted p-3 text-sm"
      >
        {lastAction}
      </p>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Composition fixture root is unavailable");
createRoot(root).render(<CompositionPreview />);
