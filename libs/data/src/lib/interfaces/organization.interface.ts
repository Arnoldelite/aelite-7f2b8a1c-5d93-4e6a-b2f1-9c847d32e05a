export interface IOrganization {
  id: string;
  name: string;
  parentOrganizationId: string | null;
  createdAt: Date;
}
