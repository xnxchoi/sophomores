import {
  detailsSchema,
  FormSchema,
  FormValues,
  profileSchema
} from "@/components/UX/Tour/Onboard/Form/schema";
import { formOptions } from "@tanstack/react-form";

const defaultValues: FormValues = {
  step: "welcome",
  profile: {
    firstName: "",
    lastName: "",
    bio: ""
  },
  details: {
    location: "",
    link: ""
  }
};
export const defaultOptions = formOptions({
  defaultValues,
  validators: {
    onSubmit: ({ value, formApi }) => {
      switch (value.step) {
        case "profile":
          return formApi.parseValuesWithSchema(
            profileSchema as typeof FormSchema
          );
        case "details":
          return formApi.parseValuesWithSchema(
            detailsSchema as typeof FormSchema
          );
      }
    }
  }
});
