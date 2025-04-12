// export const organizationPremissions = {
//     superadmin: [
//         'viewOrganizationDetails',
//         'viewOrganizationList',
//         'deleteOrganization',
//         'editOrganization',
//         'createOrganization'
//     ]
// }

// export const teamMemberPremissions= {
//     admin: [
//         'viewTeamMemberDetails',
//         'viewTeamMemberList',
//         'addTeamMember',
//         'editTeamMember',
//         'deleteTeamMember'
//     ]
// }

export const MODULE_PERMISSIONS = {
    dashboard: [
        'accessDashboardAsAdmin',
        'accessDashboardAsUser',
        'accessDashboardAsUserAdmin'
    ],

    plans: {
        'super-admin': [
            'viewPlanDetails',
            'viewPlanList',
            'deletePlan',
            'editPlan',
            'createPlan'
        ]
    },

    payment: {
        'super-admin': [
            'viewPaymentDetails',
            'viewPaymentList',
            'deletePayment',
            'editPayment',
            'createPayment'
        ]
    },

    organization: {
        'super-admin': [
            'viewOrganizationDetails',
            'viewOrganizationList',
            'deleteOrganization',
            'editOrganization',
            'createOrganization'
        ]
    },

    teamMember: {
        admin: [
            'viewTeamMemberDetails',
            'viewTeamMemberList',
            'addTeamMember',
            'editTeamMember',
            'deleteTeamMember'
        ]
    },

    product: {
        admin: [
            'viewProductDetails',
            'viewProductList',
            'addProduct',
            'editProduct',
            'deleteProduct'
        ],
        user: [
            'viewProductDetails',
            'viewProductList'
        ]
    },

    company: {
        admin: [
            'viewCompanyDetails',
            'viewCompanyList',
            'addCompany',
            'editCompany',
            'deleteCompany'
        ],
        user: [
            'viewCompanyDetails',
            'viewCompanyList',
            'addCompany',
            'editCompany',
            'deleteCompany'
        ]
    },

    contact: {
        admin: [
            'viewContactDetails',
            'viewContactList',
            'addContact',
            'editContact',
            'deleteContact'
        ],
        user: [
            'viewContactDetails',
            'viewContactList',
            'addContact',
            'editContact',
            'deleteContact'
        ]
    },

    pipeline: {
        admin: [
            'viewPipelineDetails',
            'viewPipelineList',
            'addPipeline',
            'editPipeline',
            'deletePipeline'
        ],
        user: [
            'viewPipelineDetails',
            'viewPipelineList',
            'addPipeline',
            'editPipeline',
            'deletePipeline'
        ]
    },

    deals: {
        admin: [
            'viewDealDetails',
            'viewDealList',
            'addDeal',
            'editDeal',
            'deleteDeal'
        ],
        user: [
            'viewDealDetails',
            'viewDealList',
            'addDeal',
            'editDeal',
            'deleteDeal'
        ]
    }
};
