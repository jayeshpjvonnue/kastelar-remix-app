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
    };
    metaobject?: MetaobjectNode;
    metaobjectUpdate?: {
      userErrors: Array<{ field: string[]; message: string }>;
    };
  };
}

export interface ActionData {
  success: boolean;
  message?: string;
  error?: string;
}