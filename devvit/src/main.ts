import { Devvit, type FormField } from "@devvit/public-api";

import { handleNuke, handleNukePost } from "./nuke.js";

Devvit.configure({
  redditAPI: true,
});

// Auto-comment "welcome!" when a user creates a new post
Devvit.addTrigger({
  event: "PostCreate",
  onEvent: async (event, context) => {
    const postId = event.post?.id;
    if (!postId) {
      console.error("PostCreate event missing post id");
      return;
    }
    
    try {
      const post = await context.reddit.getPostById(postId);
      console.log("New post created:", {
        id: post.id,
        title: post.title,
        body: post.body,
      });
      await post.addComment({
        text: "Hey there! Thanks for sharing.\n\nWhile you wait for people to comment, I think you'll find these posts relevant:\n\nhttps://www.reddit.com/r/mentalhealth/comments/1d0hs2h/i_think_i_was_sexually_assaulted_by_my_cousin/\n\nhttps://www.reddit.com/r/mentalhealth/comments/1g9jjd6/i_was_assaulted_by_my_cousin_as_a_child_and_it/",
        runAs: "APP",
      });
      console.log(`Welcome comment posted on ${postId}`);
    } catch (err) {
      console.error("Failed to post welcome comment:", err);
    }
  },
});

const nukeFields: FormField[] = [
  {
    name: "remove",
    label: "Remove comments",
    type: "boolean",
    defaultValue: true,
  },
  {
    name: "lock",
    label: "Lock comments",
    type: "boolean",
    defaultValue: false,
  },
  {
    name: "skipDistinguished",
    label: "Skip distinguished comments",
    type: "boolean",
    defaultValue: false,
  },
] as const;

const nukeForm = Devvit.createForm(
  () => {
    return {
      fields: nukeFields,
      title: "Mop Comments",
      acceptLabel: "Mop",
      cancelLabel: "Cancel",
    };
  },
  async ({ values }, context) => {
    if (!values.lock && !values.remove) {
      context.ui.showToast("You must select either lock or remove.");
      return;
    }

    if (context.commentId) {
      const result = await handleNuke(
        {
          remove: values.remove,
          lock: values.lock,
          skipDistinguished: values.skipDistinguished,
          commentId: context.commentId,
          subredditId: context.subredditId,
        },
        context
      );
      console.log(
        `Mop result - ${result.success ? "success" : "fail"} - ${
          result.message
        }`
      );
      context.ui.showToast(
        `${result.success ? "Success" : "Failed"} : ${result.message}`
      );
    } else {
      context.ui.showToast(`Mop failed! Please try again later.`);
    }
  }
);

Devvit.addMenuItem({
  label: "Mop comments",
  description:
    "Remove this comment and all child comments. This might take a few seconds to run.",
  location: "comment",
  forUserType: "moderator",
  onPress: (_, context) => {
    context.ui.showForm(nukeForm);
  },
});

const nukePostForm = Devvit.createForm(
  () => {
    return {
      fields: nukeFields,
      title: "Mop Post Comments",
      acceptLabel: "Mop",
      cancelLabel: "Cancel",
    };
  },
  async ({ values }, context) => {
    if (!values.lock && !values.remove) {
      context.ui.showToast("You must select either lock or remove.");
      return;
    }

    if (!context.postId) {
      throw new Error("No post ID");
    }

    const result = await handleNukePost(
      {
        remove: values.remove,
        lock: values.lock,
        skipDistinguished: values.skipDistinguished,
        postId: context.postId,
        subredditId: context.subredditId,
      },
      context
    );
    console.log(
      `Mop result - ${result.success ? "success" : "fail"} - ${result.message}`
    );
    context.ui.showToast(
      `${result.success ? "Success" : "Failed"} : ${result.message}`
    );
  }
);

Devvit.addMenuItem({
  label: "Mop post comments",
  description:
    "Remove all comments of this post. This might take a few seconds to run.",
  location: "post",
  forUserType: "moderator",
  onPress: (_, context) => {
    context.ui.showForm(nukePostForm);
  },
});

export default Devvit;
