import { cn } from "@/lib/utils";
import { HA_Button as Button } from "@/components/ui/button";
import { HA_Card as Card, HA_CardContent as CardContent, HA_CardDescription as CardDescription, HA_CardHeader as CardHeader, HA_CardTitle as CardTitle } from "@/components/ui/card";
import { authProviderIcons } from "@/hideaway/components/icons/authProviders";
import { Link } from "@/hideaway/components/core/Link/Link";
import type { ComponentProps } from "react";
import { authClient } from "@/lib/auth/client";

export function LoginForm({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-9", className)} {...props}>
      <Card className="bg-faded-background/50">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Welcome back.</CardTitle>
          <CardDescription>Check in with your social account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-9">
            <div className="flex flex-col gap-7">
              <form
                className="col"
                action={async () => {
                  "use server";
                  await authClient.signIn.social({
                    provider: "google"
                  });
                }}
              >
                <Button
                  variant="outline"
                  className="*:ease ease border-faded-foreground/&.65)] inline-flex h-14 min-h-[35px] w-full items-center justify-center gap-[8px] rounded-md border bg-off-background/30 px-4 py-3 text-base font-medium whitespace-nowrap text-foreground shadow-sm transition-colors duration-300 *:transition-colors *:duration-300 hover:bg-off-background/50 hover:*:text-rouge-500 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-6 [&_svg]:shrink-0"
                >
                  {authProviderIcons["Google"] || null}
                  <span>
                    <span className="text-foreground">
                      Check in with Google
                    </span>
                  </span>
                </Button>
              </form>
            </div>
            <div
              className={
                "relative flex h-[3px] w-full items-center justify-center gap-[1px] bg-transparent"
              }
            >
              <div
                className={
                  "relative -left-1 h-[1px] flex-[1_1_35%] bg-linear-to-r from-transparent to-foreground/70"
                }
              ></div>
              <div className={"px-[1px] text-center text-[12px]"}> Or</div>
              <div
                className={
                  "relative -right-1 h-[1px] flex-[1_1_35%] bg-linear-to-r from-foreground/70 to-transparent"
                }
              ></div>
            </div>
            <div className="grid gap-9">
              {/*  <div className="grid gap-5">*/}
              {/*    <Label htmlFor="email">Email</Label>*/}
              {/*    <Input id="email" type="email" placeholder="" required />*/}
              {/*  </div>*/}
              {/*  <div className="grid gap-5">*/}
              {/*    <div className="flex items-center">*/}
              {/*      <Label htmlFor="password">Password</Label>*/}
              {/*      <Link href="#" className="ml-auto text-base underline-offset-4 hover:underline">*/}
              {/*        Forgot your password?*/}
              {/*      </Link>*/}
              {/*    </div>*/}
              {/*    <Input id="password" type="password" required />*/}
              {/*  </div>*/}
              {/*  <Button type="submit" className="w-full">*/}
              {/*    Login*/}
              {/*  </Button>*/}
            </div>
            <div className="text-center text-base">
              Problems with your account?
              <span className="group relative mx-1 inline-flex items-center justify-center p-0">
                <Link
                  href="#"
                  className="ease no-underline decoration-0 transition-colors duration-200 hover:text-rouge-500"
                >
                  Contact us
                </Link>
                <span className="ease absolute bottom-[1px] left-0 z-0 h-[1px] w-full origin-left scale-x-0 bg-rouge-500/80 transition-transform duration-300 group-hover:scale-x-100"></span>
                <span className="ease absolute bottom-[1px] left-0 z-0 h-[1px] w-full origin-right scale-x-100 bg-foreground/80 transition-transform duration-300 group-hover:scale-x-0"></span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="text-center text-base text-balance text-muted-foreground *:[a]:underline *:[a]:underline-offset-4 *:[a]:hover:text-primary">
        By clicking continue, you agree to our
        <span className="group relative mx-1 inline-flex items-center justify-center p-0">
          <Link
            href="/terms-of-service"
            className="ease no-underline decoration-0 transition-colors duration-200 hover:text-foreground"
          >
            Terms of Service
          </Link>
          <span className="ease absolute bottom-[1px] left-0 z-0 h-[1px] w-full origin-left scale-x-0 bg-foreground/80 transition-transform duration-300 group-hover:scale-x-100"></span>
          <span className="ease absolute bottom-[1px] left-0 z-0 h-[1px] w-full origin-right scale-x-100 bg-muted-foreground/80 transition-transform duration-300 group-hover:scale-x-0"></span>
        </span>
        and{" "}
        <span className="group relative mx-1 inline-flex items-center justify-center p-0">
          <Link
            href="/policy"
            className="ease no-underline decoration-0 transition-colors duration-200 hover:text-foreground"
          >
            Privacy Policy
          </Link>
          <span className="ease absolute bottom-[1px] left-0 z-0 h-[1px] w-full origin-left scale-x-0 bg-foreground/80 transition-transform duration-300 group-hover:scale-x-100"></span>
          <span className="ease absolute bottom-[1px] left-0 z-0 h-[1px] w-full origin-right scale-x-100 bg-muted-foreground/80 transition-transform duration-300 group-hover:scale-x-0"></span>
        </span>
        .
      </div>
    </div>
  );
}
