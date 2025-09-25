export function getShopifyConfig() {
  const shop = process.env.SHOPIFY_SHOP;
  const token = process.env.SHOPIFY_ADMIN_API_TOKEN;

  if (!shop || !token) {
    throw new Error(
      "Missing required environment variables: SHOPIFY_SHOP and SHOPIFY_ADMIN_API_TOKEN must be set",
    );
  }

  return {
    shop,
    token,
    graphqlUrl: `https://${shop}/admin/api/2024-04/graphql.json`,
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
  };
}
