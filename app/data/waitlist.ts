import type { WaitlistData } from "app/routes/app._index";

export const waitlistData: WaitlistData = {
  pageTitle: "Waitlist Dashboard",
  updatingTitle: "Updating Waitlist Entry",
  updatingDescription:
    "Please wait a moment while we update the status. This should only take a few seconds.",
  entriesTitle: "Waitlist Entries",
  emptyStateMessage:
    "No waitlist entries yet. Share your waitlist form to get started!",
  tableHeadings: ["Email", "Name", "Join Date", "Status", "Actions"],
  buttonLabels: {
    approve: "Approve",
    reject: "Reject",
  },
};
