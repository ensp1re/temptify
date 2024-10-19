/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable prefer-const */

import { clerkClient } from "@clerk/nextjs/server";
import { WebhookEvent } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { buffer } from "micro";
import { createUser, deleteUser, updateUser } from "@/lib/actions/user.actions";

export async function POST(req: Request, res: Response) {
  try {
    // Retrieve the webhook secret from environment variables
    const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      throw new Error(
        "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
      );
    }

    // Get the Svix headers for verification
    const svix_id = req.headers.get("svix-id") as string;
    const svix_timestamp = req.headers.get("svix-timestamp") as string;
    const svix_signature = req.headers.get("svix-signature") as string;

    // Validate headers
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response("Error occurred -- no svix headers", { status: 400 });
    }

    // Get the body of the request
    let payload;
    payload = await req.json();
    const body = (await buffer(payload)).toString();

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
      return NextResponse.json({ Error: err });
    }

    console.log("Webhook Event", evt);

    // Get the ID and type
    const { id } = evt.data;
    const eventType = evt.type;

    // Handle event types (create, update, delete) accordingly
    // CREATE
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

      console.log("User", user);
      const newUser = await createUser(user);

      // Set public metadata
      if (newUser) {
        await clerkClient.users.updateUserMetadata(id, {
          publicMetadata: {
            userId: newUser._id,
          },
        });
      }

      return NextResponse.json({ message: "OK", user: newUser });
    }

    // UPDATE
    if (eventType === "user.updated") {
      const { id, image_url, first_name, last_name, username } = evt.data;

      const user = {
        firstName: first_name!,
        lastName: last_name!,
        username: username!,
        photo: image_url,
      };

      const updatedUser = await updateUser(id, user);
      return NextResponse.json({ message: "OK", user: updatedUser });
    }

    // DELETE
    if (eventType === "user.deleted") {
      const { id } = evt.data;
      const deletedUser = await deleteUser(id!);
      return NextResponse.json({ message: "OK", user: deletedUser });
    }

    console.log(`Webhook with ID: ${id} and type: ${eventType}`);
    console.log("Webhook body:", body);

    return new Response("", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
