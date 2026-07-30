export type RoleKey = "coordinator" | "obtLab" | "resourceCircle";

export interface RoleDefinition {
  key: RoleKey;
  labelKey: string;
  descriptionKey: string;
}
