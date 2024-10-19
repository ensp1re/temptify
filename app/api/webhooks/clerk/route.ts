import { clerkClient } from "@clerk/nextjs/server";
import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

import { createUser, deleteUser, updateUser } from "@/lib/actions/user.actions";

export async function POST(req: Request) {
  // Retrieve the webhook secret from environment variables
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  console.log(WEBHOOK_SECRET);

  // Check if the secret is defined
  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  // Retrieve headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // Validate headers
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", { status: 400 });
  }

  // Get the body of the request

  let payload = {};
  let body: string;
  try {
    payload = await req.json();
    console.log(payload);
    body = JSON.stringify(payload);
    console.log(body);
  } catch (error) {
    return new Response(`Error occurred -- no body ${error}`, { status: 400 });
  }

  // Debugging: Log headers and body
  console.log("Raw Headers:", {
    svix_id,
    svix_timestamp,
    svix_signature,
  });
  console.log("Received Body:", body);

  let wh: Webhook;
  let evt: WebhookEvent;

  // Initialize the Svix Webhook instance
  try {
    console.log(WEBHOOK_SECRET);
    wh = new Webhook(WEBHOOK_SECRET);
    console.log(wh);
  } catch (error) {
    return new Response(`Error occurred -- no webhook ${error}`, {
      status: 400,
    });
  }

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    console.error("Payload body:", body); // Log the body for debugging
    console.error("Headers:", {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
    return new Response("Error occurred", {
      status: 400,
    });
  }

  // Get the ID and type
  const { id } = evt.data;
  const eventType = evt.type;

  // Handle event types (create, update, delete) accordingly
  // CREATE
  if (eventType === "user.created") {
    const { id, email_addresses, image_url, first_name, last_name, username } =
      evt.data;

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
}
