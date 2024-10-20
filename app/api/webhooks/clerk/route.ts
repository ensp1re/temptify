
/* eslint-disable */

import { WebhookEvent, clerkClient } from "@clerk/nextjs/server";
import { Webhook } from "svix";
import { createUser, deleteUser, updateUser } from "@/lib/actions/user.actions";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    // Ensure it's a POST request
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // Retrieve the webhook secret from environment variables
    const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      throw new Error(
        "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
      );
    }

    // Get the Svix headers for verification
    const headerPayload = headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    // Validate headers
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response("Error occurred -- no svix headers", { status: 400 });
    }

    const rawBody = await req.arrayBuffer();
    const body = Buffer.from(rawBody).toString();


    const wh = new Webhook(WEBHOOK_SECRET);
    let evt: WebhookEvent;

    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return new Response(
        JSON.stringify({ message: "Invalid webhook signature" }),
        { status: 400 }
      );
    }

    console.log("Webhook Event", evt);

    // Get the ID and type
    const { id } = evt.data;
    const eventType = evt.type;

    // Handle event types (create, update, delete) accordingly
    if (eventType === "user.created") {
      const {
        id,
        email_addresses,
        image_url,
        first_name,
        last_name,
        username,
      } = evt.data;

      const user = {
        clerkId: id,
        email: email_addresses[0].email_address,
        username: username!,
        firstName: first_name!,
        lastName: last_name!,
        photo: image_url,
      };

      const newUser = await createUser(user);

      if (newUser) {
        await clerkClient.users.updateUserMetadata(id, {
          publicMetadata: {
            userId: newUser._id,
          },
        });
      }

      return new Response(JSON.stringify({ message: "OK", user: newUser }), {
        status: 200,
      });
    }

    if (eventType === "user.updated") {
      const { id, image_url, first_name, last_name, username } = evt.data;

      const user = {
        firstName: first_name!,
        lastName: last_name!,
        username: username!,
        photo: image_url,
      };

      const updatedUser = await updateUser(id, user);
      return new Response(
        JSON.stringify({ message: "OK", user: updatedUser }),
        { status: 200 }
      );
    }

    if (eventType === "user.deleted") {
      const { id } = evt.data;
      const deletedUser = await deleteUser(id!);
      return new Response(
        JSON.stringify({ message: "OK", user: deletedUser }),
        { status: 200 }
      );
    }

    console.log(`Webhook with ID: ${id} and type: ${eventType}`);
    console.log("Webhook body:", body);

    return new Response("", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
