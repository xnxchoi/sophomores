import type { UIFieldServerComponent } from "payload";
import { isCmsSuperAdmin } from "@/lib/auth/access";
import { OperationPanel } from "./operation-panel";
import { EventManifest } from "./event-manifest";

// Check the authenticated request, not the serialized client user (which may
// omit the staff strategy). Endpoints independently enforce the same boundary.
export const OrderOperationsField: UIFieldServerComponent = ({ req }) =>
  isCmsSuperAdmin(req.user) ? <OperationPanel kind="order" operatorID={String(req.user!.id)} /> : null;
export const AdmissionOperationsField: UIFieldServerComponent = ({ req }) =>
  isCmsSuperAdmin(req.user) ? <OperationPanel kind="admission" operatorID={String(req.user!.id)} /> : null;
export const EventManifestField: UIFieldServerComponent = ({ req }) =>
  isCmsSuperAdmin(req.user) ? <EventManifest /> : null;
