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
