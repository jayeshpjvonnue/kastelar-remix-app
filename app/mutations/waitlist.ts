export const getWaitlistEntries = `
    query GetWaitlistEntries {
        metaobjects(type: "waitlist", first: 100) {
            edges {
                node {
                    id
                    fields {
                        key
                        value
                    }
                }
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
