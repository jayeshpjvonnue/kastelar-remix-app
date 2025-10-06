import { WaitlistData } from "app/routes/app._index";

export const waitlistData: WaitlistData = {
  pageTitle: "Waitlist Dashboard",
  emptyStateMessage: "No waitlist entries available.",
  tableHeadings: ["Email", "Name", "Joined Date", "Status", "Actions"],
  buttonLabels: { approve: "Approve", reject: "Reject" },
  searchPlaceholder: "Search by email, first or last name",
  updatingText: "Updating...",
  sortOptions: [
    { label: "Newest First", value: "joined_date_desc" },
    { label: "Oldest First", value: "joined_date_asc" },
    { label: "Show Approved", value: "status_approved" },
    { label: "Show Rejected", value: "status_rejected" },
    { label: "Show Pending", value: "status_pending" },
  ],
  searchBtnLabel: "Search",
};
