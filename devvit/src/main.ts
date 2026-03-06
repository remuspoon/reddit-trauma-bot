import { Devvit, SettingScope } from "@devvit/public-api";

// Add your Express backend domain here so the app is allowed to fetch it.

Devvit.configure({
  redditAPI: true,
  http: { domains: ["https://reddit-trauma-bot.vercel.app"] },
});

Devvit.addSettings([
  {
    type: "string",
    name: "EXPRESS_BACKEND_URL",
    label: "Express backend URL",
    scope: SettingScope.App,
  },
  {
    type: "string",
    name: "EXPRESS_API_KEY",
    label: "Express API key (x-api-key)",
    scope: SettingScope.App,
    isSecret: true,
  },
]);

// When a new post is created, query the Express backend for similar posts and comment with links
Devvit.addTrigger({
  event: "PostCreate",
  onEvent: async (event, context) => {
    const postId = event.post?.id;
    if (!postId) {
      console.error("PostCreate event missing post id");
      return;
    }

    try {
      const baseUrl = (await context.settings.get("EXPRESS_BACKEND_URL"))?.toString()?.trim();
      const apiKey = (await context.settings.get("EXPRESS_API_KEY"))?.toString()?.trim();
      if (!baseUrl || !apiKey) {
        console.error("Missing EXPRESS_BACKEND_URL or EXPRESS_API_KEY in app settings");
        return;
      }

      const post = await context.reddit.getPostById(postId);
      const queryText = [post.title, post.body].filter(Boolean).join("\n\n").trim();
      if (!queryText) {
        console.log("Post has no title or body, skipping query");
        return;
      }

      const url = `${baseUrl.replace(/\/$/, "")}/api/query`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ query: queryText }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error("Express backend error:", res.status, errBody);
        return;
      }

      const data = (await res.json()) as { permalinks?: string[] };
      const permalinks = Array.isArray(data?.permalinks) ? data.permalinks : [];

      const linksSection =
        permalinks.length > 0
          ? permalinks
              .slice(0, 5)
              .map((p) =>
                p.startsWith("http") ? p : `https://www.reddit.com${p.startsWith("/") ? "" : "/"}${p}`
              )
              .join("\n\n")
          : "";

      const commentText =
        "Hey there! Thanks for sharing.\n\n" +
        "While you wait for people to comment, here are some related posts you might find helpful:\n\n" +
        (linksSection || "_No similar posts found._");

      await post.addComment({
        text: commentText,
        runAs: "APP",
      });
      console.log(`Welcome comment posted on ${postId} with ${permalinks.length} links`);
    } catch (err) {
      console.error("Failed to post welcome comment:", err);
    }
  },
});

export default Devvit;
