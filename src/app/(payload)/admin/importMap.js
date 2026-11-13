import { Passkeys as Passkeys_5afe2312a68aef77a0242fe42f239ed0 } from 'payload-auth/better-auth/plugin/rsc'
import { AdminInviteButton as AdminInviteButton_5a568d0e24198ca3140489e0d330f424 } from 'payload-auth/better-auth/plugin/client'
import { AdminButtons as AdminButtons_5a568d0e24198ca3140489e0d330f424 } from 'payload-auth/better-auth/plugin/client'
import { GenerateUuidButton as GenerateUuidButton_ce3a59fe00f4e2209a6e5804babc005e } from 'payload-auth/shared/payload/fields'
import { FieldCopyButton as FieldCopyButton_ce3a59fe00f4e2209a6e5804babc005e } from 'payload-auth/shared/payload/fields'
import { RecoveryReview as RecoveryReview_b17b43f03264141afcb9a2681be0134e } from '../../../payload/admin/recovery-review'
import { PriceCell as PriceCell_e27bf7b8cc50640dcdd584767b8eac3c } from '@payloadcms/plugin-ecommerce/client'
import { PriceInput as PriceInput_b91672ccd6e8b071c11142ab941fedfb } from '@payloadcms/plugin-ecommerce/rsc'
import { OrderOperationsField as OrderOperationsField_8ac96741cc946632229ad48a607a06f5 } from '@/payload/admin/commerce/fields'
import { EventManifestField as EventManifestField_8ac96741cc946632229ad48a607a06f5 } from '@/payload/admin/commerce/fields'
import { AdmissionOperationsField as AdmissionOperationsField_8ac96741cc946632229ad48a607a06f5 } from '@/payload/admin/commerce/fields'
import { LogoutButton as LogoutButton_5a568d0e24198ca3140489e0d330f424 } from 'payload-auth/better-auth/plugin/client'
import { RSCRedirect as RSCRedirect_5afe2312a68aef77a0242fe42f239ed0 } from 'payload-auth/better-auth/plugin/rsc'
import { StaffLogin as StaffLogin_7adfebec4a2e6e1e2821b83302dfea61 } from '../../../payload/admin/staff-login'
import { AdminSignup as AdminSignup_5afe2312a68aef77a0242fe42f239ed0 } from 'payload-auth/better-auth/plugin/rsc'
import { ForgotPassword as ForgotPassword_5afe2312a68aef77a0242fe42f239ed0 } from 'payload-auth/better-auth/plugin/rsc'
import { ResetPassword as ResetPassword_5afe2312a68aef77a0242fe42f239ed0 } from 'payload-auth/better-auth/plugin/rsc'
import { CollectionCards as CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1 } from '@payloadcms/next/rsc'

/** @type import('payload').ImportMap */
export const importMap = {
  "payload-auth/better-auth/plugin/rsc#Passkeys": Passkeys_5afe2312a68aef77a0242fe42f239ed0,
  "payload-auth/better-auth/plugin/client#AdminInviteButton": AdminInviteButton_5a568d0e24198ca3140489e0d330f424,
  "payload-auth/better-auth/plugin/client#AdminButtons": AdminButtons_5a568d0e24198ca3140489e0d330f424,
  "payload-auth/shared/payload/fields#GenerateUuidButton": GenerateUuidButton_ce3a59fe00f4e2209a6e5804babc005e,
  "payload-auth/shared/payload/fields#FieldCopyButton": FieldCopyButton_ce3a59fe00f4e2209a6e5804babc005e,
  "/payload/admin/recovery-review#RecoveryReview": RecoveryReview_b17b43f03264141afcb9a2681be0134e,
  "@payloadcms/plugin-ecommerce/client#PriceCell": PriceCell_e27bf7b8cc50640dcdd584767b8eac3c,
  "@payloadcms/plugin-ecommerce/rsc#PriceInput": PriceInput_b91672ccd6e8b071c11142ab941fedfb,
  "@/payload/admin/commerce/fields#OrderOperationsField": OrderOperationsField_8ac96741cc946632229ad48a607a06f5,
  "@/payload/admin/commerce/fields#EventManifestField": EventManifestField_8ac96741cc946632229ad48a607a06f5,
  "@/payload/admin/commerce/fields#AdmissionOperationsField": AdmissionOperationsField_8ac96741cc946632229ad48a607a06f5,
  "payload-auth/better-auth/plugin/client#LogoutButton": LogoutButton_5a568d0e24198ca3140489e0d330f424,
  "payload-auth/better-auth/plugin/rsc#RSCRedirect": RSCRedirect_5afe2312a68aef77a0242fe42f239ed0,
  "/payload/admin/staff-login#StaffLogin": StaffLogin_7adfebec4a2e6e1e2821b83302dfea61,
  "payload-auth/better-auth/plugin/rsc#AdminSignup": AdminSignup_5afe2312a68aef77a0242fe42f239ed0,
  "payload-auth/better-auth/plugin/rsc#ForgotPassword": ForgotPassword_5afe2312a68aef77a0242fe42f239ed0,
  "payload-auth/better-auth/plugin/rsc#ResetPassword": ResetPassword_5afe2312a68aef77a0242fe42f239ed0,
  "@payloadcms/next/rsc#CollectionCards": CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1
}
