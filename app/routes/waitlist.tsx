import type { ActionFunctionArgs } from "@remix-run/node";
import { CreateWaitlistResponse } from "app/types/types";
import { createWaitlistEntry } from "app/mutations/waitlist";
import { adminClient } from "app/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { first_name, last_name, email } = await request.json();

    if (!first_name?.trim() || !last_name?.trim() || !email?.trim()) {
      return Response.json(
        { success: false, message: "All fields are required!" },
        { status: 400 },
      );
    }

    const variables = {
      metaobject: {
        type: "waitlist",
        fields: [
          { key: "first_name", value: first_name.trim() },
          { key: "last_name", value: last_name.trim() },
          { key: "email", value: email.trim() },
          { key: "joined_date", value: new Date().toISOString() },
          { key: "status", value: "Pending" },
        ],
      },
    };

    const result = await adminClient.request<CreateWaitlistResponse>(
      createWaitlistEntry,
      variables,
    );

    if (result.metaobjectCreate.userErrors.length > 0) {
      return Response.json(
        {
          success: false,
          message: "Failed to save to waitlist",
          errors: result.metaobjectCreate.userErrors,
        },
        { status: 400 },
      );
    }

    return Response.json({
      success: true,
      message: "Successfully joined waitlist!",
      id: result.metaobjectCreate.metaobject.id,
    });
  } catch (error) {
    console.error("Waitlist action error:", error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
};