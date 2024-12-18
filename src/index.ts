import { Hono } from "hono";
import { validator } from "hono/validator";
import { bearerAuth } from "hono/bearer-auth";
import { trpcServer } from "@hono/trpc-server";
import { prisma } from "./prisma";
import { GitlabMergeRequestEvent, GitlabReleaseEvent } from "./gitlab";
import { appRouter } from "./router";

if (!process.env.WEBHOOK_SECRET) throw new Error("WEBHOOK_SECRET is not set");
if (!process.env.USER_SECRET) throw new Error("USER_SECRET is not set");

const app = new Hono();

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
  })
);

const gitlabWebhook = `/webhooks/gitlab/${process.env.WEBHOOK_SECRET}`;
console.log("Gitlab webhook URL:", gitlabWebhook);
app.post(
  gitlabWebhook,
  // first we validate the webhook contents and event header
  validator("json", (value, c) => {
    console.log(
      "Validating Gitlab event with header X-Gitlab-Event:",
      c.req.header("X-Gitlab-Event")
    );
    switch (c.req.header("X-Gitlab-Event")) {
      case "Merge Request Hook": {
        const parsed = GitlabMergeRequestEvent.safeParse(value);
        if (parsed.success) {
          return parsed.data;
        } else {
          console.error(`Invalid payload`);
          console.log("Error:", parsed.error.errors);
          console.log("Payload:", value);
          return c.text("Invalid payload");
        }
      }
      case "Release Hook": {
        const parsed = GitlabReleaseEvent.safeParse(value);
        if (parsed.success) {
          return parsed.data;
        } else {
          console.error(`Invalid payload`);
          console.log("Error:", parsed.error.errors);
          console.log("Payload:", value);
          return c.text("Invalid payload");
        }
      }
      default:
        console.error(
          `Unknown Gitlab event: ${c.req.header("X-Gitlab-Event")}`
        );
        return c.status(400);
    }
  }),
  async (c) => {
    const body = c.req.valid("json")!;

    if (body.object_kind === "merge_request") {
      console.log("processing merge request event");
      if (body.object_attributes.action !== "merge") {
        console.log(
          `Ignoring merge request event with action:`,
          body.object_attributes.action
        );
        return c.text("ignored");
      }
      const change = await prisma.change.create({
        data: {
          title: body.object_attributes.title,
          gitlabUrl: body.object_attributes.url,
        },
      });
      console.log("Created change:", change);
      return c.text("ok");
    } else if (body.object_kind == "release") {
      console.log("processing release event");
      if (body.action !== "create") {
        console.log(`Ignoring release event with action:`, body.action);
        return c.text("ignored");
      }

      const release = await prisma.release.create({
        data: {
          name: body.name,
          gitlabUrl: body.url,
        },
      });

      // Update all changes that are not associated with a release to be associated with this release
      await prisma.change.updateMany({
        where: {
          releaseId: null,
        },
        data: {
          releaseId: release.id,
        },
      });

      console.log("Created release:", release);
      return c.text("ok");
    }
  }
);

app.use(
  "/api/*",
  bearerAuth({
    token: process.env.USER_SECRET,
  })
);

app.get("/api/changelog", async (c) => {
  const releases = await prisma.release.findMany({
    include: {
      changes: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  const unreleasedChanges = await prisma.change.findMany({
    where: {
      releaseId: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return c.json({
    releases: [
      {
        name: "NEXT",
        released: false,
        changes: unreleasedChanges,
      },
      ...releases.map((release) => ({
        ...release,
        released: true,
      })),
    ],
  });
});

export default app;

console.log("Starting server on port 3000");
