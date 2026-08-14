import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Alert } from "../core/alert.js";
import { Api } from "../core/api.js";
export class CreateRequest {
    constructor(form, birthday) {
        this.form = form;
        this.birthday = birthday;
    }
    async submit() {
        const formData = new FormData(this.form);
        formData.set("birthday", this.birthday.value());
        try {
            const response = await Nesh.Request.post(
                "https://account.ielectro.com/api/user",
                formData,
            );
            Alert.success(Api.message(response) || "Account created successfully");
            setTimeout(() => {
                window.location.href = "https://account.ielectro.com/";
            }, 2000);
        } catch (error) {
            Alert.error(Api.errorMessage(error));
        }
    }
}
