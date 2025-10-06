export interface MetaobjectField {
  key: string;
  value: string;
}

export interface MetaobjectNode {
  id: string;
  fields: MetaobjectField[];
}

export interface MetaobjectEdge {
  node: MetaobjectNode;
}

export interface WaitlistEntry {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  joined_date: string;
  status: string;
}

export interface GraphQLResponse {
  data?: {
    metaobjects?: {
      edges: MetaobjectEdge[];
      pageInfo: MetaobjectPageInfo;
    };
    metaobject?: MetaobjectNode;
    metaobjectUpdate?: {
      userErrors: Array<{ field: string[]; message: string }>;
    };
  };
}

export interface MetaobjectPageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string;
  endCursor: string;
}

export interface ActionData {
  success: boolean;
  message?: string;
  error?: string;
}

export interface CreateCustomerProp {
  email: string;
  firstName: string;
  lastName: string;
}

export interface PaginationVariables {
  first?: number;
  last?: number;
  after?: string | null;
  before?: string | null;
  query?: string | null;
}
