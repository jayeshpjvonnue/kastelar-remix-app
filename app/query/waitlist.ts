export const getWaitlistEntries = `
  query GetWaitlistEntries($type: String!, $query: String, $first: Int, $last: Int, $after: String, $before: String) {
    metaobjects(type: $type, query: $query, first: $first, last: $last, after: $after, before: $before) {
      edges {
        node {
          id
          fields {
            key
            value
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

export const getMetaobject = ` 
    query GetMetaobject($id: ID!) {
        metaobject(id: $id) {
            id
            fields {
                key
                value
            }
        }
    }         
`;