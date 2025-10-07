import { sendCustomerInvite } from "app/mutations/waitlist";
import { CreateCustomerProp } from "app/types/types";

export async function createCustomerApi({
  email,
  firstName,
  lastName,
}: CreateCustomerProp) {
  const response = await fetch(
    `https://${process.env.SHOPIFY_SHOP}/admin/api/2025-10/customers.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_API_TOKEN!,
      },
      body: JSON.stringify({
        customer: { email, first_name: firstName, last_name: lastName },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to create customer: ${response.status} - ${await response.text()}`,
    );
  }

  const data = await response.json();
  return data;
}

export async function sendCustomerInviteApi(customerId: string) {
  const response = await fetch(
    `https://${process.env.SHOPIFY_SHOP}/admin/api/2025-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_API_TOKEN!,
      },
      body: JSON.stringify({
        query: sendCustomerInvite,
        variables: { customerId },
      }),
    },
  );

  const result = await response.json();

  const errors = result.data?.customerSendAccountInviteEmail?.userErrors || [];
  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true };
}
