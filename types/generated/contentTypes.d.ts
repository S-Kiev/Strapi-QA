import type { Schema, Attribute } from '@strapi/strapi';

export interface AdminPermission extends Schema.CollectionType {
  collectionName: 'admin_permissions';
  info: {
    name: 'Permission';
    description: '';
    singularName: 'permission';
    pluralName: 'permissions';
    displayName: 'Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Attribute.JSON & Attribute.DefaultTo<{}>;
    subject: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    properties: Attribute.JSON & Attribute.DefaultTo<{}>;
    conditions: Attribute.JSON & Attribute.DefaultTo<[]>;
    role: Attribute.Relation<'admin::permission', 'manyToOne', 'admin::role'>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminUser extends Schema.CollectionType {
  collectionName: 'admin_users';
  info: {
    name: 'User';
    description: '';
    singularName: 'user';
    pluralName: 'users';
    displayName: 'User';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    firstname: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    lastname: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    username: Attribute.String;
    email: Attribute.Email &
      Attribute.Required &
      Attribute.Private &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    password: Attribute.Password &
      Attribute.Private &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    resetPasswordToken: Attribute.String & Attribute.Private;
    registrationToken: Attribute.String & Attribute.Private;
    isActive: Attribute.Boolean &
      Attribute.Private &
      Attribute.DefaultTo<false>;
    roles: Attribute.Relation<'admin::user', 'manyToMany', 'admin::role'> &
      Attribute.Private;
    blocked: Attribute.Boolean & Attribute.Private & Attribute.DefaultTo<false>;
    preferedLanguage: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'admin::user', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    updatedBy: Attribute.Relation<'admin::user', 'oneToOne', 'admin::user'> &
      Attribute.Private;
  };
}

export interface AdminRole extends Schema.CollectionType {
  collectionName: 'admin_roles';
  info: {
    name: 'Role';
    description: '';
    singularName: 'role';
    pluralName: 'roles';
    displayName: 'Role';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    code: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    description: Attribute.String;
    users: Attribute.Relation<'admin::role', 'manyToMany', 'admin::user'>;
    permissions: Attribute.Relation<
      'admin::role',
      'oneToMany',
      'admin::permission'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'admin::role', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    updatedBy: Attribute.Relation<'admin::role', 'oneToOne', 'admin::user'> &
      Attribute.Private;
  };
}

export interface AdminApiToken extends Schema.CollectionType {
  collectionName: 'strapi_api_tokens';
  info: {
    name: 'Api Token';
    singularName: 'api-token';
    pluralName: 'api-tokens';
    displayName: 'Api Token';
    description: '';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    description: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Attribute.DefaultTo<''>;
    type: Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Attribute.Required &
      Attribute.DefaultTo<'read-only'>;
    accessKey: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    lastUsedAt: Attribute.DateTime;
    permissions: Attribute.Relation<
      'admin::api-token',
      'oneToMany',
      'admin::api-token-permission'
    >;
    expiresAt: Attribute.DateTime;
    lifespan: Attribute.BigInteger;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::api-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::api-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Schema.CollectionType {
  collectionName: 'strapi_api_token_permissions';
  info: {
    name: 'API Token Permission';
    description: '';
    singularName: 'api-token-permission';
    pluralName: 'api-token-permissions';
    displayName: 'API Token Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    token: Attribute.Relation<
      'admin::api-token-permission',
      'manyToOne',
      'admin::api-token'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::api-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::api-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminTransferToken extends Schema.CollectionType {
  collectionName: 'strapi_transfer_tokens';
  info: {
    name: 'Transfer Token';
    singularName: 'transfer-token';
    pluralName: 'transfer-tokens';
    displayName: 'Transfer Token';
    description: '';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    description: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Attribute.DefaultTo<''>;
    accessKey: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    lastUsedAt: Attribute.DateTime;
    permissions: Attribute.Relation<
      'admin::transfer-token',
      'oneToMany',
      'admin::transfer-token-permission'
    >;
    expiresAt: Attribute.DateTime;
    lifespan: Attribute.BigInteger;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::transfer-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::transfer-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminTransferTokenPermission extends Schema.CollectionType {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    name: 'Transfer Token Permission';
    description: '';
    singularName: 'transfer-token-permission';
    pluralName: 'transfer-token-permissions';
    displayName: 'Transfer Token Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    token: Attribute.Relation<
      'admin::transfer-token-permission',
      'manyToOne',
      'admin::transfer-token'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::transfer-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::transfer-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUploadFile extends Schema.CollectionType {
  collectionName: 'files';
  info: {
    singularName: 'file';
    pluralName: 'files';
    displayName: 'File';
    description: '';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String & Attribute.Required;
    alternativeText: Attribute.String;
    caption: Attribute.String;
    width: Attribute.Integer;
    height: Attribute.Integer;
    formats: Attribute.JSON;
    hash: Attribute.String & Attribute.Required;
    ext: Attribute.String;
    mime: Attribute.String & Attribute.Required;
    size: Attribute.Decimal & Attribute.Required;
    url: Attribute.String & Attribute.Required;
    previewUrl: Attribute.String;
    provider: Attribute.String & Attribute.Required;
    provider_metadata: Attribute.JSON;
    related: Attribute.Relation<'plugin::upload.file', 'morphToMany'>;
    folder: Attribute.Relation<
      'plugin::upload.file',
      'manyToOne',
      'plugin::upload.folder'
    > &
      Attribute.Private;
    folderPath: Attribute.String &
      Attribute.Required &
      Attribute.Private &
      Attribute.SetMinMax<{
        min: 1;
      }>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::upload.file',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::upload.file',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUploadFolder extends Schema.CollectionType {
  collectionName: 'upload_folders';
  info: {
    singularName: 'folder';
    pluralName: 'folders';
    displayName: 'Folder';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMax<{
        min: 1;
      }>;
    pathId: Attribute.Integer & Attribute.Required & Attribute.Unique;
    parent: Attribute.Relation<
      'plugin::upload.folder',
      'manyToOne',
      'plugin::upload.folder'
    >;
    children: Attribute.Relation<
      'plugin::upload.folder',
      'oneToMany',
      'plugin::upload.folder'
    >;
    files: Attribute.Relation<
      'plugin::upload.folder',
      'oneToMany',
      'plugin::upload.file'
    >;
    path: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMax<{
        min: 1;
      }>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::upload.folder',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::upload.folder',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginI18NLocale extends Schema.CollectionType {
  collectionName: 'i18n_locale';
  info: {
    singularName: 'locale';
    pluralName: 'locales';
    collectionName: 'locales';
    displayName: 'Locale';
    description: '';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.SetMinMax<{
        min: 1;
        max: 50;
      }>;
    code: Attribute.String & Attribute.Unique;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::i18n.locale',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::i18n.locale',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission
  extends Schema.CollectionType {
  collectionName: 'up_permissions';
  info: {
    name: 'permission';
    description: '';
    singularName: 'permission';
    pluralName: 'permissions';
    displayName: 'Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String & Attribute.Required;
    role: Attribute.Relation<
      'plugin::users-permissions.permission',
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole extends Schema.CollectionType {
  collectionName: 'up_roles';
  info: {
    name: 'role';
    description: '';
    singularName: 'role';
    pluralName: 'roles';
    displayName: 'Role';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    description: Attribute.String;
    type: Attribute.String & Attribute.Unique;
    permissions: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToMany',
      'plugin::users-permissions.permission'
    >;
    users: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToMany',
      'plugin::users-permissions.user'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUsersPermissionsUser extends Schema.CollectionType {
  collectionName: 'up_users';
  info: {
    name: 'user';
    description: '';
    singularName: 'user';
    pluralName: 'users';
    displayName: 'User';
  };
  options: {
    draftAndPublish: false;
    timestamps: true;
  };
  attributes: {
    username: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    email: Attribute.Email &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    provider: Attribute.String;
    password: Attribute.Password &
      Attribute.Private &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    resetPasswordToken: Attribute.String & Attribute.Private;
    confirmationToken: Attribute.String & Attribute.Private;
    confirmed: Attribute.Boolean & Attribute.DefaultTo<false>;
    blocked: Attribute.Boolean & Attribute.DefaultTo<false>;
    role: Attribute.Relation<
      'plugin::users-permissions.user',
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCityCity extends Schema.CollectionType {
  collectionName: 'cities';
  info: {
    singularName: 'city';
    pluralName: 'cities';
    displayName: 'city';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    cityId: Attribute.UID;
    cityName: Attribute.String & Attribute.Required & Attribute.Unique;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'api::city.city', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    updatedBy: Attribute.Relation<'api::city.city', 'oneToOne', 'admin::user'> &
      Attribute.Private;
  };
}

export interface ApiConsultationConsultation extends Schema.CollectionType {
  collectionName: 'consultations';
  info: {
    singularName: 'consultation';
    pluralName: 'consultations';
    displayName: 'consultation';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    consultationId: Attribute.UID;
    customer: Attribute.Relation<
      'api::consultation.consultation',
      'oneToOne',
      'api::customer-personal-information.customer-personal-information'
    >;
    treatments: Attribute.Relation<
      'api::consultation.consultation',
      'oneToMany',
      'api::treatment.treatment'
    >;
    extraConsultingRoom: Attribute.Boolean & Attribute.DefaultTo<false>;
    responsibleUser: Attribute.Relation<
      'api::consultation.consultation',
      'oneToOne',
      'api::user-data.user-data'
    >;
    comments: Attribute.Text;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::consultation.consultation',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::consultation.consultation',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiConsultationConsultingRoomConsultationConsultingRoom
  extends Schema.CollectionType {
  collectionName: 'consultation_consulting_rooms';
  info: {
    singularName: 'consultation-consulting-room';
    pluralName: 'consultation-consulting-rooms';
    displayName: 'consultation-consultingRoom ';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    consultation: Attribute.Relation<
      'api::consultation-consulting-room.consultation-consulting-room',
      'oneToOne',
      'api::consultation.consultation'
    >;
    consultingRoom: Attribute.Relation<
      'api::consultation-consulting-room.consultation-consulting-room',
      'oneToOne',
      'api::consulting-room.consulting-room'
    >;
    since: Attribute.DateTime;
    until: Attribute.DateTime;
    notifyCustomer: Attribute.Boolean & Attribute.DefaultTo<false>;
    notifyUser: Attribute.Boolean & Attribute.DefaultTo<false>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::consultation-consulting-room.consultation-consulting-room',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::consultation-consulting-room.consultation-consulting-room',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiConsultationInformationConsultationInformation
  extends Schema.CollectionType {
  collectionName: 'consultation_informations';
  info: {
    singularName: 'consultation-information';
    pluralName: 'consultation-informations';
    displayName: 'consultationInformation';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    consultation: Attribute.Relation<
      'api::consultation-information.consultation-information',
      'oneToOne',
      'api::consultation.consultation'
    >;
    observationsConsultation: Attribute.Text;
    measures: Attribute.Boolean &
      Attribute.Required &
      Attribute.DefaultTo<false>;
    images: Attribute.Media;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::consultation-information.consultation-information',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::consultation-information.consultation-information',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiConsultingRoomConsultingRoom extends Schema.CollectionType {
  collectionName: 'consulting_rooms';
  info: {
    singularName: 'consulting-room';
    pluralName: 'consulting-rooms';
    displayName: 'consultingRoom';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    consultingRoomId: Attribute.UID;
    name: Attribute.String & Attribute.Required;
    description: Attribute.Text;
    necessaryAction: Attribute.Text;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::consulting-room.consulting-room',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::consulting-room.consulting-room',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiConsultingRoomHistoryConsultingRoomHistory
  extends Schema.CollectionType {
  collectionName: 'consulting_room_histories';
  info: {
    singularName: 'consulting-room-history';
    pluralName: 'consulting-room-histories';
    displayName: 'consultingRoomHistory';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    consultingRoomHistoryId: Attribute.UID;
    consulting_room: Attribute.Relation<
      'api::consulting-room-history.consulting-room-history',
      'oneToOne',
      'api::consulting-room.consulting-room'
    >;
    status: Attribute.Enumeration<['available', 'occupied', 'out of service']> &
      Attribute.DefaultTo<'available'>;
    since: Attribute.DateTime;
    until: Attribute.DateTime;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::consulting-room-history.consulting-room-history',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::consulting-room-history.consulting-room-history',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCustomerMedicalInformationCustomerMedicalInformation
  extends Schema.CollectionType {
  collectionName: 'customer_medical_informations';
  info: {
    singularName: 'customer-medical-information';
    pluralName: 'customer-medical-informations';
    displayName: 'customerMedicalInformation';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    customerMedicalInformationId: Attribute.UID;
    customer: Attribute.Relation<
      'api::customer-medical-information.customer-medical-information',
      'oneToOne',
      'api::customer-personal-information.customer-personal-information'
    >;
    informedConsent: Attribute.Media;
    medication: Attribute.String;
    doctor: Attribute.String;
    emergencyPhone: Attribute.String & Attribute.Required;
    suffersIllness: Attribute.String;
    columnProblem: Attribute.Boolean;
    operation: Attribute.String;
    heartProblem: Attribute.Boolean;
    cancer: Attribute.String;
    diu: Attribute.Boolean;
    metalImplants: Attribute.Boolean;
    hypertensive: Attribute.Boolean;
    varicoseVeins: Attribute.Boolean;
    coagulationProblems: Attribute.Boolean;
    comments: Attribute.Text;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::customer-medical-information.customer-medical-information',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::customer-medical-information.customer-medical-information',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCustomerPaymentCustomerPayment
  extends Schema.CollectionType {
  collectionName: 'customer_payments';
  info: {
    singularName: 'customer-payment';
    pluralName: 'customer-payments';
    displayName: 'customerPayments';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    customerPaymentId: Attribute.UID;
    consultation: Attribute.Relation<
      'api::customer-payment.customer-payment',
      'oneToOne',
      'api::consultation.consultation'
    >;
    customer: Attribute.Relation<
      'api::customer-payment.customer-payment',
      'oneToOne',
      'api::customer-personal-information.customer-personal-information'
    >;
    totalCost: Attribute.Decimal & Attribute.Required;
    paid: Attribute.Decimal;
    paymentStatus: Attribute.Enumeration<['total', 'partial', 'pending']>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::customer-payment.customer-payment',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::customer-payment.customer-payment',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCustomerPersonalInformationCustomerPersonalInformation
  extends Schema.CollectionType {
  collectionName: 'customer_personal_informations';
  info: {
    singularName: 'customer-personal-information';
    pluralName: 'customer-personal-informations';
    displayName: 'customerPersonalInformation';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    customerId: Attribute.UID;
    name: Attribute.String & Attribute.Required;
    lastname: Attribute.String & Attribute.Required;
    document: Attribute.String & Attribute.Required;
    birthdate: Attribute.DateTime;
    cellphone: Attribute.String & Attribute.Required;
    email: Attribute.Email;
    city: Attribute.Relation<
      'api::customer-personal-information.customer-personal-information',
      'oneToOne',
      'api::city.city'
    >;
    address: Attribute.String;
    howDidYouKnow: Attribute.String;
    profession: Attribute.String;
    reasonFirstVisit: Attribute.String;
    medicalInformation: Attribute.Relation<
      'api::customer-personal-information.customer-personal-information',
      'oneToOne',
      'api::customer-medical-information.customer-medical-information'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::customer-personal-information.customer-personal-information',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::customer-personal-information.customer-personal-information',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiEquipmentEquipment extends Schema.CollectionType {
  collectionName: 'equipments';
  info: {
    singularName: 'equipment';
    pluralName: 'equipments';
    displayName: 'equipment';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    equipmentId: Attribute.UID;
    name: Attribute.String & Attribute.Required;
    brand: Attribute.String & Attribute.Required;
    description: Attribute.Text;
    deactivationDate: Attribute.DateTime;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::equipment.equipment',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::equipment.equipment',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiEquipmentHistoryEquipmentHistory
  extends Schema.CollectionType {
  collectionName: 'equipment_histories';
  info: {
    singularName: 'equipment-history';
    pluralName: 'equipment-histories';
    displayName: 'equipmentHistory';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    equipmentHistoryId: Attribute.UID;
    equipment: Attribute.Relation<
      'api::equipment-history.equipment-history',
      'oneToOne',
      'api::equipment.equipment'
    >;
    status: Attribute.Enumeration<
      ['available', 'occupied', 'rented', 'broken', 'out of use']
    >;
    since: Attribute.DateTime;
    until: Attribute.DateTime;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::equipment-history.equipment-history',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::equipment-history.equipment-history',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiMeasurementsCustomerMeasurementsCustomer
  extends Schema.CollectionType {
  collectionName: 'measurements_customers';
  info: {
    singularName: 'measurements-customer';
    pluralName: 'measurements-customers';
    displayName: 'measurementsCustomer';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    measurementsCustomerId: Attribute.UID;
    consultation: Attribute.Relation<
      'api::measurements-customer.measurements-customer',
      'oneToOne',
      'api::consultation.consultation'
    >;
    customer: Attribute.Relation<
      'api::measurements-customer.measurements-customer',
      'oneToOne',
      'api::customer-personal-information.customer-personal-information'
    >;
    highWaist: Attribute.Float;
    mean: Attribute.Float;
    navelLine: Attribute.Float;
    lowerBelly: Attribute.Float;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::measurements-customer.measurements-customer',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::measurements-customer.measurements-customer',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiRecoveryCodeRecoveryCode extends Schema.CollectionType {
  collectionName: 'recovery_codes';
  info: {
    singularName: 'recovery-code';
    pluralName: 'recovery-codes';
    displayName: 'Recovery Code';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    Code: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 5;
        maxLength: 7;
      }>;
    validSince: Attribute.DateTime;
    validUntil: Attribute.DateTime;
    user_datum: Attribute.Relation<
      'api::recovery-code.recovery-code',
      'oneToOne',
      'api::user-data.user-data'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::recovery-code.recovery-code',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::recovery-code.recovery-code',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiTreatmentTreatment extends Schema.CollectionType {
  collectionName: 'treatments';
  info: {
    singularName: 'treatment';
    pluralName: 'treatments';
    displayName: 'treatment';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    treatmentId: Attribute.UID;
    name: Attribute.String & Attribute.Required;
    description: Attribute.Text;
    equipments: Attribute.Relation<
      'api::treatment.treatment',
      'oneToMany',
      'api::equipment.equipment'
    >;
    deactivationDate: Attribute.DateTime;
    consultingRooms: Attribute.Relation<
      'api::treatment.treatment',
      'oneToMany',
      'api::consulting-room.consulting-room'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::treatment.treatment',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::treatment.treatment',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiUserDataUserData extends Schema.CollectionType {
  collectionName: 'users_data';
  info: {
    singularName: 'user-data';
    pluralName: 'users-data';
    displayName: 'userData';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    userId: Attribute.UID;
    name: Attribute.String & Attribute.Required;
    lastname: Attribute.String & Attribute.Required;
    document: Attribute.String & Attribute.Required;
    cellphone: Attribute.String & Attribute.Required;
    adminUser: Attribute.Relation<
      'api::user-data.user-data',
      'oneToOne',
      'admin::user'
    >;
    city: Attribute.Relation<
      'api::user-data.user-data',
      'oneToOne',
      'api::city.city'
    >;
    address: Attribute.String & Attribute.Required;
    state: Attribute.Enumeration<['enabled', 'locked', 'low']> &
      Attribute.Required &
      Attribute.DefaultTo<'enabled'>;
    deactivationDate: Attribute.DateTime;
    activeHoursSince: Attribute.DateTime;
    activeHoursUntil: Attribute.DateTime;
    daysActiveHours: Attribute.JSON;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::user-data.user-data',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::user-data.user-data',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface ContentTypes {
      'admin::permission': AdminPermission;
      'admin::user': AdminUser;
      'admin::role': AdminRole;
      'admin::api-token': AdminApiToken;
      'admin::api-token-permission': AdminApiTokenPermission;
      'admin::transfer-token': AdminTransferToken;
      'admin::transfer-token-permission': AdminTransferTokenPermission;
      'plugin::upload.file': PluginUploadFile;
      'plugin::upload.folder': PluginUploadFolder;
      'plugin::i18n.locale': PluginI18NLocale;
      'plugin::users-permissions.permission': PluginUsersPermissionsPermission;
      'plugin::users-permissions.role': PluginUsersPermissionsRole;
      'plugin::users-permissions.user': PluginUsersPermissionsUser;
      'api::city.city': ApiCityCity;
      'api::consultation.consultation': ApiConsultationConsultation;
      'api::consultation-consulting-room.consultation-consulting-room': ApiConsultationConsultingRoomConsultationConsultingRoom;
      'api::consultation-information.consultation-information': ApiConsultationInformationConsultationInformation;
      'api::consulting-room.consulting-room': ApiConsultingRoomConsultingRoom;
      'api::consulting-room-history.consulting-room-history': ApiConsultingRoomHistoryConsultingRoomHistory;
      'api::customer-medical-information.customer-medical-information': ApiCustomerMedicalInformationCustomerMedicalInformation;
      'api::customer-payment.customer-payment': ApiCustomerPaymentCustomerPayment;
      'api::customer-personal-information.customer-personal-information': ApiCustomerPersonalInformationCustomerPersonalInformation;
      'api::equipment.equipment': ApiEquipmentEquipment;
      'api::equipment-history.equipment-history': ApiEquipmentHistoryEquipmentHistory;
      'api::measurements-customer.measurements-customer': ApiMeasurementsCustomerMeasurementsCustomer;
      'api::recovery-code.recovery-code': ApiRecoveryCodeRecoveryCode;
      'api::treatment.treatment': ApiTreatmentTreatment;
      'api::user-data.user-data': ApiUserDataUserData;
    }
  }
}
