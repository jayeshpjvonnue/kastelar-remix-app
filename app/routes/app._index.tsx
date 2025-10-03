import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher, useSearchParams } from "@remix-run/react";
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
  Pagination,
  TextField,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { updateWaitlistEntry } from "app/mutations/waitlist";
import { getMetaobject, getWaitlistEntries } from "../query/waitlist";
import type {
  ActionData,
  GraphQLResponse,
  MetaobjectField,
  PaginationVariables,
} from "../types/types";
import { waitlistData } from "app/data/waitlist";
import { useState, useEffect, useCallback } from "react";

export interface WaitlistData {
  emptyStateMessage: string;
  pageTitle: string;
  tableHeadings: string[];
  buttonLabels: {
    approve: string;
    reject: string;
  };
  searchPlaceholder: string;
  updatingText: string;
  sortOptions: { label: string; value: string }[];
}

const fieldsToObject = (fields: MetaobjectField[]): Record<string, string> => {
  const result: Record<string, string> = {};
  fields.forEach((field) => {
    result[field.key] = field.value;
  });
  return result;
};

const ITEMS_PER_PAGE = 10;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const search = url.searchParams.get("search") || "";
  const nextPageCursor = url.searchParams.get("after") || null;
  const previousPageCursor = url.searchParams.get("before") || null;
  const sort = url.searchParams.get("sort") || "";

  try {
    const variables: PaginationVariables & { type: string; query?: string } = {
      type: "waitlist",
      query: search
        ? `fields.email:${search} OR fields.first_name:${search} OR fields.last_name:${search}`
        : undefined,
      first: ITEMS_PER_PAGE,
    };

    if (page > 1) {
      if (nextPageCursor) {
        variables.after = nextPageCursor;
      } else if (previousPageCursor) {
        variables.before = previousPageCursor;
        variables.last = ITEMS_PER_PAGE;
        delete variables.first;
      }
    }

    const response = await admin.graphql(getWaitlistEntries, { variables });
    const result: GraphQLResponse = await response.json();
    const edges = result.data?.metaobjects?.edges || [];
    const pageInfo = result.data?.metaobjects?.pageInfo;

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

    return {
      waitlistEntries,
      pageInfo: {
        hasNextPage: pageInfo?.hasNextPage || false,
        hasPreviousPage: pageInfo?.hasPreviousPage || false,
        startCursor: pageInfo?.startCursor || null,
        endCursor: pageInfo?.endCursor || null,
      },
      currentPage: page,
      searchQuery: search,
    };
  } catch (error) {
    return {
      waitlistEntries: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
      currentPage: 1,
      searchQuery: search,
    };
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
        return { success: false, error: "Failed to update status" };
      }

      return { success: true, message: "Status updated successfully" };
    } catch (error) {
      return { success: false, error: "Failed to update status" };
    }
  }

  return { success: false, error: "Invalid action" };
};

export default function WaitlistDashboard() {
  const fetcher = useFetcher<ActionData>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isUpdating, setIsUpdating] = useState(false);
  const { waitlistEntries, pageInfo, currentPage, searchQuery } =
    useLoaderData<typeof loader>();
  const [searchInput, setSearchInput] = useState(searchQuery || "");

  const {
    pageTitle,
    emptyStateMessage,
    tableHeadings,
    buttonLabels,
    updatingText,
  } = waitlistData;

  useEffect(() => {
    if (fetcher.state === "submitting") {
      setIsUpdating(true);
    } else if (fetcher.state === "idle" && fetcher.data) {
      setTimeout(() => setIsUpdating(false), 500);
    }
  }, [fetcher.state, fetcher.data]);

  const handlePageChange = useCallback(
    (direction: "next" | "previous") => {
      const newSearchParams = new URLSearchParams(searchParams);

      if (direction === "next" && pageInfo.hasNextPage) {
        newSearchParams.set("after", pageInfo.endCursor || "");
        newSearchParams.delete("before");
        newSearchParams.set("page", (currentPage + 1).toString());
      } else if (direction === "previous" && pageInfo.hasPreviousPage) {
        newSearchParams.set("before", pageInfo.startCursor || "");
        newSearchParams.delete("after");
        newSearchParams.set("page", (currentPage - 1).toString());
      }

      setSearchParams(newSearchParams);
    },
    [searchParams, setSearchParams, pageInfo, currentPage],
  );

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

  const handleSearchSubmit = () => {
    const newParams = new URLSearchParams(searchParams);
    if (searchInput) {
      newParams.set("search", searchInput);
    } else {
      newParams.delete("search");
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const handleStatusUpdate = (entryId: string, newStatus: string) => {
    fetcher.submit(
      { actionType: "updateStatus", entryId, status: newStatus },
      { method: "POST" },
    );
  };

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
        disabled={entry.status !== "Pending" || isUpdating}
      >
        {buttonLabels.approve}
      </Button>
      <Button
        size="micro"
        variant="plain"
        tone="critical"
        onClick={() => handleStatusUpdate(entry.id, "Rejected")}
        disabled={entry.status !== "Pending" || isUpdating}
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
                {isUpdating && (
                  <InlineStack gap="200" align="center">
                    <Spinner size="small" />
                    <Text as="span" variant="bodyMd" tone="subdued">
                      {updatingText}
                    </Text>
                  </InlineStack>
                )}

                <InlineStack gap="200" align="end">
                  <TextField
                    label=""
                    placeholder="Search by email, first or last name"
                    value={searchInput}
                    onChange={(value) => setSearchInput(value)}
                    clearButton
                    onClearButtonClick={() => setSearchInput("")}
                    autoComplete=""
                  />
                  <Button onClick={handleSearchSubmit}>Search</Button>
                </InlineStack>

                {waitlistEntries.length === 0 ? (
                  <Text as="p" variant="bodyMd">
                    {emptyStateMessage}
                  </Text>
                ) : (
                  <>
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

                    {(pageInfo.hasPreviousPage || pageInfo.hasNextPage) && (
                      <div className="flex">
                        <Pagination
                          hasPrevious={pageInfo.hasPreviousPage}
                          onPrevious={() => handlePageChange("previous")}
                          hasNext={pageInfo.hasNextPage}
                          onNext={() => handlePageChange("next")}
                          label={`Page ${currentPage}`}
                        />
                      </div>
                    )}
                  </>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

