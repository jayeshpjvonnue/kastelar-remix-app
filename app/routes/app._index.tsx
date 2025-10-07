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
  Select,
  Banner,
  Box,
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
import { createCustomerApi, sendCustomerInviteApi } from "app/apis/waitlist";

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
  searchBtnLabel: string;
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

    const statusQueryMap: Record<string, string> = {
      status_approved: "fields.status:Approved",
      status_rejected: "fields.status:Rejected",
      status_pending: "fields.status:Pending",
    };

    if (statusQueryMap[sort]) {
      variables.query = variables.query
        ? `${variables.query} AND ${statusQueryMap[sort]}`
        : statusQueryMap[sort];
    }

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

    if (sort === "joined_date_asc") {
      waitlistEntries.sort(
        (entry1, entry2) =>
          new Date(entry1.joined_date).getTime() -
          new Date(entry2.joined_date).getTime(),
      );
    } else if (sort === "joined_date_desc") {
      waitlistEntries.sort(
        (entry1, entry2) =>
          new Date(entry2.joined_date).getTime() -
          new Date(entry1.joined_date).getTime(),
      );
    }

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

  const requestedAction = formData.get("actionType");
  const waitlistEntryId = formData.get("entryId");
  const updatedStatus = formData.get("status");

  try {
    const waitlistEntryResponse = await admin.graphql(getMetaobject, {
      variables: { id: waitlistEntryId },
    });
    const waitlistEntryData: GraphQLResponse =
      await waitlistEntryResponse.json();
    const waitlistEntryFields: MetaobjectField[] =
      waitlistEntryData.data?.metaobject?.fields || [];

    const updatedWaitlistEntryFields: MetaobjectField[] =
      waitlistEntryFields.map((field: MetaobjectField) => ({
        ...field,
        value:
          field.key === "status"
            ? String(updatedStatus || "")
            : String(field.value || ""),
      }));

    const waitlistEntryUpdateResponse = await admin.graphql(
      updateWaitlistEntry,
      {
        variables: { id: waitlistEntryId, fields: updatedWaitlistEntryFields },
      },
    );
    const waitlistEntryUpdateData: GraphQLResponse =
      await waitlistEntryUpdateResponse.json();
    const waitlistEntryUpdateErrors =
      waitlistEntryUpdateData.data?.metaobjectUpdate?.userErrors || [];

    if (waitlistEntryUpdateErrors.length > 0) {
      return { success: false, error: "Failed to update waitlist status" };
    }

    if (requestedAction === "updateStatus" && updatedStatus === "Approved") {
      const customerData = {
        email: String(
          waitlistEntryFields.find(
            (field: MetaobjectField) => field.key === "email",
          )?.value,
        ),
        firstName: String(
          waitlistEntryFields.find(
            (field: MetaobjectField) => field.key === "first_name",
          )?.value,
        ),
        lastName: String(
          waitlistEntryFields.find(
            (field: MetaobjectField) => field.key === "last_name",
          )?.value || "",
        ),
      };

      const rollbackWaitlist = async () => {
        const waitlistRollbackFields: MetaobjectField[] =
          waitlistEntryFields.map((field: MetaobjectField) => ({
            ...field,
            value:
              field.key === "status" ? "Pending" : String(field.value || ""),
          }));

        await admin.graphql(updateWaitlistEntry, {
          variables: { id: waitlistEntryId, fields: waitlistRollbackFields },
        });
      };

      try {
        const customerResponse = await createCustomerApi(customerData);
        const customerGID =
          customerResponse.customer?.admin_graphql_api_id ?? null;

        if (!customerGID) {
          await rollbackWaitlist();
          return { success: false, error: "Customer not created" };
        }

        const inviteResponse = await sendCustomerInviteApi(customerGID);
        if (!inviteResponse.success) {
          return {
            success: true,
            warning: "Customer created but invite failed",
          };
        }

        return { success: true };
      } catch (error) {
        await rollbackWaitlist();
        return { success: false, error: "Failed to create customer" };
      }
    }

    return { success: true, message: "Status updated successfully" };
  } catch (error) {
    return { success: false, error: "Unexpected error occurred" };
  }
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

  const handleSortChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("sort", value);
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  return (
    <Page title={pageTitle}>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="600">
              {isUpdating && (
                <Banner tone="info">
                  <InlineStack gap="200" align="center">
                    <Spinner size="small" />
                    <Text as="span" variant="bodyMd">
                      {updatingText}
                    </Text>
                  </InlineStack>
                </Banner>
              )}

              <Box padding="400">
                <InlineStack
                  gap="400"
                  align="space-between"
                  blockAlign="center"
                >
                  <Box padding="400">
                    <InlineStack gap="200" align="start" blockAlign="center">
                      <Box minWidth="320px">
                        <TextField
                          label="Search customers"
                          labelHidden
                          placeholder="Email, first name, or last name"
                          value={searchInput}
                          onChange={setSearchInput}
                          clearButton
                          onClearButtonClick={() => setSearchInput("")}
                          autoComplete="off"
                        />
                      </Box>
                      <Button variant="primary" onClick={handleSearchSubmit}>
                        {waitlistData.searchBtnLabel}
                      </Button>
                    </InlineStack>
                  </Box>

                  <InlineStack gap="200" blockAlign="center">
                    <Select
                      label="Sort by"
                      labelHidden
                      options={waitlistData.sortOptions}
                      value={searchParams.get("sort") || ""}
                      onChange={handleSortChange}
                    />
                  </InlineStack>
                </InlineStack>
              </Box>

              <Box padding="400">
                {waitlistEntries.length === 0 ? (
                  <Box padding="800">
                    <Text as="p" variant="bodyMd" alignment="center">
                      {emptyStateMessage}
                    </Text>
                  </Box>
                ) : (
                  <BlockStack gap="400">
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
                      increasedTableDensity
                      verticalAlign="middle"
                    />

                    {(pageInfo.hasPreviousPage || pageInfo.hasNextPage) && (
                      <Box paddingBlockStart="400">
                        <Pagination
                          hasPrevious={pageInfo.hasPreviousPage}
                          onPrevious={() => handlePageChange("previous")}
                          hasNext={pageInfo.hasNextPage}
                          onNext={() => handlePageChange("next")}
                          label={`Page ${currentPage}`}
                        />
                      </Box>
                    )}
                  </BlockStack>
                )}
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
