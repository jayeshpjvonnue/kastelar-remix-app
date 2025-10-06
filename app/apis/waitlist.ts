import { CreateCustomerProp } from "app/types/types";

export async function createCustomer({
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
