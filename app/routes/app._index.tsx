import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Card,
  DataTable,
  Badge,
  Text,
  BlockStack,
  Layout,
  Button,
  InlineStack,
  Spinner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import {
  getMetaobject,
  getWaitlistEntries,
  updateWaitlistEntry,
} from "app/mutations/waitlist";
import type {
  ActionData,
  GraphQLResponse,
  MetaobjectField,
} from "../types/types";
import { waitlistData } from "app/data/waitlist";

export interface WaitlistData {
  emptyStateMessage: string;
  pageTitle: string;
  updatingTitle: string;
  updatingDescription: string;
  entriesTitle: string;
  tableHeadings: string[];
  buttonLabels: {
    approve: string;
    reject: string;
  };
}

const fieldsToObject = (fields: MetaobjectField[]): Record<string, string> => {
  const result: Record<string, string> = {};
  fields.forEach((field) => {
    result[field.key] = field.value;
  });
  return result;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  try {
    const response = await admin.graphql(getWaitlistEntries);

    const result: GraphQLResponse = await response.json();
    const edges = result.data?.metaobjects?.edges || [];

    const waitlistEntries = edges.map((edge) => {
      const fields = fieldsToObject(edge.node.fields);

      return {
        id: edge.node.id,
        first_name: fields.first_name || "",
        last_name: fields.last_name || "",
        email: fields.email || "",
        joined_date: fields.joined_date || "",
        status: fields.status || "Pending",
      };
    });

    return { waitlistEntries };
  } catch (error) {
    console.error("Error fetching waitlist entries:", error);
    return { waitlistEntries: [] };
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");
  const entryId = formData.get("entryId");
  const newStatus = formData.get("status");

  if (actionType === "updateStatus") {
    try {
      const getResponse = await admin.graphql(getMetaobject, {
        variables: { id: entryId },
      });

      const getResult: GraphQLResponse = await getResponse.json();
      const currentFields = getResult.data?.metaobject?.fields || [];

      const updatedFields = currentFields.map((field) =>
        field.key === "status" ? { ...field, value: newStatus } : field,
      );

      const updateResponse = await admin.graphql(updateWaitlistEntry, {
        variables: { id: entryId, fields: updatedFields },
      });

      const result: GraphQLResponse = await updateResponse.json();
      const errors = result.data?.metaobjectUpdate?.userErrors || [];

      if (errors.length > 0) {
        console.error("Update error:", errors);
        return { success: false, error: "Failed to update status" };
      }

      return { success: true, message: "Status updated successfully" };
    } catch (error) {
      console.error("Update error:", error);
      return { success: false, error: "Failed to update status" };
    }
  }

  return { success: false, error: "Invalid action" };
};


export default function WaitlistDashboard() {
  const { waitlistEntries } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<ActionData>();
  const {
    pageTitle,
    entriesTitle,
    emptyStateMessage,
    tableHeadings,
    buttonLabels
  } = waitlistData;

  const getBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return "success";
      case "Rejected":
        return "critical";
      default:
        return "warning";
    }
  };

  const handleStatusUpdate = (entryId: string, newStatus: string) => {
    fetcher.submit(
      { actionType: "updateStatus", entryId, status: newStatus },
      { method: "POST" },
    );
  };

  if (fetcher.state !== "idle") {
    return <LoadingState />;
  }

  const rows = waitlistEntries.map((entry) => [
    entry.email,
    `${entry.first_name} ${entry.last_name}`,
    new Date(entry.joined_date).toLocaleDateString(),
    <Badge tone={getBadge(entry.status)}>{entry.status}</Badge>,
    <InlineStack gap="200">
      <Button
        size="micro"
        variant="primary"
        onClick={() => handleStatusUpdate(entry.id, "Approved")}
        disabled={entry.status !== "Pending"}
      >
        {buttonLabels.approve}
      </Button>
      <Button
        size="micro"
        variant="plain"
        tone="critical"
        onClick={() => handleStatusUpdate(entry.id, "Rejected")}
        disabled={entry.status !== "Pending"}
      >
        {buttonLabels.reject}
      </Button>
    </InlineStack>,
  ]);

  return (
    <Page title={pageTitle}>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  {entriesTitle} ({waitlistEntries.length})
                </Text>

                {waitlistEntries.length === 0 ? (
                  <Text as="p" variant="bodyMd">
                    {emptyStateMessage}
                  </Text>
                ) : (
                  <DataTable
                    columnContentTypes={[
                      "text",
                      "text",
                      "text",
                      "text",
                      "text",
                    ]}
                    headings={tableHeadings}
                    rows={rows}
                  />
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
const LoadingState = () => {
  const { pageTitle, updatingTitle, updatingDescription } = waitlistData;
  
  return (
    <Page title={pageTitle}>
      <Card>
        <BlockStack gap="400" align="center" inlineAlign="center">
          <Text as="h2" variant="headingMd">
            {updatingTitle}
          </Text>
          <Spinner
            size="large"
            accessibilityLabel="Updating waitlist status"
          />
          <BlockStack gap="200" align="center">
            <Text as="p" variant="bodyMd" tone="subdued">
              {updatingDescription}
            </Text>
          </BlockStack>
        </BlockStack>
      </Card>
    </Page>
  );
};