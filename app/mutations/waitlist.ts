export const updateWaitlistEntry = `
    mutation UpdateWaitlistEntry($id: ID!, $fields: [MetaobjectFieldInput!]!) {
        metaobjectUpdate(id: $id, metaobject: { fields: $fields }) {
            userErrors {
                field
                message
            }
        }
    }
`;

export const createWaitlistEntry = `
    mutation CreateWaitlistEntry($metaobject: MetaobjectCreateInput!) {
        metaobjectCreate(metaobject: $metaobject) {
            metaobject {
                id
            }
            userErrors {
                field
                message
            }
        }
    }
`;

export const createCustomer = `
mutation customerCreate($input: CustomerInput!) {
        customerCreate(input: $input) {
          customer {
            id
            email
            firstName
            lastName
          }
          userErrors {
            field
            message
          }
        }
      }
`;
