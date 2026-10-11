// Generated from the Pettly OpenAPI document. Do not edit.
export const operationRoutes = {
  "getApiStatus": {
    "method": "GET",
    "path": "",
    "authenticated": false
  },
  "getApiLiveness": {
    "method": "GET",
    "path": "/health/live",
    "authenticated": false
  },
  "getApiReadiness": {
    "method": "GET",
    "path": "/health/ready",
    "authenticated": false
  },
  "getOperationalMetrics": {
    "method": "GET",
    "path": "/metrics",
    "authenticated": false
  },
  "createService": {
    "method": "POST",
    "path": "/services/admin",
    "authenticated": true
  },
  "listManagedServices": {
    "method": "GET",
    "path": "/services/admin",
    "authenticated": true
  },
  "listServiceModerationQueue": {
    "method": "GET",
    "path": "/services/admin/moderation",
    "authenticated": true
  },
  "getServiceReviewPreview": {
    "method": "GET",
    "path": "/services/admin/moderation/{serviceId}",
    "authenticated": true
  },
  "listServiceResourceAudit": {
    "method": "GET",
    "path": "/services/admin/resources/{resourceId}/audit",
    "authenticated": true
  },
  "listActiveServiceBlocks": {
    "method": "GET",
    "path": "/services/admin/resources/{resourceId}/blocks",
    "authenticated": true
  },
  "blockServiceResource": {
    "method": "POST",
    "path": "/services/admin/resources/{resourceId}/blocks",
    "authenticated": true
  },
  "createServiceResource": {
    "method": "POST",
    "path": "/services/admin/resources",
    "authenticated": true
  },
  "listManagedServiceResources": {
    "method": "GET",
    "path": "/services/admin/resources",
    "authenticated": true
  },
  "updateServiceResource": {
    "method": "PATCH",
    "path": "/services/admin/resources/{resourceId}",
    "authenticated": true
  },
  "releaseServiceBlock": {
    "method": "DELETE",
    "path": "/services/admin/resources/{resourceId}/blocks/{blockId}",
    "authenticated": true
  },
  "listServiceAudit": {
    "method": "GET",
    "path": "/services/admin/{serviceId}/audit",
    "authenticated": true
  },
  "getManagedService": {
    "method": "GET",
    "path": "/services/admin/{serviceId}",
    "authenticated": true
  },
  "updateService": {
    "method": "PATCH",
    "path": "/services/admin/{serviceId}",
    "authenticated": true
  },
  "archiveService": {
    "method": "DELETE",
    "path": "/services/admin/{serviceId}",
    "authenticated": true
  },
  "submitService": {
    "method": "POST",
    "path": "/services/admin/{serviceId}/submit",
    "authenticated": true
  },
  "pauseService": {
    "method": "POST",
    "path": "/services/admin/{serviceId}/pause",
    "authenticated": true
  },
  "reviewService": {
    "method": "POST",
    "path": "/services/admin/{serviceId}/review",
    "authenticated": true
  },
  "listPublicServices": {
    "method": "GET",
    "path": "/services",
    "authenticated": false
  },
  "listPublicServiceResources": {
    "method": "GET",
    "path": "/services/{serviceId}/resources",
    "authenticated": false
  },
  "getServiceAvailability": {
    "method": "GET",
    "path": "/services/{serviceId}/availability",
    "authenticated": false
  },
  "getPublicService": {
    "method": "GET",
    "path": "/services/{serviceId}",
    "authenticated": false
  },
  "getRoleCatalog": {
    "method": "GET",
    "path": "/authorization/roles",
    "authenticated": true
  },
  "getCurrentUserAccess": {
    "method": "GET",
    "path": "/authorization/me",
    "authenticated": true
  },
  "getUserAccessAsAdministrator": {
    "method": "GET",
    "path": "/authorization/users/{userId}",
    "authenticated": true
  },
  "inviteUserAsAdministrator": {
    "method": "POST",
    "path": "/users",
    "authenticated": true
  },
  "listUsers": {
    "method": "GET",
    "path": "/users",
    "authenticated": true
  },
  "resendInvitationAsAdministrator": {
    "method": "POST",
    "path": "/users/{userId}/invitation",
    "authenticated": true
  },
  "deleteUserAsAdministrator": {
    "method": "DELETE",
    "path": "/users/{userId}",
    "authenticated": true
  },
  "getUserAsAdministrator": {
    "method": "GET",
    "path": "/users/{userId}",
    "authenticated": true
  },
  "updateUserAsAdministrator": {
    "method": "PATCH",
    "path": "/users/{userId}",
    "authenticated": true
  },
  "listUserAuditAsAdministrator": {
    "method": "GET",
    "path": "/users/{userId}/audit",
    "authenticated": true
  },
  "getCurrentUser": {
    "method": "GET",
    "path": "/users/me",
    "authenticated": true
  },
  "updateCurrentUser": {
    "method": "PATCH",
    "path": "/users/me",
    "authenticated": true
  },
  "changeUserGlobalRole": {
    "method": "PATCH",
    "path": "/users/{userId}/role",
    "authenticated": true
  },
  "changeUserStatus": {
    "method": "PATCH",
    "path": "/users/{userId}/status",
    "authenticated": true
  },
  "createOrganization": {
    "method": "POST",
    "path": "/organizations",
    "authenticated": true
  },
  "listOrganizations": {
    "method": "GET",
    "path": "/organizations",
    "authenticated": true
  },
  "requestOrganization": {
    "method": "POST",
    "path": "/organizations/requests",
    "authenticated": true
  },
  "listMyOrganizations": {
    "method": "GET",
    "path": "/organizations/me",
    "authenticated": true
  },
  "getOrganizationProfile": {
    "method": "GET",
    "path": "/organizations/{organizationId}/profile",
    "authenticated": true
  },
  "updateOrganizationProfile": {
    "method": "PATCH",
    "path": "/organizations/{organizationId}/profile",
    "authenticated": true
  },
  "submitOrganization": {
    "method": "POST",
    "path": "/organizations/{organizationId}/submit",
    "authenticated": true
  },
  "approveOrganization": {
    "method": "POST",
    "path": "/organizations/{organizationId}/approve",
    "authenticated": true
  },
  "rejectOrganization": {
    "method": "POST",
    "path": "/organizations/{organizationId}/reject",
    "authenticated": true
  },
  "updateOrganizationStatus": {
    "method": "PATCH",
    "path": "/organizations/{organizationId}/status",
    "authenticated": true
  },
  "transferOrganizationResponsibility": {
    "method": "PATCH",
    "path": "/organizations/{organizationId}/responsible",
    "authenticated": true
  },
  "archiveOrganization": {
    "method": "DELETE",
    "path": "/organizations/{organizationId}",
    "authenticated": true
  },
  "getOrganization": {
    "method": "GET",
    "path": "/organizations/{organizationId}",
    "authenticated": true
  },
  "listOrganizationMembers": {
    "method": "GET",
    "path": "/organizations/{organizationId}/members",
    "authenticated": true
  },
  "listOrganizationAudit": {
    "method": "GET",
    "path": "/organizations/{organizationId}/audit",
    "authenticated": true
  },
  "assignOrganizationRole": {
    "method": "PUT",
    "path": "/organizations/{organizationId}/members/{userId}/role",
    "authenticated": true
  },
  "removeOrganizationRole": {
    "method": "DELETE",
    "path": "/organizations/{organizationId}/members/{userId}/role",
    "authenticated": true
  },
  "listOwnNotifications": {
    "method": "GET",
    "path": "/notifications",
    "authenticated": true
  },
  "countOwnUnreadNotifications": {
    "method": "GET",
    "path": "/notifications/unread-count",
    "authenticated": true
  },
  "getOwnNotificationPreferences": {
    "method": "GET",
    "path": "/notifications/preferences",
    "authenticated": true
  },
  "changeOwnNotificationPreferences": {
    "method": "PUT",
    "path": "/notifications/preferences",
    "authenticated": true
  },
  "readAllOwnNotifications": {
    "method": "POST",
    "path": "/notifications/read-all",
    "authenticated": true
  },
  "readOwnNotification": {
    "method": "POST",
    "path": "/notifications/{notificationId}/read",
    "authenticated": true
  },
  "listFailedNotificationDeliveries": {
    "method": "GET",
    "path": "/notifications/admin/failed-deliveries",
    "authenticated": true
  },
  "retryFailedNotificationDelivery": {
    "method": "POST",
    "path": "/notifications/admin/deliveries/{deliveryId}/retry",
    "authenticated": true
  },
  "listOwnVeterinaryCredentials": {
    "method": "GET",
    "path": "/veterinary/credentials/mine",
    "authenticated": true
  },
  "listEligibleVeterinaryCredentials": {
    "method": "GET",
    "path": "/veterinary/credentials/eligible",
    "authenticated": true
  },
  "createVeterinaryCredential": {
    "method": "POST",
    "path": "/veterinary/credentials",
    "authenticated": true
  },
  "listVeterinaryCredentials": {
    "method": "GET",
    "path": "/veterinary/credentials",
    "authenticated": true
  },
  "configureVeterinaryCredential": {
    "method": "PATCH",
    "path": "/veterinary/credentials/{credentialId}",
    "authenticated": true
  },
  "getVeterinaryCredential": {
    "method": "GET",
    "path": "/veterinary/credentials/{credentialId}",
    "authenticated": true
  },
  "uploadVeterinaryEvidence": {
    "method": "POST",
    "path": "/veterinary/credentials/{credentialId}/documents",
    "authenticated": true
  },
  "readVeterinaryEvidence": {
    "method": "GET",
    "path": "/veterinary/credentials/{credentialId}/documents/{mediaId}",
    "authenticated": true
  },
  "removeVeterinaryEvidence": {
    "method": "DELETE",
    "path": "/veterinary/credentials/{credentialId}/documents/{mediaId}",
    "authenticated": true
  },
  "submitVeterinaryCredential": {
    "method": "POST",
    "path": "/veterinary/credentials/{credentialId}/submit",
    "authenticated": true
  },
  "reviewVeterinaryCredential": {
    "method": "POST",
    "path": "/veterinary/credentials/{credentialId}/review",
    "authenticated": true
  },
  "revokeVeterinaryCredential": {
    "method": "POST",
    "path": "/veterinary/credentials/{credentialId}/revoke",
    "authenticated": true
  },
  "listVeterinaryCredentialAudit": {
    "method": "GET",
    "path": "/veterinary/credentials/{credentialId}/audit",
    "authenticated": true
  },
  "listManagedBookings": {
    "method": "GET",
    "path": "/bookings/admin",
    "authenticated": true
  },
  "listManagedBookingAudit": {
    "method": "GET",
    "path": "/bookings/admin/{bookingId}/audit",
    "authenticated": true
  },
  "getManagedBooking": {
    "method": "GET",
    "path": "/bookings/admin/{bookingId}",
    "authenticated": true
  },
  "confirmManagedBooking": {
    "method": "POST",
    "path": "/bookings/admin/{bookingId}/confirm",
    "authenticated": true
  },
  "rejectManagedBooking": {
    "method": "POST",
    "path": "/bookings/admin/{bookingId}/reject",
    "authenticated": true
  },
  "cancelManagedBooking": {
    "method": "POST",
    "path": "/bookings/admin/{bookingId}/cancel",
    "authenticated": true
  },
  "startManagedBooking": {
    "method": "POST",
    "path": "/bookings/admin/{bookingId}/start",
    "authenticated": true
  },
  "completeManagedBooking": {
    "method": "POST",
    "path": "/bookings/admin/{bookingId}/complete",
    "authenticated": true
  },
  "no_showManagedBooking": {
    "method": "POST",
    "path": "/bookings/admin/{bookingId}/no_show",
    "authenticated": true
  },
  "createBooking": {
    "method": "POST",
    "path": "/bookings",
    "authenticated": true
  },
  "listOwnBookings": {
    "method": "GET",
    "path": "/bookings",
    "authenticated": true
  },
  "listOwnBookingAudit": {
    "method": "GET",
    "path": "/bookings/{bookingId}/audit",
    "authenticated": true
  },
  "getOwnBooking": {
    "method": "GET",
    "path": "/bookings/{bookingId}",
    "authenticated": true
  },
  "cancelOwnBooking": {
    "method": "POST",
    "path": "/bookings/{bookingId}/cancel",
    "authenticated": true
  },
  "rescheduleOwnBooking": {
    "method": "POST",
    "path": "/bookings/{bookingId}/reschedule",
    "authenticated": true
  },
  "createAnimal": {
    "method": "POST",
    "path": "/animals",
    "authenticated": true
  },
  "listAnimals": {
    "method": "GET",
    "path": "/animals",
    "authenticated": true
  },
  "getAnimal": {
    "method": "GET",
    "path": "/animals/{animalId}",
    "authenticated": true
  },
  "updateAnimal": {
    "method": "PATCH",
    "path": "/animals/{animalId}",
    "authenticated": true
  },
  "archiveAnimal": {
    "method": "DELETE",
    "path": "/animals/{animalId}",
    "authenticated": true
  },
  "updateAnimalStatus": {
    "method": "PATCH",
    "path": "/animals/{animalId}/status",
    "authenticated": true
  },
  "uploadAnimalPhoto": {
    "method": "POST",
    "path": "/animals/{animalId}/photos",
    "authenticated": true
  },
  "getPrivateAnimalPhoto": {
    "method": "GET",
    "path": "/animals/{animalId}/photos/{mediaId}",
    "authenticated": true
  },
  "removeAnimalPhoto": {
    "method": "DELETE",
    "path": "/animals/{animalId}/photos/{mediaId}",
    "authenticated": true
  },
  "listAnimalAudit": {
    "method": "GET",
    "path": "/animals/{animalId}/audit",
    "authenticated": true
  },
  "register": {
    "method": "POST",
    "path": "/auth/register",
    "authenticated": false
  },
  "login": {
    "method": "POST",
    "path": "/auth/login",
    "authenticated": false
  },
  "refreshSession": {
    "method": "POST",
    "path": "/auth/refresh",
    "authenticated": true
  },
  "logout": {
    "method": "POST",
    "path": "/auth/logout",
    "authenticated": true
  },
  "logoutAll": {
    "method": "POST",
    "path": "/auth/logout-all",
    "authenticated": true
  },
  "forgotPassword": {
    "method": "POST",
    "path": "/auth/forgot-password",
    "authenticated": false
  },
  "resendVerification": {
    "method": "POST",
    "path": "/auth/resend-verification",
    "authenticated": false
  },
  "verifyEmail": {
    "method": "POST",
    "path": "/auth/verify-email",
    "authenticated": false
  },
  "resetPassword": {
    "method": "POST",
    "path": "/auth/reset-password",
    "authenticated": false
  },
  "acceptInvitation": {
    "method": "POST",
    "path": "/auth/accept-invitation",
    "authenticated": false
  },
  "changePassword": {
    "method": "POST",
    "path": "/auth/change-password",
    "authenticated": true
  },
  "requestEmailChange": {
    "method": "POST",
    "path": "/auth/change-email",
    "authenticated": true
  },
  "confirmEmailChange": {
    "method": "POST",
    "path": "/auth/confirm-email-change",
    "authenticated": false
  },
  "listOwnSessions": {
    "method": "GET",
    "path": "/auth/sessions",
    "authenticated": true
  },
  "revokeOwnSession": {
    "method": "DELETE",
    "path": "/auth/sessions/{sessionId}",
    "authenticated": true
  },
  "deleteOwnAccount": {
    "method": "DELETE",
    "path": "/auth/account",
    "authenticated": true
  },
  "listPublicCategories": {
    "method": "GET",
    "path": "/catalog/categories",
    "authenticated": false
  },
  "listPublicProducts": {
    "method": "GET",
    "path": "/catalog/products",
    "authenticated": false
  },
  "getPublicProduct": {
    "method": "GET",
    "path": "/catalog/products/{productId}",
    "authenticated": false
  },
  "getPublicProductPhoto": {
    "method": "GET",
    "path": "/catalog/products/{productId}/photos/{mediaId}",
    "authenticated": false
  },
  "listManagedCategories": {
    "method": "GET",
    "path": "/catalog/admin/categories",
    "authenticated": true
  },
  "createProductCategory": {
    "method": "POST",
    "path": "/catalog/admin/categories",
    "authenticated": true
  },
  "listCategoryAudit": {
    "method": "GET",
    "path": "/catalog/admin/categories/{categoryId}/audit",
    "authenticated": true
  },
  "updateProductCategory": {
    "method": "PATCH",
    "path": "/catalog/admin/categories/{categoryId}",
    "authenticated": true
  },
  "createCatalogProduct": {
    "method": "POST",
    "path": "/catalog/admin/products",
    "authenticated": true
  },
  "listManagedProducts": {
    "method": "GET",
    "path": "/catalog/admin/products",
    "authenticated": true
  },
  "getManagedProduct": {
    "method": "GET",
    "path": "/catalog/admin/products/{productId}",
    "authenticated": true
  },
  "updateCatalogProduct": {
    "method": "PATCH",
    "path": "/catalog/admin/products/{productId}",
    "authenticated": true
  },
  "archiveCatalogProduct": {
    "method": "DELETE",
    "path": "/catalog/admin/products/{productId}",
    "authenticated": true
  },
  "submitCatalogProduct": {
    "method": "POST",
    "path": "/catalog/admin/products/{productId}/submit",
    "authenticated": true
  },
  "pauseCatalogProduct": {
    "method": "POST",
    "path": "/catalog/admin/products/{productId}/pause",
    "authenticated": true
  },
  "reviewCatalogProduct": {
    "method": "POST",
    "path": "/catalog/admin/products/{productId}/review",
    "authenticated": true
  },
  "listProductModerationQueue": {
    "method": "GET",
    "path": "/catalog/admin/moderation/products",
    "authenticated": true
  },
  "getProductReviewPreview": {
    "method": "GET",
    "path": "/catalog/admin/moderation/products/{productId}",
    "authenticated": true
  },
  "getProductReviewPhoto": {
    "method": "GET",
    "path": "/catalog/admin/moderation/products/{productId}/photos/{mediaId}",
    "authenticated": true
  },
  "createProductVariant": {
    "method": "POST",
    "path": "/catalog/admin/products/{productId}/variants",
    "authenticated": true
  },
  "updateProductVariant": {
    "method": "PATCH",
    "path": "/catalog/admin/products/{productId}/variants/{variantId}",
    "authenticated": true
  },
  "archiveProductVariant": {
    "method": "DELETE",
    "path": "/catalog/admin/products/{productId}/variants/{variantId}",
    "authenticated": true
  },
  "uploadProductPhoto": {
    "method": "POST",
    "path": "/catalog/admin/products/{productId}/photos",
    "authenticated": true
  },
  "getManagedProductPhoto": {
    "method": "GET",
    "path": "/catalog/admin/products/{productId}/photos/{mediaId}",
    "authenticated": true
  },
  "removeProductPhoto": {
    "method": "DELETE",
    "path": "/catalog/admin/products/{productId}/photos/{mediaId}",
    "authenticated": true
  },
  "listProductAudit": {
    "method": "GET",
    "path": "/catalog/admin/products/{productId}/audit",
    "authenticated": true
  },
  "getPublicInventoryAvailability": {
    "method": "GET",
    "path": "/inventory/availability",
    "authenticated": false
  },
  "listManagedInventory": {
    "method": "GET",
    "path": "/inventory/variants",
    "authenticated": true
  },
  "getManagedStock": {
    "method": "GET",
    "path": "/inventory/variants/{variantId}",
    "authenticated": true
  },
  "recordInventoryMovement": {
    "method": "POST",
    "path": "/inventory/variants/{variantId}/movements",
    "authenticated": true
  },
  "listInventoryMovements": {
    "method": "GET",
    "path": "/inventory/variants/{variantId}/movements",
    "authenticated": true
  },
  "createInventoryHold": {
    "method": "POST",
    "path": "/inventory/variants/{variantId}/holds",
    "authenticated": true
  },
  "getManagedInventoryHold": {
    "method": "GET",
    "path": "/inventory/holds/{holdId}",
    "authenticated": true
  },
  "releaseInventoryHold": {
    "method": "POST",
    "path": "/inventory/holds/{holdId}/release",
    "authenticated": true
  },
  "consumeInventoryHold": {
    "method": "POST",
    "path": "/inventory/holds/{holdId}/consume",
    "authenticated": true
  },
  "getOwnCart": {
    "method": "GET",
    "path": "/cart",
    "authenticated": true
  },
  "clearOwnCart": {
    "method": "DELETE",
    "path": "/cart",
    "authenticated": true
  },
  "putOwnCartItem": {
    "method": "PUT",
    "path": "/cart/items/{variantId}",
    "authenticated": true
  },
  "removeOwnCartItem": {
    "method": "DELETE",
    "path": "/cart/items/{variantId}",
    "authenticated": true
  },
  "getCommercialPolicy": {
    "method": "GET",
    "path": "/organizations/{organizationId}/order-policy",
    "authenticated": true
  },
  "configureCommercialPolicy": {
    "method": "PUT",
    "path": "/organizations/{organizationId}/order-policy",
    "authenticated": true
  },
  "createCheckoutQuote": {
    "method": "POST",
    "path": "/checkout/quotes",
    "authenticated": true
  },
  "getOwnCheckoutQuote": {
    "method": "GET",
    "path": "/checkout/quotes/{quoteId}",
    "authenticated": true
  },
  "createOwnOrder": {
    "method": "POST",
    "path": "/orders",
    "authenticated": true
  },
  "listVisibleOrders": {
    "method": "GET",
    "path": "/orders",
    "authenticated": true
  },
  "getVisibleOrder": {
    "method": "GET",
    "path": "/orders/{orderId}",
    "authenticated": true
  },
  "cancelUnpaidOrder": {
    "method": "POST",
    "path": "/orders/{orderId}/cancel",
    "authenticated": true
  },
  "advanceOrderFulfillment": {
    "method": "PATCH",
    "path": "/orders/{orderId}/fulfillment",
    "authenticated": true
  },
  "listVisibleOrderAudits": {
    "method": "GET",
    "path": "/orders/{orderId}/audits",
    "authenticated": true
  },
  "listCommercialPolicyAudits": {
    "method": "GET",
    "path": "/organizations/{organizationId}/order-policy/audits",
    "authenticated": true
  },
  "getPaymentPolicy": {
    "method": "GET",
    "path": "/payments/policy",
    "authenticated": true
  },
  "createOwnPaymentAttempt": {
    "method": "POST",
    "path": "/orders/{orderId}/payment-attempts",
    "authenticated": true
  },
  "listVisiblePayments": {
    "method": "GET",
    "path": "/payments",
    "authenticated": true
  },
  "getVisiblePayment": {
    "method": "GET",
    "path": "/payments/{paymentId}",
    "authenticated": true
  },
  "listVisiblePaymentHistory": {
    "method": "GET",
    "path": "/payments/{paymentId}/history",
    "authenticated": true
  },
  "getPaymentFinancialEvidence": {
    "method": "GET",
    "path": "/payments/{paymentId}/financials",
    "authenticated": true
  },
  "requestPaymentReconciliation": {
    "method": "POST",
    "path": "/payments/{paymentId}/reconcile",
    "authenticated": true
  },
  "listPublicAdoptions": {
    "method": "GET",
    "path": "/adoptions/publications",
    "authenticated": false
  },
  "createAdoptionPublication": {
    "method": "POST",
    "path": "/adoptions/publications",
    "authenticated": true
  },
  "getPublicAdoption": {
    "method": "GET",
    "path": "/adoptions/publications/{publicationId}",
    "authenticated": false
  },
  "updateAdoptionPublication": {
    "method": "PATCH",
    "path": "/adoptions/publications/{publicationId}",
    "authenticated": true
  },
  "archiveAdoptionPublication": {
    "method": "DELETE",
    "path": "/adoptions/publications/{publicationId}",
    "authenticated": true
  },
  "getPublicAdoptionPhoto": {
    "method": "GET",
    "path": "/adoptions/publications/{publicationId}/photos/{mediaId}",
    "authenticated": false
  },
  "listAdoptionModerationQueue": {
    "method": "GET",
    "path": "/adoptions/moderation/publications",
    "authenticated": true
  },
  "listManagedAdoptionPublications": {
    "method": "GET",
    "path": "/adoptions/organizations/{organizationId}/publications",
    "authenticated": true
  },
  "getManagedAdoptionPublication": {
    "method": "GET",
    "path": "/adoptions/publications/{publicationId}/manage",
    "authenticated": true
  },
  "getManagedAdoptionPhoto": {
    "method": "GET",
    "path": "/adoptions/publications/{publicationId}/manage/photos/{mediaId}",
    "authenticated": true
  },
  "submitAdoptionPublication": {
    "method": "POST",
    "path": "/adoptions/publications/{publicationId}/submit",
    "authenticated": true
  },
  "pauseAdoptionPublication": {
    "method": "POST",
    "path": "/adoptions/publications/{publicationId}/pause",
    "authenticated": true
  },
  "reviewAdoptionPublication": {
    "method": "POST",
    "path": "/adoptions/publications/{publicationId}/review",
    "authenticated": true
  },
  "submitAdoptionRequest": {
    "method": "POST",
    "path": "/adoptions/publications/{publicationId}/requests",
    "authenticated": true
  },
  "listShelterAdoptionRequests": {
    "method": "GET",
    "path": "/adoptions/publications/{publicationId}/requests",
    "authenticated": true
  },
  "listMyAdoptionRequests": {
    "method": "GET",
    "path": "/adoptions/requests/me",
    "authenticated": true
  },
  "getAdoptionRequest": {
    "method": "GET",
    "path": "/adoptions/requests/{adoptionRequestId}",
    "authenticated": true
  },
  "reviewAdoptionRequest": {
    "method": "PATCH",
    "path": "/adoptions/requests/{adoptionRequestId}/review",
    "authenticated": true
  },
  "withdrawAdoptionRequest": {
    "method": "POST",
    "path": "/adoptions/requests/{adoptionRequestId}/withdraw",
    "authenticated": true
  },
  "completeAdoptionRequest": {
    "method": "POST",
    "path": "/adoptions/requests/{adoptionRequestId}/complete",
    "authenticated": true
  },
  "listAdoptionAudit": {
    "method": "GET",
    "path": "/adoptions/publications/{publicationId}/audit",
    "authenticated": true
  }
} as const;
